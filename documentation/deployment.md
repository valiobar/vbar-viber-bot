# Deployment Guide

## Table of Contents

1. [Docker Setup](#docker-setup)
2. [Local Docker Deployment](#local-docker-deployment)
3. [Kubernetes Deployment Strategy](#kubernetes-deployment-strategy)
4. [Production Deployment](#production-deployment)
5. [Database Deployment](#database-deployment)
6. [Message Queue Deployment](#message-queue-deployment)
7. [Monitoring and Logging](#monitoring-and-logging)

## Docker Setup

### Multi-stage Dockerfile Structure

Each service uses a multi-stage Dockerfile for optimized production images:

**Example Structure** (Node.js Express services):

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm ci
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Next.js Service Structure**:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### Building Docker Images

Build images for individual services:

```bash
# Build admin service
docker build -t vbar-admin:latest -f infrastructure/docker/Dockerfile.admin .

# Build viber service
docker build -t vbar-viber:latest -f infrastructure/docker/Dockerfile.viber .

# Build AI service
docker build -t vbar-ai:latest -f infrastructure/docker/Dockerfile.ai .

# Build analytics service
docker build -t vbar-analytics:latest -f infrastructure/docker/Dockerfile.analytics .

# Build Web3 service
docker build -t vbar-web3:latest -f infrastructure/docker/Dockerfile.web3 .
```

**Web3 Service Dockerfile Structure**:

The Web3 service uses a multi-stage Dockerfile similar to other Express services:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm ci
RUN npm run build

# Stage 3: Production
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
EXPOSE 3004
EXPOSE 50052
CMD ["node", "dist/index.js"]
```

**Note**: The Web3 service exposes both REST API port (3004) and gRPC port (50052).

Build all services at once:

```bash
# Build all services
docker compose -f infrastructure/docker-compose.yml build

# Build without cache
docker compose -f infrastructure/docker-compose.yml build --no-cache
```

### Docker Compose Configuration

#### Port Binding Security Model

The Docker Compose configuration implements a security model that restricts internal services to localhost-only access:

- **Public Services** (accessible from external networks):

  - **Admin Service** (`3000:3000`): Publicly accessible for user access
  - **Viber Service** (`3001:3001`): Publicly accessible - **required** for Viber API webhook callbacks
  - **Web3 Service REST API** (`3004:3004`): Publicly accessible for Admin Service integration

- **Internal Services** (localhost-only, not accessible from external networks):
  - **AI Service** (`127.0.0.1:3002:3002`): Localhost only - accessible from host machine for local development, but not from external networks
  - **Analytics Service** (`127.0.0.1:3003:3003`): Localhost only - accessible from host machine for local development, but not from external networks
  - **Web3 Service gRPC** (`127.0.0.1:50052:50052`): Internal only - accessible from host machine or Docker network for Viber and AI services

**Port Binding Behavior**:

- `"3000:3000"` → Binds to `0.0.0.0:3000` (all network interfaces, publicly accessible)
- `"127.0.0.1:3002:3002"` → Binds to `127.0.0.1:3002` (localhost only, not externally accessible)

**Service Communication**:

- **When services run locally** (`pnpm dev`): Services connect via `http://localhost:3001/3002/3003/3004` and gRPC on `localhost:50052`
- **When services run in Docker**: Services communicate via Docker network hostnames: `http://viber:3001`, `http://ai:3002`, `http://analytics:3003`, `http://web3:3004`, and gRPC on `web3:50052`
- Services within the Docker network can communicate using service names regardless of port binding configuration

**Security Impact**:

- **Before**: All services accessible from external networks
- **After**: Admin, Viber, and Web3 REST API accessible externally (Admin for users, Viber for webhooks, Web3 REST for Admin Service); AI, Analytics, and Web3 gRPC restricted to localhost/Docker network

**Viber Webhook Requirement**:
The Viber service must remain publicly accessible because:

- Viber API sends webhook events via HTTPS POST requests
- Webhook URL must be internet-accessible (e.g., `https://your-domain.com/api/viber/webhook`)
- Viber requires valid SSL certificate (not self-signed)
- Webhook endpoint typically at `/webhook` or `/api/viber/webhook` route

**Infrastructure Configuration** (`infrastructure/docker-compose.infrastructure.yml`):

```yaml
version: "3.8"

services:
  mongodb-admin:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: admin
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ADMIN_USER:-admin}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ADMIN_PASS:-admin123}
    volumes:
      - mongodb-admin-data:/data/db

  mongodb-bot:
    image: mongo:7
    ports:
      - "27018:27017"
    environment:
      MONGO_INITDB_DATABASE: bot
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_BOT_USER:-bot}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_BOT_PASS:-bot123}
    volumes:
      - mongodb-bot-data:/data/db

  mongodb-ai:
    image: mongo:7
    ports:
      - "27019:27017"
    environment:
      MONGO_INITDB_DATABASE: ai
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_AI_USER:-ai}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_AI_PASS:-ai123}
    volumes:
      - mongodb-ai-data:/data/db

  mongodb-analytics:
    image: mongo:7
    ports:
      - "27020:27017"
    environment:
      MONGO_INITDB_DATABASE: analytics
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ANALYTICS_USER:-analytics}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ANALYTICS_PASS:-analytics123}
    volumes:
      - mongodb-analytics-data:/data/db

  mongodb-web3:
    image: mongo:7
    ports:
      - "27021:27017"
    environment:
      MONGO_INITDB_DATABASE: web3
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_WEB3_USER:-web3}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_WEB3_PASS:-web3123}
    volumes:
      - mongodb-web3-data:/data/db

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    # Note: For GPU support, uncomment the deploy section below
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

volumes:
  mongodb-admin-data:
  mongodb-bot-data:
  mongodb-ai-data:
  mongodb-analytics-data:
  mongodb-web3-data:
  rabbitmq-data:
  ollama-data:
```

**Production Configuration** (`infrastructure/docker-compose.yml`):

```yaml
version: "3.8"

services:
  admin:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.admin
    ports:
      - "3000:3000" # Publicly accessible (for user access)
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_ADMIN_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - mongodb-admin
      - rabbitmq
    restart: unless-stopped

  viber:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.viber
    ports:
      - "3001:3001" # Publicly accessible (required for Viber webhook callbacks)
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_BOT_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - mongodb-bot
      - rabbitmq
    restart: unless-stopped

  ai:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.ai
    ports:
      - "127.0.0.1:3002:3002" # Localhost only (internal service, not exposed externally)
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_AI_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
      # AI Provider Configuration
      - AI_MODEL_PROVIDER=${AI_MODEL_PROVIDER:-ollama}
      - AI_TEMPERATURE=${AI_TEMPERATURE:-0.7}
      - AI_MAX_TOKENS=${AI_MAX_TOKENS:-}
      # Conversation Memory Configuration
      - CONVERSATION_MEMORY_TYPE=${CONVERSATION_MEMORY_TYPE:-buffer}
      - CONVERSATION_MAX_HISTORY=${CONVERSATION_MAX_HISTORY:-10}
      # Task Type Configuration
      - AI_TASK_TYPE=${AI_TASK_TYPE:-simple}
      # Ollama Configuration
      - OLLAMA_BASE_URL=${OLLAMA_URL:-http://ollama:11434}
      - OLLAMA_MODEL=${OLLAMA_MODEL:-qwen3:4b}
      # OpenAI Configuration
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - OPENAI_MODEL=${OPENAI_MODEL:-gpt-3.5-turbo}
      # Anthropic Configuration
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
      - ANTHROPIC_MODEL=${ANTHROPIC_MODEL:-}
      # Google AI Configuration
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY:-}
      - GOOGLE_AI_MODEL=${GOOGLE_AI_MODEL:-gemini-pro}
      # RAG Configuration
      - RAG_ENABLED=${RAG_ENABLED:-false}
      - RAG_EMBEDDING_PROVIDER=${RAG_EMBEDDING_PROVIDER:-openai}
      - RAG_OPENAI_EMBEDDING_MODEL=${RAG_OPENAI_EMBEDDING_MODEL:-text-embedding-3-small}
      - RAG_OLLAMA_EMBEDDING_MODEL=${RAG_OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}
      - RAG_VECTOR_STORE_TYPE=${RAG_VECTOR_STORE_TYPE:-mongodb}
      - RAG_VECTOR_STORE_COLLECTION=${RAG_VECTOR_STORE_COLLECTION:-embeddings}
      - RAG_RETRIEVER_K=${RAG_RETRIEVER_K:-4}
      - RAG_SIMILARITY_THRESHOLD=${RAG_SIMILARITY_THRESHOLD:-0.7}
      # Prompt Template Configuration
      - PROMPT_TEMPLATES_ENABLED=${PROMPT_TEMPLATES_ENABLED:-true}
      - PROMPT_TEMPLATE_STORAGE=${PROMPT_TEMPLATE_STORAGE:-mongodb}
      - PROMPT_TEMPLATE_DEFAULT=${PROMPT_TEMPLATE_DEFAULT:-}
      # LangSmith Configuration (Optional Observability)
      - LANGSMITH_TRACING=${LANGSMITH_TRACING:-false}
      - LANGSMITH_API_KEY=${LANGSMITH_API_KEY:-}
      - LANGSMITH_PROJECT=${LANGSMITH_PROJECT:-}
      - LANGSMITH_ENDPOINT=${LANGSMITH_ENDPOINT:-}
    depends_on:
      - mongodb-ai
      - rabbitmq
      - ollama
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped

  analytics:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.analytics
    ports:
      - "127.0.0.1:3003:3003" # Localhost only (internal service, not exposed externally)
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_ANALYTICS_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - mongodb-analytics
      - rabbitmq
    restart: unless-stopped

  web3:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.web3
    ports:
      - "3004:3004" # Publicly accessible (for Admin Service integration)
      - "127.0.0.1:50052:50052" # Localhost only (gRPC - internal service, not exposed externally)
    environment:
      - NODE_ENV=production
      - PORT=3004
      - MONGODB_URI=${MONGODB_WEB3_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
      # Blockchain RPC Endpoints
      - WEB3_RPC_ETHEREUM=${WEB3_RPC_ETHEREUM}
      - WEB3_RPC_POLYGON=${WEB3_RPC_POLYGON}
      - WEB3_RPC_BSC=${WEB3_RPC_BSC}
      - WEB3_RPC_ARBITRUM=${WEB3_RPC_ARBITRUM}
      # Security Configuration
      - WEB3_ENCRYPTION_KEY=${WEB3_ENCRYPTION_KEY}
      # gRPC Configuration
      - WEB3_GRPC_PORT=50052
      # Other services
      - ADMIN_SERVICE_URL=${ADMIN_SERVICE_URL:-http://admin:3000}
      - VIBER_SERVICE_URL=${VIBER_SERVICE_URL:-http://viber:3001}
      - AI_SERVICE_URL=${AI_SERVICE_URL:-http://ai:3002}
      - ANALYTICS_SERVICE_URL=${ANALYTICS_SERVICE_URL:-http://analytics:3003}
    depends_on:
      - mongodb-web3
      - rabbitmq
    restart: unless-stopped

  mongodb-admin:
    image: mongo:7
    volumes:
      - mongodb-admin-data:/data/db
    restart: unless-stopped

  mongodb-bot:
    image: mongo:7
    volumes:
      - mongodb-bot-data:/data/db
    restart: unless-stopped

  mongodb-ai:
    image: mongo:7
    volumes:
      - mongodb-ai-data:/data/db
    restart: unless-stopped

  mongodb-analytics:
    image: mongo:7
    volumes:
      - mongodb-analytics-data:/data/db
    restart: unless-stopped

  mongodb-web3:
    image: mongo:7
    volumes:
      - mongodb-web3-data:/data/db
    restart: unless-stopped

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASS}
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    restart: unless-stopped

volumes:
  mongodb-admin-data:
  mongodb-bot-data:
  mongodb-ai-data:
  mongodb-analytics-data:
  mongodb-web3-data:
  rabbitmq-data:
```

### Environment Variables in Docker

Environment variables can be set in multiple ways:

1. **Environment File**:

   ```bash
   docker compose --env-file .env up
   ```

2. **Inline**:

   ```bash
   # MongoDB connection string must include authentication credentials
   docker run -e MONGODB_URI=mongodb://admin:admin123@mongodb-admin:27017/admin vbar-admin:latest
   ```

3. **Docker Compose**:
   ```yaml
   services:
     admin:
       environment:
         - MONGODB_URI=${MONGODB_URI}
       env_file:
         - .env
   ```

### Volume Mounts for Development

For development with hot reload:

```yaml
services:
  admin:
    volumes:
      - ./services/admin:/app
      - /app/node_modules
      - /app/.next
```

### Network Configuration

Docker Compose creates a default network. For custom networking:

```yaml
networks:
  vbar-network:
    driver: bridge

services:
  admin:
    networks:
      - vbar-network
```

## Local Docker Deployment

### Running with Docker Compose

**Start all services**:

```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

**View logs**:

```bash
# All services
docker compose -f infrastructure/docker-compose.yml logs -f

# Specific service
docker compose -f infrastructure/docker-compose.yml logs -f admin
```

**Stop services**:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

**Stop and remove volumes**:

```bash
docker compose -f infrastructure/docker-compose.yml down -v
```

### Service Health Checks

Verify services are running:

```bash
# Admin service (publicly accessible)
curl http://localhost:3000/api/health

# Viber service (publicly accessible)
curl http://localhost:3001/health

# AI service (localhost only - accessible from host machine)
curl http://localhost:3002/health

# Analytics service (localhost only - accessible from host machine)
curl http://localhost:3003/health

# Web3 service REST API (publicly accessible)
curl http://localhost:3004/api/web3/health

# Web3 service gRPC (localhost only - accessible from host machine or Docker network)
# Note: gRPC requires gRPC client tools to test
```

**Note**: AI and Analytics services are bound to localhost only (`127.0.0.1`), so they are:

- ✅ Accessible from the host machine at `http://localhost:3002` and `http://localhost:3003`
- ❌ **NOT** accessible from external networks (e.g., `http://<server-ip>:3002` will fail)
- ✅ Accessible from other Docker containers using service names: `http://ai:3002` and `http://analytics:3003`

**Docker health checks**:

```yaml
services:
  admin:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Logs and Debugging

**View real-time logs**:

```bash
docker compose -f infrastructure/docker-compose.yml logs -f --tail=100
```

**View logs for specific service**:

```bash
docker compose -f infrastructure/docker-compose.yml logs admin
```

**Execute commands in container**:

```bash
docker compose -f infrastructure/docker-compose.yml exec admin sh
```

**Inspect container**:

```bash
docker inspect <container-id>
```

### Stopping and Cleaning Up

**Stop services**:

```bash
docker compose -f infrastructure/docker-compose.yml stop
```

**Remove containers**:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

**Remove containers and volumes**:

```bash
docker compose -f infrastructure/docker-compose.yml down -v
```

**Remove images**:

```bash
docker compose -f infrastructure/docker-compose.yml down --rmi all
```

## Kubernetes Deployment Strategy

### Namespace Configuration

Create a namespace for the application:

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: vbar-viber-bot
  labels:
    name: vbar-viber-bot
```

Apply:

```bash
kubectl apply -f infrastructure/k8s/namespace.yaml
```

### Deployment Manifests

**Admin Service Deployment** (`k8s/deployments/admin-deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-service
  namespace: vbar-viber-bot
  labels:
    app: admin-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-service
  template:
    metadata:
      labels:
        app: admin-service
    spec:
      containers:
        - name: admin
          image: vbar-admin:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: MONGODB_URI
              valueFrom:
                configMapKeyRef:
                  name: admin-config
                  key: mongodb-uri
            # Alternative: Use secrets for MongoDB credentials
            # - name: MONGODB_URI
            #   value: "mongodb://$(MONGO_USER):$(MONGO_PASS)@mongodb-admin:27017/admin"
            # envFrom:
            # - secretRef:
            #     name: mongodb-secret
            - name: RABBITMQ_URL
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

### Service Definitions

**Admin Service** (`k8s/services/admin-service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: admin-service
  namespace: vbar-viber-bot
spec:
  selector:
    app: admin-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
```

### ConfigMaps and Secrets

**ConfigMap Example** (`k8s/configmaps/admin-config.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: admin-config
  namespace: vbar-viber-bot
data:
  # Note: MongoDB URI should include credentials from secrets in production
  # Format: mongodb://username:password@host:port/database
  mongodb-uri: "mongodb://admin:admin123@mongodb-admin:27017/admin"
  node-env: "production"
  port: "3000"
```

**Important**: In production, store MongoDB credentials in Kubernetes Secrets, not ConfigMaps. Use the format:

```yaml
mongodb-uri: "mongodb://$(MONGO_USER):$(MONGO_PASS)@mongodb-admin:27017/admin"
```

**Secret Example** (`k8s/secrets/rabbitmq-secret.yaml`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rabbitmq-secret
  namespace: vbar-viber-bot
type: Opaque
stringData:
  url: "amqp://admin:password@rabbitmq:5672"
  username: "admin"
  password: "password"
```

**Note**: In production, use sealed secrets or external secret management.

### Ingress Configuration

**Ingress** (`k8s/ingress/ingress.yaml`):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vbar-ingress
  namespace: vbar-viber-bot
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: admin.vbar.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: admin-service
                port:
                  number: 80
    - host: api.vbar.local
      http:
        paths:
          - path: /viber
            pathType: Prefix
            backend:
              service:
                name: viber-service
                port:
                  number: 80
          - path: /ai
            pathType: Prefix
            backend:
              service:
                name: ai-service
                port:
                  number: 80
          - path: /analytics
            pathType: Prefix
            backend:
              service:
                name: analytics-service
                port:
                  number: 80
          - path: /web3
            pathType: Prefix
            backend:
              service:
                name: web3-service
                port:
                  number: 80
```

### Web3 Service Kubernetes Deployment

**Web3 Service Deployment** (`k8s/deployments/web3-deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web3-service
  namespace: vbar-viber-bot
  labels:
    app: web3-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web3-service
  template:
    metadata:
      labels:
        app: web3-service
    spec:
      containers:
        - name: web3
          image: vbar-web3:latest
          ports:
            - containerPort: 3004
              name: http
            - containerPort: 50052
              name: grpc
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3004"
            - name: MONGODB_URI
              valueFrom:
                configMapKeyRef:
                  name: web3-config
                  key: mongodb-uri
            - name: RABBITMQ_URL
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: url
            # Blockchain RPC Endpoints (from secrets for production)
            - name: WEB3_RPC_ETHEREUM
              valueFrom:
                secretKeyRef:
                  name: web3-secrets
                  key: rpc-ethereum
            - name: WEB3_RPC_POLYGON
              valueFrom:
                secretKeyRef:
                  name: web3-secrets
                  key: rpc-polygon
            - name: WEB3_RPC_BSC
              valueFrom:
                secretKeyRef:
                  name: web3-secrets
                  key: rpc-bsc
            - name: WEB3_RPC_ARBITRUM
              valueFrom:
                secretKeyRef:
                  name: web3-secrets
                  key: rpc-arbitrum
            # Security Configuration (from secrets)
            - name: WEB3_ENCRYPTION_KEY
              valueFrom:
                secretKeyRef:
                  name: web3-secrets
                  key: encryption-key
            # gRPC Configuration
            - name: WEB3_GRPC_PORT
              value: "50052"
            # Other services
            - name: ADMIN_SERVICE_URL
              value: "http://admin-service:80"
            - name: VIBER_SERVICE_URL
              value: "http://viber-service:80"
            - name: AI_SERVICE_URL
              value: "http://ai-service:80"
            - name: ANALYTICS_SERVICE_URL
              value: "http://analytics-service:80"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /api/web3/health
              port: 3004
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/web3/health
              port: 3004
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
```

**Web3 Service** (`k8s/services/web3-service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web3-service
  namespace: vbar-viber-bot
spec:
  selector:
    app: web3-service
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3004
      name: http
    - protocol: TCP
      port: 50052
      targetPort: 50052
      name: grpc
  type: ClusterIP
```

**Web3 ConfigMap** (`k8s/configmaps/web3-config.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web3-config
  namespace: vbar-viber-bot
data:
  # Note: MongoDB URI should include credentials from secrets in production
  # Format: mongodb://username:password@host:port/database
  mongodb-uri: "mongodb://web3:web3123@mongodb-web3:27017/web3"
  node-env: "production"
  port: "3004"
  grpc-port: "50052"
```

**Web3 Secrets** (`k8s/secrets/web3-secrets.yaml`):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: web3-secrets
  namespace: vbar-viber-bot
type: Opaque
stringData:
  # Blockchain RPC Endpoints
  rpc-ethereum: "https://eth-mainnet.g.alchemy.com/v2/your-api-key"
  rpc-polygon: "https://polygon-mainnet.g.alchemy.com/v2/your-api-key"
  rpc-bsc: "https://bsc-dataseed1.binance.org"
  rpc-arbitrum: "https://arb-mainnet.g.alchemy.com/v2/your-api-key"
  # Encryption key for private keys (minimum 32 characters)
  encryption-key: "your-encryption-key-here-minimum-32-characters-long"
```

**Note**: In production, use sealed secrets or external secret management for RPC endpoints and encryption keys.

### StatefulSets for MongoDB

**MongoDB StatefulSet** (`k8s/statefulsets/mongodb-admin.yaml`):

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb-admin
  namespace: vbar-viber-bot
spec:
  serviceName: mongodb-admin
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-admin
  template:
    metadata:
      labels:
        app: mongodb-admin
    spec:
      containers:
        - name: mongodb
          image: mongo:7
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
          env:
            - name: MONGO_INITDB_DATABASE
              value: "admin"
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Web3 MongoDB StatefulSet** (`k8s/statefulsets/mongodb-web3.yaml`):

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb-web3
  namespace: vbar-viber-bot
spec:
  serviceName: mongodb-web3
  replicas: 1
  selector:
    matchLabels:
      app: mongodb-web3
  template:
    metadata:
      labels:
        app: mongodb-web3
    spec:
      containers:
        - name: mongodb
          image: mongo:7
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongodb-data
              mountPath: /data/db
          env:
            - name: MONGO_INITDB_DATABASE
              value: "web3"
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-web3-secret
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-web3-secret
                  key: password
  volumeClaimTemplates:
    - metadata:
        name: mongodb-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

**Web3 MongoDB PersistentVolumeClaim** (`k8s/pvc/mongodb-web3-pvc.yaml`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-web3-pvc
  namespace: vbar-viber-bot
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
```

**Web3 MongoDB Backup Strategy**:

The Web3 MongoDB database stores critical blockchain data including wallets, transactions, and contract ABIs. Implement regular backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-web3-backup
  namespace: vbar-viber-bot
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7
            command:
            - mongodump
            - --host=mongodb-web3
            - --username=web3
            - --password=web3123
            - --authenticationDatabase=web3
            - --out=/backup
            env:
            - name: MONGO_USER
              valueFrom:
                secretKeyRef:
                  name: mongodb-web3-secret
                  key: username
            - name: MONGO_PASS
              valueFrom:
                secretKeyRef:
                  name: mongodb-web3-secret
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

### RabbitMQ Deployment

**RabbitMQ Deployment** (`k8s/deployments/rabbitmq-deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
  namespace: vbar-viber-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3-management-alpine
          ports:
            - containerPort: 5672
            - containerPort: 15672
          env:
            - name: RABBITMQ_DEFAULT_USER
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: username
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: password
          volumeMounts:
            - name: rabbitmq-data
              mountPath: /var/lib/rabbitmq
      volumes:
        - name: rabbitmq-data
          persistentVolumeClaim:
            claimName: rabbitmq-pvc
```

### Ollama Deployment

**Ollama Deployment** (`k8s/deployments/ollama-deployment.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  namespace: vbar-viber-bot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      containers:
        - name: ollama
          image: ollama/ollama:latest
          ports:
            - containerPort: 11434
          env:
            - name: OLLAMA_HOST
              value: "0.0.0.0"
          volumeMounts:
            - name: ollama-data
              mountPath: /root/.ollama
          resources:
            requests:
              memory: "4Gi"
              cpu: "2"
              # Uncomment for GPU support
              # nvidia.com/gpu: 1
            limits:
              memory: "8Gi"
              cpu: "4"
              # Uncomment for GPU support
              # nvidia.com/gpu: 1
      volumes:
        - name: ollama-data
          persistentVolumeClaim:
            claimName: ollama-pvc
```

**Ollama Service** (`k8s/services/ollama-service.yaml`):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ollama
  namespace: vbar-viber-bot
spec:
  selector:
    app: ollama
  ports:
    - protocol: TCP
      port: 11434
      targetPort: 11434
  type: ClusterIP
```

**Ollama PersistentVolumeClaim** (`k8s/pvc/ollama-pvc.yaml`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ollama-pvc
  namespace: vbar-viber-bot
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi # Adjust based on model sizes
  storageClassName: fast-ssd
```

**Note**: For GPU support, ensure your Kubernetes cluster has NVIDIA GPU nodes and the NVIDIA device plugin installed. Uncomment the GPU resource requests/limits in the deployment.

## Production Deployment

### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Secrets properly managed (not in code)
- [ ] Docker images built and pushed to registry
- [ ] Database backups configured
- [ ] Monitoring and logging set up
- [ ] Health checks configured
- [ ] Resource limits defined
- [ ] Ingress/TLS certificates configured
- [ ] Backup and recovery procedures documented

### Environment Configuration

**Production Environment Variables**:

- Use Kubernetes Secrets for sensitive data
- Use ConfigMaps for non-sensitive configuration
- Never commit secrets to version control
- Use external secret management (e.g., HashiCorp Vault, AWS Secrets Manager)

**AI Service Environment Variables**:

The AI Service requires the following environment variables for LangChain integration:

**AI Provider Configuration**:

- `AI_MODEL_PROVIDER`: AI provider to use (`ollama`, `openai`, `anthropic`, `google`) - Default: `ollama`
- `AI_TEMPERATURE`: Temperature for AI model responses (0.0-2.0) - Default: `0.7`
- `AI_MAX_TOKENS`: Maximum tokens for AI responses (optional)

**Conversation Memory Settings**:

- `CONVERSATION_MEMORY_TYPE`: Memory type (`buffer` or `summary`) - Default: `buffer`
- `CONVERSATION_MAX_HISTORY`: Maximum conversation history messages - Default: `10`

**Task Type Configuration**:

- `AI_TASK_TYPE`: Task type (`simple`, `rag`, `custom`) - Default: `simple`

**Provider-Specific Configuration**:

**Ollama (Self-Hosted)**:

- `OLLAMA_BASE_URL`: Ollama service URL - Default: `http://localhost:11434`
- `OLLAMA_MODEL`: Model name - Default: `qwen3:4b`

**OpenAI**:

- `OPENAI_API_KEY`: OpenAI API key (required if using OpenAI)
- `OPENAI_MODEL`: Model name - Default: `gpt-3.5-turbo`

**Anthropic**:

- `ANTHROPIC_API_KEY`: Anthropic API key (required if using Anthropic)
- `ANTHROPIC_MODEL`: Model name (required if using Anthropic)

**Google AI**:

- `GOOGLE_AI_API_KEY`: Google AI API key (required if using Google)
- `GOOGLE_AI_MODEL`: Model name - Default: `gemini-pro`

**RAG (Retrieval Augmented Generation) Configuration**:

- `RAG_ENABLED`: Enable RAG functionality - Default: `false`
- `RAG_EMBEDDING_PROVIDER`: Embedding provider (`openai`, `ollama`, `local`) - Default: `openai`
- `RAG_OPENAI_EMBEDDING_MODEL`: OpenAI embedding model - Default: `text-embedding-3-small`
- `RAG_OLLAMA_EMBEDDING_MODEL`: Ollama embedding model - Default: `nomic-embed-text`
- `RAG_VECTOR_STORE_TYPE`: Vector store type (`mongodb` or `memory`) - Default: `mongodb`
- `RAG_VECTOR_STORE_COLLECTION`: MongoDB collection for vectors - Default: `embeddings`
- `RAG_RETRIEVER_K`: Number of documents to retrieve - Default: `4`
- `RAG_SIMILARITY_THRESHOLD`: Similarity threshold (0.0-1.0) - Default: `0.7`

**Prompt Template Configuration**:

- `PROMPT_TEMPLATES_ENABLED`: Enable prompt templates - Default: `true`
- `PROMPT_TEMPLATE_STORAGE`: Storage type (`mongodb` or `file`) - Default: `mongodb`
- `PROMPT_TEMPLATE_DEFAULT`: Default template name (optional)

**LangSmith Observability (Optional)**:

- `LANGSMITH_TRACING`: Enable LangSmith tracing - Default: `false`
- `LANGSMITH_API_KEY`: LangSmith API key (required if tracing enabled)
- `LANGSMITH_PROJECT`: LangSmith project name (optional)
- `LANGSMITH_ENDPOINT`: LangSmith endpoint URL (optional, defaults to LangSmith cloud)

**Note**: If using MongoDB vector store for RAG, ensure MongoDB Atlas Vector Search index is configured. See [Setup Guide](./setup.md) for MongoDB vector search setup instructions.

**Web3 Service Environment Variables**:

The Web3 Service requires the following environment variables for blockchain operations:

**Server Configuration**:

- `PORT`: REST API port - Default: `3004`
- `NODE_ENV`: Node environment - Default: `production`
- `WEB3_GRPC_PORT`: gRPC server port - Default: `50052`

**Database Configuration**:

- `MONGODB_URI`: MongoDB connection string for web3 database (required)
- `MONGODB_DB_NAME`: Database name - Default: `web3`

**Message Queue Configuration**:

- `RABBITMQ_URL`: RabbitMQ connection URL (required)

**Blockchain RPC Endpoints** (required):

- `WEB3_RPC_ETHEREUM`: Ethereum Mainnet RPC endpoint (required)
- `WEB3_RPC_POLYGON`: Polygon Mainnet RPC endpoint (required)
- `WEB3_RPC_BSC`: Binance Smart Chain RPC endpoint (required)
- `WEB3_RPC_ARBITRUM`: Arbitrum One RPC endpoint (required)

**Security Configuration**:

- `WEB3_ENCRYPTION_KEY`: Encryption key for private keys (required, minimum 32 characters)

**Service URLs**:

- `ADMIN_SERVICE_URL`: Admin service URL - Default: `http://admin-service:80`
- `VIBER_SERVICE_URL`: Viber service URL - Default: `http://viber-service:80`
- `AI_SERVICE_URL`: AI service URL - Default: `http://ai-service:80`
- `ANALYTICS_SERVICE_URL`: Analytics service URL - Default: `http://analytics-service:80`

**RPC Endpoint Configuration**:

- Use public endpoints for development (e.g., `https://eth.llamarpc.com`)
- Use provider services (Alchemy, Infura) for production with API keys
- Configure fallback endpoints for reliability
- Monitor RPC rate limits and adjust accordingly

**Encryption Key Management**:

- Generate a strong, randomly generated encryption key (minimum 32 characters)
- Store encryption key in Kubernetes Secrets or external secret management
- Never commit encryption key to version control
- Rotate encryption key periodically (requires re-encryption of existing private keys)
- Ensure encryption key is consistent across service restarts

### Secrets Management

**Using kubectl**:

```bash
# Create secret from file
kubectl create secret generic app-secrets \
  --from-file=./secrets/.env \
  -n vbar-viber-bot

# Create secret from literal
kubectl create secret generic app-secrets \
  --from-literal=api-key=value \
  -n vbar-viber-bot
```

**Using Sealed Secrets** (recommended):

```bash
# Install kubeseal
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/controller.yaml

# Create sealed secret
kubeseal < secret.yaml > sealed-secret.yaml
kubectl apply -f sealed-secret.yaml
```

**Web3 Service Secrets**:

The Web3 service requires secrets for:

- **Blockchain RPC Endpoints**: Store RPC endpoint URLs (may include API keys)
- **Encryption Key**: Store private key encryption key (critical security secret)

```bash
# Create Web3 secrets
kubectl create secret generic web3-secrets \
  --from-literal=rpc-ethereum=https://eth-mainnet.g.alchemy.com/v2/your-api-key \
  --from-literal=rpc-polygon=https://polygon-mainnet.g.alchemy.com/v2/your-api-key \
  --from-literal=rpc-bsc=https://bsc-dataseed1.binance.org \
  --from-literal=rpc-arbitrum=https://arb-mainnet.g.alchemy.com/v2/your-api-key \
  --from-literal=encryption-key=your-encryption-key-here-minimum-32-characters-long \
  -n vbar-viber-bot
```

**Important**: 
- Use sealed secrets or external secret management for production
- Rotate encryption keys periodically
- Monitor RPC endpoint API key usage and rate limits

### Resource Limits and Requests

**Example Resource Configuration**:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Web3 Service Resource Recommendations**:

```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
```

**Considerations**:

- Blockchain RPC calls may have rate limits affecting CPU usage
- Transaction processing may require additional memory for large contract interactions
- Monitor RPC endpoint response times and adjust resources accordingly
- Consider network latency when interacting with blockchain networks

**Guidelines**:

- Set requests based on typical usage
- Set limits to prevent resource exhaustion
- Monitor and adjust based on actual usage
- Use Horizontal Pod Autoscaler for dynamic scaling
- Consider blockchain RPC rate limits when scaling Web3 service

### Scaling Strategies

**Horizontal Pod Autoscaler** (`k8s/hpa/admin-hpa.yaml`):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: admin-hpa
  namespace: vbar-viber-bot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: admin-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Manual Scaling**:

```bash
kubectl scale deployment admin-service --replicas=5 -n vbar-viber-bot
```

**Web3 Service Scaling Considerations**:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web3-hpa
  namespace: vbar-viber-bot
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web3-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

**Important Notes**:

- **Blockchain RPC Rate Limits**: Blockchain RPC providers (Alchemy, Infura) may have rate limits that affect scaling. Monitor RPC endpoint usage and consider:
  - Using multiple RPC endpoints with load balancing
  - Implementing request queuing and throttling
  - Monitoring RPC response times and error rates
- **Transaction Processing**: Blockchain transactions may take time to confirm, affecting service load
- **Network Latency**: Consider blockchain network latency when scaling

### Health Checks and Probes

**Liveness Probe**: Detects if container is running
**Readiness Probe**: Detects if container is ready to serve traffic

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

**Web3 Service Health Checks**:

```yaml
livenessProbe:
  httpGet:
    path: /api/web3/health
    port: 3004
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/web3/health
    port: 3004
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

**Health Check Endpoint Features**:

The Web3 service health check endpoint (`/api/web3/health`) includes:

- Service status (running, healthy)
- Database connectivity check
- RabbitMQ connectivity check
- Blockchain RPC endpoint connectivity checks (Ethereum, Polygon, BSC, Arbitrum)
- gRPC server status

**Blockchain RPC Connectivity Checks**:

The health check verifies connectivity to all configured blockchain RPC endpoints. If any RPC endpoint is unavailable, the health check may report degraded status but the service will continue operating with available networks.

## Database Deployment

### MongoDB StatefulSets

**StatefulSet Benefits**:

- Stable network identities
- Ordered deployment and scaling
- Persistent storage per pod
- Stable persistent storage

**Deployment**:

```bash
kubectl apply -f infrastructure/k8s/statefulsets/mongodb-admin.yaml
kubectl apply -f infrastructure/k8s/statefulsets/mongodb-web3.yaml
```

### Persistent Volumes

**PersistentVolumeClaim** (`k8s/pvc/mongodb-pvc.yaml`):

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-admin-pvc
  namespace: vbar-viber-bot
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: fast-ssd
```

### Backup Strategies

**MongoDB Backup**:

```bash
# Manual backup
kubectl exec -it mongodb-admin-0 -n vbar-viber-bot -- \
  mongodump --out=/backup/$(date +%Y%m%d)

# Automated backup with CronJob
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: vbar-viber-bot
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7
            command:
            - mongodump
            - --host=mongodb-admin
            - --username=admin
            - --password=admin123
            - --authenticationDatabase=admin
            - --out=/backup
            env:
            - name: MONGO_USER
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: username
            - name: MONGO_PASS
              valueFrom:
                secretKeyRef:
                  name: mongodb-secret
                  key: password
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

**Web3 MongoDB Backup Strategy**:

The Web3 MongoDB database stores critical blockchain data. Implement regular backups with the following considerations:

- **Wallet Data**: Encrypted private keys must be backed up securely
- **Transaction History**: Large volume of transaction data requires efficient backup strategies
- **Contract ABIs**: Contract ABIs are essential for contract interactions
- **Backup Frequency**: Daily backups recommended for production
- **Backup Retention**: Retain backups for at least 30 days
- **Encryption**: Encrypt backups containing private key data

### Database Initialization

**Init Containers** for database setup:

```yaml
initContainers:
  - name: init-db
    image: mongo:7
    command:
      - sh
      - -c
      - |
        # Note: MongoDB authentication is configured via MONGO_INITDB_ROOT_USERNAME
        # and MONGO_INITDB_ROOT_PASSWORD environment variables in the StatefulSet
        # This init container can be used for additional setup if needed
        mongosh mongodb-admin:27017/admin \
          -u admin -p admin123 --authenticationDatabase admin \
          --eval "db.getUsers()"
    env:
      - name: MONGO_USER
        valueFrom:
          secretKeyRef:
            name: mongodb-secret
            key: username
      - name: MONGO_PASS
        valueFrom:
          secretKeyRef:
            name: mongodb-secret
            key: password
```

**Note**: MongoDB authentication is automatically configured when using the official MongoDB Docker image with `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` environment variables. The root user is created in the `admin` database with full administrative privileges.

## Message Queue Deployment

### RabbitMQ Deployment

**Deployment Configuration**:

- Use StatefulSet for stable network identity
- Configure persistent storage
- Set up clustering for high availability
- Configure resource limits

**High Availability Setup**:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
spec:
  serviceName: rabbitmq
  replicas: 3
  # ... configuration for HA cluster
```

### Queue Configuration

**Queue Declaration** (in application code or init container):

```typescript
// Queue configuration
const queues = [
  { name: "viber.messages", durable: true },
  { name: "ai.processed", durable: true },
  { name: "analytics.events", durable: true },
];
```

**RabbitMQ Policies**:

```bash
kubectl exec -it rabbitmq-0 -n vbar-viber-bot -- \
  rabbitmqctl set_policy ha-all ".*" '{"ha-mode":"all"}'
```

## Monitoring and Logging

### Log Aggregation

**Fluentd DaemonSet** for log collection:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
spec:
  # Fluentd configuration for log aggregation
```

**ELK Stack** or **Loki** for centralized logging.

### Health Monitoring

**Prometheus ServiceMonitor**:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: admin-service-monitor
  namespace: vbar-viber-bot
spec:
  selector:
    matchLabels:
      app: admin-service
  endpoints:
    - port: http
      path: /metrics
```

### Performance Metrics

**Metrics Endpoints**:

- Each service exposes `/metrics` endpoint
- Prometheus scrapes metrics
- Grafana dashboards for visualization

**Key Metrics**:

- Request rate and latency
- Error rates
- Resource utilization (CPU, memory)
- Database connection pool status
- Message queue depth

## Deployment Commands

### Apply All Kubernetes Resources

```bash
# Apply namespace
kubectl apply -f infrastructure/k8s/namespace.yaml

# Apply ConfigMaps
kubectl apply -f infrastructure/k8s/configmaps/

# Apply Secrets
kubectl apply -f infrastructure/k8s/secrets/

# Apply StatefulSets (databases)
kubectl apply -f infrastructure/k8s/statefulsets/

# Apply Deployments (services)
kubectl apply -f infrastructure/k8s/deployments/

# Apply Services
kubectl apply -f infrastructure/k8s/services/

# Apply Ingress
kubectl apply -f infrastructure/k8s/ingress/
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n vbar-viber-bot

# Check services
kubectl get services -n vbar-viber-bot

# Check deployments
kubectl get deployments -n vbar-viber-bot

# Describe pod for details
kubectl describe pod <pod-name> -n vbar-viber-bot

# View logs
kubectl logs <pod-name> -n vbar-viber-bot
```

## Related Documentation

- [Setup Guide](./setup.md) - Development environment setup
- [Architecture Documentation](./architecture.md) - System architecture
- [API Documentation](./api.md) - API contracts and endpoints
