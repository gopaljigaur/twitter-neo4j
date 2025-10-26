import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { read } from '@/lib/neo4j';
import {
  SearchResponse,
  UserSearchResult,
  HashtagSearchResult,
  TweetSearchResult,
} from '@/types';

// Convert Neo4j Integer to JS number
function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'object' && ('low' in value || 'high' in value)) {
    return neo4j.int(value).toNumber();
  }

  return Number(value) || 0;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<SearchResponse | { error: string; details?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const mode = searchParams.get('mode') || 'suggestions'; // 'suggestions' or 'full'
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const params = { query: `(?i).*${query}.*` };
    let allResults: (
      | UserSearchResult
      | HashtagSearchResult
      | TweetSearchResult
    )[] = [];

    // For autocomplete suggestions, only return users and hashtags (no tweets)
    if (mode === 'suggestions') {
      if (type === 'all' || type === 'user') {
        const userQuery = `
          MATCH (u:User)
          WHERE u.screen_name =~ $query OR u.name =~ $query
          RETURN 'user' as type, u.screen_name as screenName, u.name as name,
                 u.followers as followers
          ORDER BY u.followers DESC
          LIMIT 5
        `;
        const userResult = await read(userQuery, params);
        const users: UserSearchResult[] = userResult.map((item: any) => ({
          screenName: item.screenName,
          name: item.name,
          followers: toNumber(item.followers),
        }));
        allResults.push(...users);
      }

      if (type === 'all' || type === 'hashtag') {
        const hashtagQuery = `
          MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
          WHERE h.name =~ $query
          WITH h.name as name, count(t) as usage
          RETURN 'hashtag' as type, name, usage
          ORDER BY usage DESC
          LIMIT 5
        `;
        const hashtagResult = await read(hashtagQuery, params);
        const hashtags: HashtagSearchResult[] = hashtagResult.map(
          (item: any) => ({
            name: item.name,
            usage: toNumber(item.usage),
          })
        );
        allResults.push(...hashtags);
      }

      return NextResponse.json({ results: allResults });
    }

    // For full search results with pagination
    let totalCount = 0;

    if (type === 'all') {
      // Use UNION query to mix all types and sort by relevancy
      // Always get total count for pagination to work correctly
      const countQuery = `
        CALL {
          MATCH (u:User)
          WHERE u.screen_name =~ $query OR u.name =~ $query
          RETURN count(u) as count
          UNION
          MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
          WHERE h.name =~ $query
          RETURN count(DISTINCT h) as count
          UNION
          MATCH (t:Tweet)
          WHERE toLower(t.text) CONTAINS toLower($plainQuery)
          RETURN count(t) as count
        }
        RETURN sum(count) as total
      `;
      const countResult = await read(countQuery, {
        ...params,
        plainQuery: query,
      });
      totalCount = toNumber(countResult[0]?.total || 0);

      // Mixed query with relevancy scoring
      const mixedQuery = `
        CALL {
          MATCH (u:User)
          WHERE u.screen_name =~ $query OR u.name =~ $query
          RETURN 'user' as type, u.screen_name as id, u.name as name,
                 toFloat(COALESCE(u.followers, 0)) as score,
                 null as usage, null as text, null as favoriteCount, null as user
          UNION
          MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
          WHERE h.name =~ $query
          WITH h.name as hashtagName, count(t) as usage
          RETURN 'hashtag' as type, hashtagName as id, hashtagName as name,
                 toFloat(usage) as score,
                 usage, null as text, null as favoriteCount, null as user
          UNION
          MATCH (t:Tweet)<-[:POSTS]-(u:User)
          WHERE toLower(t.text) CONTAINS toLower($plainQuery)
          RETURN 'tweet' as type, t.id as id, null as name,
                 toFloat(COALESCE(t.favorites, 0)) as score,
                 null as usage, t.text as text, t.favorites as favoriteCount, u.screen_name as user
        }
        RETURN type, id, name, score, usage, text, favoriteCount, user
        ORDER BY score DESC
        SKIP ${offset}
        LIMIT ${limit}
      `;
      const mixedResult = await read(mixedQuery, {
        ...params,
        plainQuery: query,
      });

      allResults = mixedResult.map((item: any) => {
        if (item.type === 'user') {
          return {
            screenName: item.id,
            name: item.name,
            followers: toNumber(item.score),
          } as UserSearchResult;
        } else if (item.type === 'hashtag') {
          return {
            name: item.name,
            usage: toNumber(item.usage),
          } as HashtagSearchResult;
        } else {
          return {
            id: item.id,
            text: item.text,
            favoriteCount: toNumber(item.favoriteCount),
            user: item.user,
          } as TweetSearchResult;
        }
      });
    } else if (type === 'user') {
      if (offset === 0) {
        const countQuery = `
          MATCH (u:User)
          WHERE u.screen_name =~ $query OR u.name =~ $query
          RETURN count(u) as total
        `;
        const countResult = await read(countQuery, params);
        totalCount = toNumber(countResult[0]?.total || 0);
      }

      const userQuery = `
        MATCH (u:User)
        WHERE u.screen_name =~ $query OR u.name =~ $query
        RETURN 'user' as type, u.screen_name as screenName, u.name as name,
               u.followers as followers
        ORDER BY u.followers DESC
        SKIP ${offset}
        LIMIT ${limit}
      `;
      const userResult = await read(userQuery, params);
      const users: UserSearchResult[] = userResult.map((item: any) => ({
        screenName: item.screenName,
        name: item.name,
        followers: toNumber(item.followers),
      }));
      allResults.push(...users);
    } else if (type === 'hashtag') {
      if (offset === 0) {
        const countQuery = `
          MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
          WHERE h.name =~ $query
          RETURN count(DISTINCT h) as total
        `;
        const countResult = await read(countQuery, params);
        totalCount = toNumber(countResult[0]?.total || 0);
      }

      const hashtagQuery = `
        MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
        WHERE h.name =~ $query
        WITH h.name as name, count(t) as usage
        RETURN 'hashtag' as type, name, usage
        ORDER BY usage DESC
        SKIP ${offset}
        LIMIT ${limit}
      `;
      const hashtagResult = await read(hashtagQuery, params);
      const hashtags: HashtagSearchResult[] = hashtagResult.map(
        (item: any) => ({
          name: item.name,
          usage: toNumber(item.usage),
        })
      );
      allResults.push(...hashtags);
    } else if (type === 'tweet') {
      if (offset === 0) {
        const countQuery = `
          MATCH (t:Tweet)
          WHERE toLower(t.text) CONTAINS toLower($plainQuery)
          RETURN count(t) as total
        `;
        const countResult = await read(countQuery, {
          ...params,
          plainQuery: query,
        });
        totalCount = toNumber(countResult[0]?.total || 0);
      }

      const tweetQuery = `
        MATCH (t:Tweet)<-[:POSTS]-(u:User)
        WHERE toLower(t.text) CONTAINS toLower($plainQuery)
        RETURN 'tweet' as type, t.id as id, t.text as text,
               t.favorites as favoriteCount, u.screen_name as user
        ORDER BY t.favorites DESC
        SKIP ${offset}
        LIMIT ${limit}
      `;
      const tweetResult = await read(tweetQuery, {
        ...params,
        plainQuery: query,
      });
      const tweets: TweetSearchResult[] = tweetResult.map((item: any) => ({
        id: item.id,
        text: item.text,
        favoriteCount: toNumber(item.favoriteCount),
        user: item.user,
      }));
      allResults.push(...tweets);
    }

    return NextResponse.json({
      results: allResults,
      total: totalCount > 0 ? totalCount : undefined,
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      {
        error: 'Search failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
