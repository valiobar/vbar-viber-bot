# Multi-stage Dockerfile for Web3 Service (Node.js Express)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/web3/package.json ./services/web3/

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code
COPY packages/shared ./packages/shared
COPY services/web3 ./services/web3

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build Web3 service
WORKDIR /app/services/web3
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 web3

# Copy necessary files
COPY --from=builder --chown=web3:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=web3:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=web3:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=web3:nodejs /app/packages/shared/proto ./packages/shared/proto
COPY --from=builder --chown=web3:nodejs /app/services/web3/dist ./dist
COPY --from=builder --chown=web3:nodejs /app/services/web3/package.json ./

USER web3

EXPOSE 3004 50052

ENV PORT=3004
ENV WEB3_GRPC_PORT=50052

CMD ["node", "dist/index.js"]

