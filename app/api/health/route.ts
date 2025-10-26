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
      // Simple query to verify database is accessible
      await session.run('RETURN 1 as health');

      const responseTime = Date.now() - startTime;

      return NextResponse.json(
        {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            api: 'up',
            database: 'up',
          },
          responseTime: `${responseTime}ms`,
        },
        { status: 200 }
      );
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
