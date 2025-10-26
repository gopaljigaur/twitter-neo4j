import { read, write, closeDriver } from '@/lib/neo4j';
import dotenv from 'dotenv';
import path from 'path';
import { pipeline } from '@xenova/transformers';
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

const BATCH_SIZE = 50; // Process 50 tweets at a time (local embeddings are fast)
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'; // 384-dimensional embeddings

interface Tweet {
  id: string;
  text: string;
}

let embedder: any = null;

async function initializeEmbedder() {
  console.log(
    'Loading embedding model (this may take a moment on first run)...'
  );
  embedder = await pipeline('feature-extraction', MODEL_NAME);
  console.log('✓ Model loaded successfully\n');
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!embedder) {
    await initializeEmbedder();
  }

  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }

  return embeddings;
}

async function main() {
  console.log('Starting embedding generation process...\n');

  try {
    // Fetch all tweets that don't have embeddings
    console.log('Fetching tweets from Neo4j...');
    const allTweets = (await read(`
      MATCH (t:Tweet)
      WHERE t.embedding IS NULL AND t.text IS NOT NULL AND t.text <> ''
      RETURN t.id_str as id, t.text as text
      LIMIT 2500
    `)) as Tweet[];

    // Filter out any tweets with empty or null text
    const tweets = allTweets.filter((t) => t.text && t.text.trim().length > 0);

    console.log(`Found ${tweets.length} tweets without embeddings\n`);

    if (tweets.length === 0) {
      console.log('All tweets already have embeddings!');
      return;
    }

    // Process in batches
    let processed = 0;
    const totalBatches = Math.ceil(tweets.length / BATCH_SIZE);

    for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
      const batch = tweets.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

      console.log(
        `Processing batch ${batchNumber}/${totalBatches} (${batch.length} tweets)...`
      );

      try {
        // Generate embeddings for this batch
        const texts = batch.map((t) => t.text || '');
        const embeddings = await generateEmbeddings(texts);

        // Update Neo4j with embeddings
        for (let j = 0; j < batch.length; j++) {
          const tweet = batch[j];
          const embedding = embeddings[j];

          await write(
            `
            MATCH (t:Tweet)
            WHERE t.id_str = $id
            SET t.embedding = $embedding
          `,
            {
              id: tweet.id,
              embedding: embedding,
            }
          );

          processed++;
        }

        console.log(
          `✓ Batch ${batchNumber}/${totalBatches} complete. Total processed: ${processed}/${tweets.length}\n`
        );
      } catch (error) {
        console.error(`✗ Error processing batch ${batchNumber}:`, error);
        console.log('Continuing with next batch...\n');
      }
    }

    console.log(
      `\n✓ Embedding generation complete! Processed ${processed} tweets.`
    );
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

main();
