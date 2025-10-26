#!/bin/bash
set -e

# This script runs at Neo4j container startup (not during Docker build)
# Why? Neo4j .dump files MUST be loaded with 'neo4j-admin load' BEFORE Neo4j starts.
# We could bake data into a custom image, but that would:
#   - Make images larger and less portable
#   - Prevent checking if data already exists (idempotency)
#   - Require rebuilding the image to change datasets

echo "=========================================="
echo "Neo4j Initialization Script"
echo "=========================================="

# Check if database already exists
if [ -d "/data/databases/neo4j" ] && [ "$(ls -A /data/databases/neo4j)" ]; then
  echo "Database already exists. Skipping data load."
else
  echo "No existing database found. Loading from dump file..."

  # Install git if not available
  if ! command -v git &> /dev/null; then
    echo "Installing git..."
    apt-get update && apt-get install -y git
  fi

  # Clone twitter dataset if not exists
  if [ ! -d "/tmp/twitter-v2" ]; then
    echo "Cloning Twitter dataset..."
    git clone https://github.com/neo4j-graph-examples/twitter-v2.git /tmp/twitter-v2
  fi

  # Load the dump file using neo4j-admin (Neo4j 4.4 syntax)
  echo "Loading dump file with neo4j-admin..."
  neo4j-admin load --from=/tmp/twitter-v2/data/twitter-v2-43.dump --database=neo4j --force

  echo "Data loaded successfully!"
fi

echo "Starting Neo4j..."
exec /startup/docker-entrypoint.sh neo4j
