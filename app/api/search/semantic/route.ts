import { NextRequest, NextResponse } from 'next/server';
import { read } from '@/lib/neo4j';
import { pipeline } from '@xenova/transformers';

let embedder: any = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedder;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embedderInstance = await getEmbedder();
    const queryEmbeddingOutput = await embedderInstance(query, {
      pooling: 'mean',
      normalize: true,
    });
    const queryEmbedding = Array.from(queryEmbeddingOutput.data) as number[];

    // Fetch all tweets with embeddings from Neo4j, including user info
    const tweets = await read(`
      MATCH (u:User)-[:POSTS]->(t:Tweet)
      WHERE t.embedding IS NOT NULL
      RETURN t.id_str as id, t.text as text, t.favorites as favoriteCount,
             t.created_at as createdAt, t.embedding as embedding,
             u.screen_name as user
      LIMIT 2500
    `);

    // Convert Neo4j Integer to regular number
    const convertNeo4jInt = (value: any): number => {
      if (
        value &&
        typeof value === 'object' &&
        'low' in value &&
        'high' in value
      ) {
        return value.high * 4294967296 + value.low;
      }
      return value || 0;
    };

    // Calculate similarity scores
    const results = tweets.map((tweet: any) => {
      const similarity = cosineSimilarity(queryEmbedding, tweet.embedding);
      return {
        id: tweet.id,
        text: tweet.text,
        favoriteCount: convertNeo4jInt(tweet.favoriteCount),
        createdAt: tweet.createdAt,
        user: tweet.user || 'Unknown',
        similarity: similarity,
      };
    });

    // Sort by similarity (highest first) and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, limit);

    return NextResponse.json({
      query,
      results: topResults,
      total: topResults.length,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
