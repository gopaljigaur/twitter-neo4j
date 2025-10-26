import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { read } from '@/lib/neo4j';
import { GraphData, GraphNode, GraphLink } from '@/types';

interface Neo4jNode {
  properties: {
    screen_name?: string;
    id?: any;
    name?: string;
    text?: string;
    followers?: any;
    favorites?: any;
    created_at?: string;
  };
}

// Helper function to convert Neo4j Integer to JavaScript number or string
function toJsValue(value: any, asString = false): any {
  if (value === null || value === undefined) return value;

  // Handle Neo4j Integer objects
  if (typeof value === 'object' && ('low' in value || 'high' in value)) {
    const intValue = neo4j.int(value);
    return asString ? intValue.toString() : intValue.toNumber();
  }

  return value;
}

// Helper function to convert Neo4j DateTime to ISO string
function toDateString(dateObj: any): string {
  if (!dateObj || typeof dateObj !== 'object') return '';

  try {
    // Handle Neo4j DateTime object format
    if (dateObj.year) {
      const date = new Date(
        toJsValue(dateObj.year),
        toJsValue(dateObj.month) - 1, // JS months are 0-indexed
        toJsValue(dateObj.day),
        toJsValue(dateObj.hour) || 0,
        toJsValue(dateObj.minute) || 0,
        toJsValue(dateObj.second) || 0
      );
      return date.toISOString();
    }
  } catch {
    return '';
  }

  return '';
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<GraphData | { error: string; details?: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const minFollowers = parseInt(searchParams.get('minFollowers') || '0');
    const maxFollowers = parseInt(
      searchParams.get('maxFollowers') || '1000000'
    );
    const minActivity = parseInt(searchParams.get('minActivity') || '1');
    const minHashtagFrequency = parseInt(
      searchParams.get('minHashtagFrequency') || '1'
    );
    const users = searchParams.getAll('users').filter(u => u.trim());
    const hashtags = searchParams.getAll('hashtags').filter(h => h.trim());
    const keywords = searchParams.getAll('keywords').filter(k => k.trim());

    console.log('VC Filter params:', {
      limit,
      minFollowers,
      maxFollowers,
      minActivity,
      minHashtagFrequency,
      users,
      hashtags,
      keywords,
    });

    // Build query: Filter users FIRST for VC analysis
    let query = `
      MATCH (u:User)
      WHERE u.followers >= $minFollowers
        AND u.followers <= $maxFollowers
        AND u.following IS NOT NULL
    `;

    // Add user filter if provided (filter by specific users)
    if (users.length > 0) {
      query += `
        AND u.screen_name IN $users
      `;
    }

    query += `
      WITH u
      MATCH (u)-[:POSTS]->(t:Tweet)
      WITH u, count(t) as tweetCount, collect(t) as userTweets
      WHERE tweetCount >= $minActivity
      UNWIND userTweets as t
      WITH u, t
    `;

    // Add keyword search if provided (match ANY keyword in tweet text)
    if (keywords.length > 0) {
      const keywordConditions = keywords
        .map((_, idx) => `toLower(t.text) CONTAINS toLower($keyword${idx})`)
        .join(' OR ');
      query += `
        WHERE ${keywordConditions}
      `;
    }

    // Add hashtag filter if provided (match ANY hashtag)
    if (hashtags.length > 0) {
      query += `
        ${keywords.length > 0 ? 'AND' : 'WHERE'} EXISTS {
          MATCH (t)-[:TAGS]->(h:Hashtag)
          WHERE h.name IN $hashtags
        }
      `;
    }

    query += `
      WITH DISTINCT u, t
      ORDER BY rand()
      LIMIT $limit
      OPTIONAL MATCH (t)-[:TAGS]->(h:Hashtag)
      WITH u, t, h
      OPTIONAL MATCH (h)<-[:TAGS]-(allTweets:Tweet)
      WITH u, t, h, count(DISTINCT allTweets) as hashtagFrequency
      WHERE h IS NULL OR hashtagFrequency >= $minHashtagFrequency
      WITH u, t, collect(DISTINCT {hashtag: h, frequency: hashtagFrequency}) as hashtagData
      OPTIONAL MATCH (t)-[:MENTIONS]->(m:User)
      WITH u, t, hashtagData, collect(DISTINCT m) as mentions
      RETURN u, t,
             [hd IN hashtagData WHERE hd.hashtag IS NOT NULL | hd.hashtag] as hashtags,
             mentions
    `;

    // Build parameters object with individual keyword parameters
    const params: any = {
      limit: neo4j.int(limit),
      minFollowers: neo4j.int(minFollowers),
      maxFollowers: neo4j.int(maxFollowers),
      minActivity: neo4j.int(minActivity),
      minHashtagFrequency: neo4j.int(minHashtagFrequency),
      users, // Pass users array directly
      hashtags, // Pass hashtags array directly
    };

    // Add individual keyword parameters
    keywords.forEach((keyword, idx) => {
      params[`keyword${idx}`] = keyword;
    });

    const result = await read(query, params);

    console.log(`Query returned ${result.length} results`);

    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    result.forEach((record: any) => {
      const user: Neo4jNode = record.u;
      const tweet: Neo4jNode = record.t;
      const hashtags: Neo4jNode[] = record.hashtags || [];
      const mentions: Neo4jNode[] = record.mentions || [];

      // Add user node
      const userId = `user-${user.properties.screen_name}`;
      if (!nodes.has(userId)) {
        nodes.set(userId, {
          id: userId,
          label: user.properties.screen_name || '',
          type: 'user',
          followersCount: toJsValue(user.properties.followers) || 0,
          name: user.properties.name || user.properties.screen_name || '',
        });
      }

      // Add tweet node
      const tweetId = `tweet-${toJsValue(tweet.properties.id, true)}`;
      if (!nodes.has(tweetId)) {
        nodes.set(tweetId, {
          id: tweetId,
          label: tweet.properties.text?.substring(0, 30) + '...' || 'Tweet',
          type: 'tweet',
          text: tweet.properties.text || '',
          favoriteCount: toJsValue(tweet.properties.favorites) || 0,
          createdAt: toDateString(tweet.properties.created_at),
        });
      }

      // User posts tweet link
      links.push({
        source: userId,
        target: tweetId,
        type: 'posts',
      });

      // Add hashtag nodes and links
      hashtags.forEach((h: Neo4jNode) => {
        if (h && h.properties) {
          const hashtagId = `hashtag-${h.properties.name}`;
          if (!nodes.has(hashtagId)) {
            nodes.set(hashtagId, {
              id: hashtagId,
              label: `#${h.properties.name}`,
              type: 'hashtag',
              name: h.properties.name,
            });
          }
          links.push({
            source: tweetId,
            target: hashtagId,
            type: 'tags',
          });
        }
      });

      // Add mention links (apply same VC filters as main users)
      mentions.forEach((m: Neo4jNode) => {
        if (m && m.properties) {
          const mentionFollowers = toJsValue(m.properties.followers) || 0;

          // Apply VC filters - skip mentions that don't meet criteria
          if (
            mentionFollowers < minFollowers ||
            mentionFollowers > maxFollowers
          ) {
            console.log(
              `Skipping mention ${m.properties.screen_name} with ${mentionFollowers} followers (range: ${minFollowers}-${maxFollowers})`
            );
            return; // Skip this mention entirely
          }

          const mentionId = `user-${m.properties.screen_name}`;

          // Only add node and link if user passes filters
          if (!nodes.has(mentionId)) {
            nodes.set(mentionId, {
              id: mentionId,
              label: m.properties.screen_name || '',
              type: 'user',
              followersCount: mentionFollowers,
              name: m.properties.name || m.properties.screen_name || '',
            });
          }

          links.push({
            source: tweetId,
            target: mentionId,
            type: 'mentions',
          });
        }
      });
    });

    const userNodes = Array.from(nodes.values()).filter(
      (n) => n.type === 'user'
    );
    const tweetNodes = Array.from(nodes.values()).filter(
      (n) => n.type === 'tweet'
    );
    const hashtagNodes = Array.from(nodes.values()).filter(
      (n) => n.type === 'hashtag'
    );

    console.log(
      `VC Analysis Result: ${userNodes.length} users, ${tweetNodes.length} tweets, ${hashtagNodes.length} hashtags, ${links.length} links`
    );
    if (userNodes.length > 0) {
      const followerCounts = userNodes
        .map((u) => u.followersCount || 0)
        .sort((a, b) => a - b);
      console.log(
        `User follower range: ${followerCounts[0]} - ${followerCounts[followerCounts.length - 1]}`
      );
    }

    return NextResponse.json({
      nodes: Array.from(nodes.values()),
      links: links,
    });
  } catch (error) {
    console.error('Network API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch network data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
