# Multi-stage Dockerfile for Admin Service (Next.js)

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY services/admin/package.json ./services/admin/

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY packages/shared ./packages/shared
COPY services/admin ./services/admin

# Build shared package
WORKDIR /app/packages/shared
RUN npm run build

# Build admin service
WORKDIR /app/services/admin
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files. Standalone emits server.js at /app; Next does not
# always trace node_modules in this monorepo, so copy them from the builder.
COPY --from=builder --chown=nextjs:nodejs /app/services/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder /app/services/admin/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/services/admin/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

