# Multi-stage Dockerfile for Viber Service (Node.js Express)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/viber/package.json ./services/viber/

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
COPY services/viber ./services/viber

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build viber service
WORKDIR /app/services/viber
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 viber

# Copy necessary files
COPY --from=builder --chown=viber:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=viber:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=viber:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=viber:nodejs /app/packages/shared/proto ./packages/shared/proto
COPY --from=builder --chown=viber:nodejs /app/services/viber/dist ./dist
COPY --from=builder --chown=viber:nodejs /app/services/viber/package.json ./

USER viber

EXPOSE 3001

ENV PORT=3001

CMD ["node", "dist/index.js"]

