# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set NODE_ENV for production optimizations
ENV NODE_ENV=production

# IMPORTANT: Do NOT set sensitive values here (passwords, API keys)
# These should be set via:
#   - docker-compose.yml environment section
#   - .env file (loaded by docker-compose)
#   - Docker run -e flags
#   - Kubernetes secrets
#
# Uncomment and customize these in your deployment:
# ENV PORT=3000
# ENV NEO4J_URI=bolt://neo4j:7687
# ENV NEO4J_USERNAME=neo4j
# ENV NEO4J_PASSWORD=your_secure_password_here
# ENV NEO4J_DATABASE=neo4j
# ENV GEMINI_API_KEY=your_api_key_here

# Copy package files for embeddings generation
COPY --from=builder /app/package*.json ./

# Install dependencies (needed for embeddings generation)
RUN npm ci --omit=dev

# Copy necessary files from builder
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy scripts and lib for embeddings generation
COPY scripts ./scripts
COPY lib ./lib
COPY tsconfig.json ./

# Copy init script
COPY scripts/init-docker.sh /app/init-docker.sh
RUN chmod +x /app/init-docker.sh

# Expose port
EXPOSE 3000

# Use init script as entrypoint
ENTRYPOINT ["/app/init-docker.sh"]
