import { NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { read } from '@/lib/neo4j';
import { Stats } from '@/types';

// Helper function to convert Neo4j Integer to JavaScript number
function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;

  // Handle Neo4j Integer objects
  if (typeof value === 'object' && ('low' in value || 'high' in value)) {
    return neo4j.int(value).toNumber();
  }

  return Number(value) || 0;
}

export async function GET(): Promise<
  NextResponse<Stats | { error: string; details?: string }>
> {
  try {
    const query = `
      MATCH (u:User) WITH count(u) as totalUsers
      MATCH (t:Tweet) WITH totalUsers, count(t) as totalTweets
      MATCH (h:Hashtag) WITH totalUsers, totalTweets, count(h) as totalHashtags
      MATCH (u:User)-[:POSTS]->(t:Tweet)
      WITH totalUsers, totalTweets, totalHashtags, u.screen_name as screenName, count(t) as tweetCount
      ORDER BY tweetCount DESC LIMIT 5
      WITH totalUsers, totalTweets, totalHashtags, collect({screenName: screenName, count: tweetCount}) as topUsers
      MATCH (h:Hashtag)<-[:TAGS]-(t:Tweet)
      WITH totalUsers, totalTweets, totalHashtags, topUsers, h.name as hashtagName, count(t) as hashtagCount
      ORDER BY hashtagCount DESC LIMIT 5
      RETURN {
        totalUsers: totalUsers,
        totalTweets: totalTweets,
        totalHashtags: totalHashtags,
        topUsers: topUsers,
        topHashtags: collect({name: hashtagName, count: hashtagCount})
      } as stats
    `;

    const result = await read(query);

    if (result.length === 0) {
      return NextResponse.json({
        totalUsers: 0,
        totalTweets: 0,
        totalHashtags: 0,
        topUsers: [],
        topHashtags: [],
      });
    }

    const stats = result[0].stats;

    // Convert Neo4j Integers to JavaScript numbers
    const convertedStats: Stats = {
      totalUsers: toNumber(stats.totalUsers),
      totalTweets: toNumber(stats.totalTweets),
      totalHashtags: toNumber(stats.totalHashtags),
      topUsers: stats.topUsers.map((user: any) => ({
        screenName: user.screenName,
        count: toNumber(user.count),
      })),
      topHashtags: stats.topHashtags.map((hashtag: any) => ({
        name: hashtag.name,
        count: toNumber(hashtag.count),
      })),
    };

    return NextResponse.json(convertedStats);
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
