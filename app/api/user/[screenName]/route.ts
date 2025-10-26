import { NextRequest, NextResponse } from 'next/server';
import neo4j from 'neo4j-driver';
import { read } from '@/lib/neo4j';
import { User } from '@/types';

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
        toJsValue(dateObj.year),
        toJsValue(dateObj.month) - 1,
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
  request: NextRequest,
  { params }: { params: Promise<{ screenName: string }> }
): Promise<NextResponse<User | { error: string; details?: string }>> {
  try {
    const { screenName } = await params;

    const query = `
      MATCH (u:User {screen_name: $screenName})
      OPTIONAL MATCH (u)-[:POSTS]->(t:Tweet)
      OPTIONAL MATCH (t)-[:TAGS]->(h:Hashtag)
      WITH u, t, collect(DISTINCT h.name) as hashtags
      ORDER BY t.created_at DESC
      WITH u, collect({
        id: t.id,
        text: t.text,
        favoriteCount: t.favorites,
        createdAt: t.created_at,
        hashtags: hashtags
      })[0..10] as recentTweets
      OPTIONAL MATCH (u)-[:POSTS]->(allTweets:Tweet)
      WITH u, recentTweets, count(allTweets) as tweetCount
      OPTIONAL MATCH (u)-[:POSTS]->(:Tweet)-[:TAGS]->(h:Hashtag)
      WITH u, recentTweets, tweetCount,
           h.name as hashtagName, count(h) as hashtagCount
      ORDER BY hashtagCount DESC
      RETURN {
        screenName: u.screen_name,
        name: u.name,
        followersCount: u.followers,
        followingCount: u.following,
        tweetCount: tweetCount,
        profileImageUrl: u.profile_image_url,
        recentTweets: recentTweets,
        topHashtags: collect({name: hashtagName, count: hashtagCount})[0..5]
      } as user
    `;

    const result = await read(query, { screenName });

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result[0].user;

    const convertedUser: User = {
      screenName: user.screenName,
      name: user.name,
      followersCount: toNumber(user.followersCount),
      followingCount: toNumber(user.followingCount),
      tweetCount: toNumber(user.tweetCount),
      profileImageUrl: user.profileImageUrl,
      recentTweets: user.recentTweets
        ? user.recentTweets
            .filter((t: any) => t.text !== null)
            .map((t: any) => ({
              id: toJsValue(t.id, true),
              text: t.text,
              favoriteCount: toNumber(t.favoriteCount),
              createdAt: toDateString(t.createdAt),
              hashtags: t.hashtags,
            }))
        : [],
      topHashtags: user.topHashtags
        ? user.topHashtags
            .filter((h: any) => h.name !== null)
            .map((h: any) => ({
              name: h.name,
              count: toNumber(h.count),
            }))
        : [],
    };

    return NextResponse.json(convertedUser);
  } catch (error) {
    console.error('User API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch user details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
