import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();

  try {
    // Check Neo4j connection
    const driver = getDriver();
    const session = driver.session();

    try {
      // Verify database is accessible
      await session.run('RETURN 1 as health');

      // Check if embeddings exist - critical for semantic search functionality
      const embeddingsCheck = await session.run(
        'MATCH (t:Tweet) WHERE t.embedding IS NOT NULL RETURN count(t) as count LIMIT 1'
      );
      const embeddingsCount = embeddingsCheck.records[0]?.get('count').toNumber() || 0;

      const responseTime = Date.now() - startTime;

      // Only report healthy if embeddings are ready
      if (embeddingsCount > 0) {
        return NextResponse.json(
          {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
              api: 'up',
              database: 'up',
              embeddings: 'ready',
            },
            embeddingsCount,
            responseTime: `${responseTime}ms`,
          },
          { status: 200 }
        );
      } else {
        // Database is up but embeddings not ready yet
        return NextResponse.json(
          {
            status: 'starting',
            timestamp: new Date().toISOString(),
            services: {
              api: 'up',
              database: 'up',
              embeddings: 'generating',
            },
            message: 'Application is starting. Generating embeddings for semantic search...',
            responseTime: `${responseTime}ms`,
          },
          { status: 503 } // Service unavailable until embeddings are ready
        );
      }
    } finally {
      await session.close();
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          api: 'up',
          database: 'down',
        },
        error: error.message,
        responseTime: `${responseTime}ms`,
      },
      { status: 503 }
    );
  }
}
