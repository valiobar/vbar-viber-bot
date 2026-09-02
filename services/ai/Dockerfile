# Multi-stage Dockerfile for AI Service (Node.js Express)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/ai/package.json ./services/ai/

# Install dependencies
RUN npm ci
# Ensure the path exists even if npm hoists everything to the root
RUN mkdir -p services/ai/node_modules

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage (root hoist + workspace-local installs like langchain)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/ai/node_modules ./services/ai/node_modules
RUN cp -a /app/services/ai/node_modules/. /app/node_modules/

# Copy source code
COPY packages/shared ./packages/shared
COPY services/ai ./services/ai

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build AI service
WORKDIR /app/services/ai
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ai

# Copy necessary files
COPY --from=builder --chown=ai:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ai:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=ai:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=builder --chown=ai:nodejs /app/packages/shared/proto ./packages/shared/proto
COPY --from=builder --chown=ai:nodejs /app/services/ai/dist ./dist
COPY --from=builder --chown=ai:nodejs /app/services/ai/package.json ./

USER ai

EXPOSE 3002

ENV PORT=3002

CMD ["node", "dist/index.js"]




