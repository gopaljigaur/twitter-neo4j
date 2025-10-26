#!/bin/sh
set -e

# This script runs at container startup (not during Docker build)
# Why? Embeddings generation REQUIRES a running Neo4j database,
# which doesn't exist during the Docker build phase.
# This is why we can't move this logic into the Dockerfile.

echo "========================================"
echo "Twitter Neo4j Dashboard - Initialization"
echo "========================================"

# Wait for Neo4j to be ready
echo "Waiting for Neo4j to be ready..."
until wget --spider -q http://neo4j:7474 2>/dev/null; do
  echo "Neo4j is unavailable - sleeping"
  sleep 2
done
echo "Neo4j is ready!"

# Check if embeddings exist
echo "Checking if embeddings exist..."
EMBEDDINGS_EXIST=$(wget -qO- --post-data='{"statements":[{"statement":"MATCH (t:Tweet) WHERE t.embedding IS NOT NULL RETURN count(t) as count LIMIT 1"}]}' \
  --header='Content-Type: application/json' \
  --header='Authorization: Basic bmVvNGo6cGFzc3dvcmQxMjM=' \
  http://neo4j:7474/db/neo4j/tx/commit | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ "$EMBEDDINGS_EXIST" != "0" ]; then
  echo "Embeddings already exist (${EMBEDDINGS_EXIST} tweets with embeddings). Skipping generation."
else
  echo "Generating embeddings for semantic search..."
  cd /app
  npx tsx scripts/generate-embeddings.ts
  echo "Embeddings generated successfully!"
fi

echo "========================================"
echo "Starting application..."
echo "========================================"

# Start the Next.js app
exec node server.js
