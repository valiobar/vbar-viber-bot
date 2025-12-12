# Multi-stage Dockerfile for Analytics Service (Node.js Express)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/analytics/package.json ./services/analytics/

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
COPY services/analytics ./services/analytics

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build Analytics service
WORKDIR /app/services/analytics
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 analytics

# Copy necessary files
COPY --from=builder --chown=analytics:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=analytics:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=analytics:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=analytics:nodejs /app/services/analytics/dist ./dist
COPY --from=builder --chown=analytics:nodejs /app/services/analytics/package.json ./

USER analytics

EXPOSE 3003

ENV PORT=3003

CMD ["node", "dist/index.js"]

