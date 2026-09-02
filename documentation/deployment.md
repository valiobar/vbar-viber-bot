# Deployment Guide

## Table of Contents

1. [Deployment Model](#deployment-model)
2. [Default Topology](#default-topology)
3. [Docker Images](#docker-images)
4. [Environment Contract](#environment-contract)
5. [Local Docker Deployment](#local-docker-deployment)
6. [Production Deployment (VPS)](#production-deployment-vps)
7. [CI/CD (GitHub Actions)](#cicd-github-actions)
8. [Database](#database)
9. [Message Queue](#message-queue)
10. [Optional Profiles](#optional-profiles)

## Deployment Model

Production runs as a **single Docker Compose stack on one VPS** (DigitalOcean or Hetzner).

- **GitHub Actions** builds service images and pushes them to **GHCR**.
- The VPS **never builds** images; it pulls tagged images and runs `deploy.sh`.
- Application secrets live in a root `.env` on the server (created once from `.env.example`).
- Only HTTP(S) application ports need to be public (via a reverse proxy). MongoDB and RabbitMQ bind to **localhost**.

Compose file: `infrastructure/docker-compose.yml`  
Deploy script: `deploy.sh`  
Env template: `.env.example`

## Default Topology

Default profile starts **5 containers**:

| Service   | Container      | Host port                         | Role                                      |
|-----------|----------------|-----------------------------------|-------------------------------------------|
| admin     | `vbar-admin`   | `3000:3000`                       | Next.js admin UI + API                    |
| viber     | `vbar-viber`   | `3001:3001`                       | Viber webhooks + bot runtime              |
| ai        | `vbar-ai`      | `127.0.0.1:3002:3002`             | AI / LLM (localhost only)                 |
| mongodb   | `vbar-mongodb` | `127.0.0.1:27017:27017`           | Shared MongoDB (`admin_service`, `bot`, `ai`) |
| rabbitmq  | `vbar-rabbitmq`| `127.0.0.1:5672`, `127.0.0.1:15672` | Cache-refresh events (localhost only)   |

**Opt-in profiles** (not started by default). Default stack is still **5 containers**:

| Profile       | Extra containers              | Purpose                          |
|---------------|-------------------------------|----------------------------------|
| `local-llm`   | `ollama` (`127.0.0.1:11434`)  | Self-hosted LLM for the AI service |
| `rag`         | `chromadb` (`127.0.0.1:8000`) | Persistent RAG vector store      |

**Removed / not deployed:** extra app services, per-service Mongo containers, `docker-compose.infrastructure.yml`, extra Dockerfiles under `infrastructure/docker/`, cluster manifests.

### Port binding security

- **Public (host reverse proxy):** admin `:3000`, viber `:3001`
- **Localhost only:** ai `:3002`, MongoDB `:27017`, RabbitMQ `:5672` / management `:15672`, Ollama `:11434`
- Inside the Compose network, services use DNS names (`admin`, `viber`, `ai`, `mongodb`, `rabbitmq`) regardless of host binds.

### Service communication (Docker)

- Admin → RabbitMQ refresh events → Viber (`RABBITMQ_URI`)
- Admin → AI REST (`AI_SERVICE_URL=http://ai:3002`, `AI_SERVICE_TOKEN`)
- Viber → AI over gRPC (`AI_SERVICE_GRPC_HOST=ai`, `AI_SERVICE_GRPC_PORT=50051`; no host publish of 50051)
- Viber → Admin REST (`ADMIN_SERVICE_URL=http://admin:3000`)
- All apps → shared Mongo with distinct `MONGODB_DB_NAME` values

`AI_SERVICE_TOKEN` must be the same value on admin (outbound) and ai (inbound). A mismatch or unset token breaks knowledge-base ingest (401 / 503), not silently.

## Docker Images

Canonical Dockerfiles live under each service directory (repo root is the build context):

```bash
docker build -t vbar-admin:latest -f services/admin/Dockerfile .
docker build -t vbar-viber:latest -f services/viber/Dockerfile .
docker build -t vbar-ai:latest    -f services/ai/Dockerfile .
```

Or via Compose (local builds):

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml build
# or
npm run docker:build
```

Each app service in Compose has both `image: ghcr.io/<owner>/vbar-<service>:${IMAGE_TAG:-latest}` and a `build:` section. Production pulls the image; local development can `up --build`.

## Environment Contract

Use the root `.env` (copy from `.env.example`). Compose and `deploy.sh` read this file. Do not commit `.env`.

### Required for deploy (`deploy.sh` validates these)

| Variable                   | Purpose                                              |
|----------------------------|------------------------------------------------------|
| `MONGO_ROOT_USER`          | MongoDB root username                                |
| `MONGO_ROOT_PASSWORD`      | MongoDB root password                                |
| `RABBITMQ_URI`             | AMQP URI (host/local form; Compose overrides in containers) |
| `RABBITMQ_USER`            | RabbitMQ user (no insecure defaults)                 |
| `RABBITMQ_PASS`            | RabbitMQ password                                    |
| `VIBER_BOT_TOKEN`          | Viber bot token                                      |
| `VIBER_BOT_WEBHOOK_URL`    | Public HTTPS webhook URL                             |
| `ADMIN_SERVICE_TOKEN`      | Service-to-service token                             |
| `VIBER_SERVICE_TOKEN`      | Service-to-service token                             |
| `SERVICE_TOKEN`            | Shared inbound service token                         |
| `JWT_SECRET`               | Admin JWT signing secret (≥32 chars)                 |
| `BOT_TOKEN_ENCRYPTION_KEY` | Bot token encryption key                             |
| `AI_MODEL_PROVIDER`        | `ollama` \| `openai` \| `anthropic` \| `google`      |

### Other important variables

| Variable | Notes |
|----------|--------|
| `IMAGE_TAG` | Image tag to pull (`latest` locally; CI sets git SHA) |
| `MONGODB_URI` / `MONGODB_DB_NAME` | Host/local npm; Compose injects per-service URIs and DB names (`admin_service`, `bot`, `ai`) |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | Used when provider is Ollama; Compose defaults `OLLAMA_BASE_URL` to `http://ollama:11434` |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY` | Cloud LLM keys as needed |
| `AI_SERVICE_GRPC_HOST` / `AI_SERVICE_GRPC_PORT` | Set by Compose for viber (`ai` / `50051`) |
| `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Optional JWT TTLs |
| `NEXT_PUBLIC_APP_URL` | Admin public URL |
| `RAG_ENABLED` / `AI_TASK_TYPE` | RAG stays off unless enabled; explicit `AI_TASK_TYPE` wins. See [rag.md](./rag.md) |
| `RAG_VECTOR_STORE_TYPE` | `chroma` (default) or `memory`. `mongodb` is rejected |
| `CHROMA_URL` | Host: `http://localhost:8000`. Compose sets `http://chromadb:8000` on `ai` |
| `RAG_VECTOR_STORE_COLLECTION` | Chroma collection name (default `embeddings`) |
| `RAG_RETRIEVER_K` / `RAG_SIMILARITY_THRESHOLD` | Retriever count and score filter (defaults 4 / 0.7) |
| `AI_SERVICE_URL` | Admin → AI HTTP base. Host npm: `http://localhost:3002`. Compose sets `http://ai:3002` on `admin` |
| `AI_SERVICE_TOKEN` | Shared ingest token. **Must match** on admin (outbound) and ai (inbound) |
| `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP` | Ingest chunking (defaults 1000 / 200) |
| `INGEST_MAX_URLS` / `INGEST_MAX_FILE_SIZE_MB` | Ingest limits (defaults 20 / 10). Optional `INGEST_URL_TIMEOUT_MS` (default 15000) |

See `.env.example` for the full template (including optional LangSmith vars).

## Local Docker Deployment

```bash
cp .env.example .env
# Edit .env — set strong passwords, tokens, and Viber webhook if testing webhooks

# Build and start the default 5-container stack
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --build
# or: npm run docker:up (after docker:build)

# Logs
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f

# Stop
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

### Health checks

```bash
curl http://localhost:3000/api/health   # admin
curl http://localhost:3001/health       # viber
curl http://localhost:3002/api/health   # ai (localhost only)
```

### Local LLM

```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile local-llm up -d --build
docker exec -it vbar-ollama ollama pull qwen2.5:7b   # or your OLLAMA_MODEL
```

Set `AI_MODEL_PROVIDER=ollama` and matching `OLLAMA_MODEL` in `.env`.

## Production Deployment (VPS)

### One-time VPS setup

1. Install Docker Engine + Compose plugin.
2. Clone the repo to a fixed path (e.g. `~/vbar-viber-bot`).
3. Create `.env` from `.env.example` and fill production secrets. Set `NODE_ENV=production`.
4. Log in to GHCR on the VPS so `docker compose pull` can fetch private/org images if needed:
   ```bash
   echo "$GHCR_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
   ```
5. Put a reverse proxy (Caddy recommended) in front of admin `:3000` and viber `:3001` with automatic TLS.
6. Point `VIBER_BOT_WEBHOOK_URL` / optional `PUBLIC_URL` at the proxy’s HTTPS domain (Viber requires a valid public HTTPS webhook).

### Deploy / update

```bash
# CI normally sets IMAGE_TAG to the git SHA; manual:
IMAGE_TAG=<sha-or-latest> bash deploy.sh
```

`deploy.sh`:

1. Validates `.env` and required variables
2. `docker compose pull`
3. `docker compose up -d` (no build)
4. Checks admin and viber health endpoints

### Reverse proxy (Caddy example)

```caddyfile
admin.example.com {
  reverse_proxy localhost:3000
}

bot.example.com {
  reverse_proxy localhost:3001
}
```

Use the bot hostname in `VIBER_BOT_WEBHOOK_URL` (e.g. `https://bot.example.com/webhook/viber`).

### Managing Mongo / RabbitMQ on the VPS

Ports are bound to `127.0.0.1`. Use an SSH tunnel:

```bash
# RabbitMQ management UI
ssh -L 15672:127.0.0.1:15672 user@vps

# MongoDB
ssh -L 27017:127.0.0.1:27017 user@vps
```

Then open `http://localhost:15672` or connect a Mongo client to `localhost:27017`.

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy.yml`

On push to `main` (or `workflow_dispatch`):

1. Build `admin`, `viber`, and `ai` images (repo root context, each service Dockerfile).
2. Push to GHCR as `ghcr.io/<owner>/vbar-<service>:<sha>` and `:latest`.
3. SSH to the VPS, set `IMAGE_TAG=<sha>` in server `.env`, run `deploy.sh`.

### Repo secrets

| Secret           | Purpose                                      |
|------------------|----------------------------------------------|
| `DEPLOY_HOST`    | VPS hostname / IP                            |
| `DEPLOY_USER`    | SSH user                                     |
| `DEPLOY_SSH_KEY` | Private key for SSH                          |
| `DEPLOY_PATH`    | Optional path to the repo on the VPS         |

The application `.env` is **not** stored in CI; it lives only on the server.

## Database

### Shared MongoDB

One `mongodb` container with root auth from `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD`.

Compose injects:

- admin: `.../admin_service?authSource=admin`, `MONGODB_DB_NAME=admin_service`
- viber: `.../bot?authSource=admin`, `MONGODB_DB_NAME=bot`
- ai: `.../ai?authSource=admin`, `MONGODB_DB_NAME=ai`

Databases are created on first write. Volume: `vbar-mongodb-data`.

### Migrating from old per-service Mongo volumes

If you previously ran separate containers (`vbar-mongodb-admin-data`, `vbar-mongodb-bot-data`, `vbar-mongodb-ai-data`):

1. `mongodump` each old volume via a temporary `mongo:7` container mounted to that volume.
2. Start the new shared `mongodb` stack.
3. `mongorestore --db admin_service|bot|ai` into the new instance (with root credentials).
4. Verify app login / bot / AI data, then remove old volumes.

Do not automate this blindly on production without a backup.

## Message Queue

- Image: `rabbitmq:3-management-alpine`
- Credentials: `RABBITMQ_USER` / `RABBITMQ_PASS` (required; no `admin/admin` fallback)
- Apps use `RABBITMQ_URI` (not `RABBITMQ_URL`)
- Primary use today: admin → viber cache-refresh events
- AI does not connect to the broker
- Management UI: `127.0.0.1:15672` via SSH tunnel

## Optional Profiles

```bash
# Local Ollama
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile local-llm up -d

# RAG / Chroma (does not change the default 5-container stack)
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile rag up -d
```

Cloud LLM providers do not need the `local-llm` profile; set `AI_MODEL_PROVIDER` and the matching API key in `.env`.

Chroma starts only with `--profile rag`. The `ai` service does not `depends_on` Chroma. If RAG is on and Chroma is down, AI logs `CHROMA_URL` and that `--profile rag` is required, then falls back to the simple chain. See [rag.md](./rag.md).

## Related Documentation

- [Setup Guide](./setup.md) — local development
- [Architecture Documentation](./architecture.md) — system design
- [API Documentation](./api.md) — API contracts
- [Databases](./databases.md) — Mongo databases and collections
- [RAG](./rag.md) — how RAG is implemented and enabled
