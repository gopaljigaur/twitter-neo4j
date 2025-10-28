import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { read } from '@/lib/neo4j';

// Convert Neo4j Integer to JS number
function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === 'object' && ('low' in value || 'high' in value)) {
    return neo4j.int(value).toNumber();
  }

  return Number(value) || 0;
}

// Convert Neo4j Integer to JS number or string
function toJsValue(value: any, asString = false): any {
  if (value === null || value === undefined) return value;

  if (typeof value === 'object' && ('low' in value || 'high' in value)) {
    const intValue = neo4j.int(value);
    return asString ? intValue.toString() : intValue.toNumber();
  }

  return value;
}

// Convert Neo4j DateTime to ISO string
function toDateString(dateObj: any): string {
  if (!dateObj || typeof dateObj !== 'object') return '';

  try {
    if (dateObj.year) {
      const date = new Date(
        toNumber(dateObj.year),
        toNumber(dateObj.month) - 1,
        toNumber(dateObj.day),
        toNumber(dateObj.hour) || 0,
        toNumber(dateObj.minute) || 0,
        toNumber(dateObj.second) || 0
      );
      return date.toISOString();
    }
  } catch {
    return '';
  }

  return '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse> {
  try {
    const { name } = await params;
    const lowerName = name.toLowerCase();

    const query = `
      MATCH (h:Hashtag)
      WHERE toLower(h.name) = $lowerName
      OPTIONAL MATCH (t:Tweet)-[:TAGS]->(h)
      OPTIONAL MATCH (u:User)-[:POSTS]->(t)
      WITH h, t, u
      ORDER BY t.created_at DESC
      WITH h,
           collect(DISTINCT {
             id: t.id,
             text: t.text,
             favorites: t.favorites,
             createdAt: t.created_at,
             user: u.screen_name,
             userName: u.name
           })[0..10] as recentTweets,
           count(DISTINCT t) as totalTweets,
           count(DISTINCT u) as totalUsers

      // Get related hashtags (hashtags used in same tweets)
      OPTIONAL MATCH (t:Tweet)-[:TAGS]->(h)
      OPTIONAL MATCH (t)-[:TAGS]->(related:Hashtag)
      WHERE toLower(related.name) <> $lowerName
      WITH h, recentTweets, totalTweets, totalUsers,
           related.name as relatedName, count(t) as coOccurrence
      ORDER BY coOccurrence DESC

      RETURN {
        name: h.name,
        totalTweets: totalTweets,
        totalUsers: totalUsers,
        recentTweets: recentTweets,
        relatedHashtags: collect({name: relatedName, count: coOccurrence})[0..5]
      } as hashtag
    `;

    const result = await read(query, { lowerName });

    if (result.length === 0) {
      return NextResponse.json({ error: 'Hashtag not found' }, { status: 404 });
    }

    const hashtag = result[0].hashtag;

    const response = {
      name: hashtag.name,
      totalTweets: toNumber(hashtag.totalTweets),
      totalUsers: toNumber(hashtag.totalUsers),
      recentTweets: hashtag.recentTweets
        ? hashtag.recentTweets
            .filter((t: any) => t.text !== null)
            .map((t: any) => ({
              id: toJsValue(t.id, true),
              text: t.text,
              favoriteCount: toNumber(t.favorites),
              createdAt: toDateString(t.createdAt),
              user: t.user,
              userName: t.userName,
            }))
        : [],
      relatedHashtags: hashtag.relatedHashtags
        ? hashtag.relatedHashtags
            .filter((h: any) => h.name !== null)
            .map((h: any) => ({
              name: h.name,
              count: toNumber(h.count),
            }))
        : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Hashtag API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch hashtag details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
