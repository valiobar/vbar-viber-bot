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
```

Build all services at once:

```bash
# Build all services
docker compose -f infrastructure/docker-compose.yml build

# Build without cache
docker compose -f infrastructure/docker-compose.yml build --no-cache
```

### Docker Compose Configuration

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
      - "3000:3000"
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
      - "3001:3001"
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
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_AI_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
      - OLLAMA_URL=${OLLAMA_URL:-http://ollama:11434}
      - AI_MODEL_PROVIDER=${AI_MODEL_PROVIDER:-ollama}
      - AI_MODEL_NAME=${AI_MODEL_NAME:-llama2}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
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
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_ANALYTICS_URI}
      - RABBITMQ_URL=${RABBITMQ_URL}
    depends_on:
      - mongodb-analytics
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
# Admin service
curl http://localhost:3000/api/health

# Viber service
curl http://localhost:3001/health

# AI service
curl http://localhost:3002/health

# Analytics service
curl http://localhost:3003/health
```

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
```

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

**Guidelines**:

- Set requests based on typical usage
- Set limits to prevent resource exhaustion
- Monitor and adjust based on actual usage
- Use Horizontal Pod Autoscaler for dynamic scaling

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
