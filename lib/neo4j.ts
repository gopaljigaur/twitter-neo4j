import neo4j, { Driver, Session, QueryResult } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';

    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
      maxConnectionPoolSize: 50,
      maxConnectionLifetime: 30 * 60 * 1000, // 30 minutes
      connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
      // Keep disableLosslessIntegers false to preserve large integers (like Twitter IDs)
      // as Neo4j Integer objects that can be properly converted to strings
    });
  }
  return driver;
}

export async function read(
  cypher: string,
  params: Record<string, any> = {}
): Promise<any[]> {
  const session: Session = getDriver().session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.READ,
  });

  try {
    const result: QueryResult = await session.executeRead((tx) =>
      tx.run(cypher, params)
    );
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
}

export async function write(
  cypher: string,
  params: Record<string, any> = {}
): Promise<any[]> {
  const session: Session = getDriver().session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
    defaultAccessMode: neo4j.session.WRITE,
  });

  try {
    const result: QueryResult = await session.executeWrite((tx) =>
      tx.run(cypher, params)
    );
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
