import { write, closeDriver } from '@/lib/neo4j';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables - try .env.local first (dev), then .env (docker), then use existing env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
// If neither file exists, just use environment variables (already set in Docker)

async function main() {
  console.log('Creating vector index for Tweet embeddings...\n');

  try {
    // Drop existing index if it exists
    console.log('Checking for existing vector index...');
    try {
      await write('DROP INDEX tweet_embeddings IF EXISTS');
      console.log('✓ Dropped existing index\n');
    } catch (error) {
      console.log('No existing index found\n');
    }

    // Create vector index
    // The model "Xenova/all-MiniLM-L6-v2" produces 384-dimensional embeddings
    console.log('Creating new vector index...');
    await write(`
      CREATE VECTOR INDEX tweet_embeddings IF NOT EXISTS
      FOR (t:Tweet)
      ON t.embedding
      OPTIONS {
        indexConfig: {
          \`vector.dimensions\`: 384,
          \`vector.similarity_function\`: 'cosine'
        }
      }
    `);

    console.log('✓ Vector index created successfully!\n');

    // Wait a moment for the index to populate
    console.log('Waiting for index to populate...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check index status
    const status = await write('SHOW VECTOR INDEXES');
    console.log('Index status:', JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('Error creating vector index:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

main();
