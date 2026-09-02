# Development Setup Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Environment Configuration](#environment-configuration)
4. [Local Development Setup](#local-development-setup)
5. [Development Workflow](#development-workflow)
6. [Service-Specific Notes](#service-specific-notes)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required software

- **Node.js** 18+ (`node --version`)
- **npm** 9+ (`npm --version`)
- **Docker** 20.10+ and **Docker Compose** v2 (`docker compose version`)
- **Git** 2.30+

### System requirements

- macOS, Linux, or Windows (WSL2 recommended)
- 8GB RAM minimum (16GB recommended)
- ~10GB free disk (more if using the `local-llm` Ollama profile)

### Optional tools

- MongoDB Compass
- VS Code / Cursor
- ngrok or similar (for local Viber webhook HTTPS)
- Postman / Insomnia

## Repository Setup

```bash
git clone <repository-url>
cd vbar-viber-bot
npm install
```

Workspaces installed:

- `services/admin`, `services/viber`, `services/ai`
- `packages/shared`

## Environment Configuration

Prefer a **single root `.env`** for Compose, `deploy.sh`, and local npm runs of admin/viber/ai:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

| Variable | Local tip |
|----------|-----------|
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Match what Compose uses for Mongo |
| `RABBITMQ_USER` / `RABBITMQ_PASS` / `RABBITMQ_URI` | Host form uses `localhost:5672` |
| `MONGODB_URI` | `mongodb://USER:PASS@localhost:27017/?authSource=admin` |
| `SERVICE_TOKEN`, `ADMIN_SERVICE_TOKEN`, `VIBER_SERVICE_TOKEN` | Keep in sync across services |
| `AI_SERVICE_TOKEN` | **Must match** on admin (outbound) and ai (inbound) |
| `JWT_SECRET`, `BOT_TOKEN_ENCRYPTION_KEY` | ≥32 characters |
| `VIBER_BOT_TOKEN`, `VIBER_BOT_WEBHOOK_URL` | Needed for real Viber traffic |
| `AI_MODEL_PROVIDER` | `ollama` (local) or a cloud provider + API key |

Compose overrides in-container values (`MONGODB_URI` host → `mongodb`, `RABBITMQ_URI` host → `rabbitmq`, gRPC host `ai`, etc.). Host/local npm keeps the localhost URIs from `.env`.

Optional per-service examples still exist under `services/admin/.env.example` and `services/ai/.env.example` for service-only runs; for the default stack, the root file is enough.

`npm run dev:admin` loads the **repo-root** `.env`. Next.js 14 does not support `envDir`, so `services/admin/next.config.js` applies that file with `dotenv` (same idea as viber/ai `resolveRootEnvPath`). Do not put secrets in `services/admin/.env`.

### Correct env names (do not use the old names)

| Use | Do not use |
|-----|------------|
| `RABBITMQ_URI` | `RABBITMQ_URL` |
| `VIBER_BOT_WEBHOOK_URL` | `VIBER_WEBHOOK_URL` |
| `OLLAMA_BASE_URL` | `OLLAMA_URL` |
| `OLLAMA_MODEL` | `AI_MODEL_NAME` |
| `AI_MODEL_PROVIDER` | — |

## Local Development Setup

### Option 1: Full stack with Docker Compose (recommended for integration)

```bash
cp .env.example .env
# fill secrets

docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --build
```

Default containers: **admin, viber, ai, mongodb, rabbitmq**.

```bash
# Health
curl http://localhost:3000/api/health
curl http://localhost:3001/health
curl http://localhost:3002/api/health

# Logs / stop
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

**Ports:**

| Service | URL |
|---------|-----|
| Admin | http://localhost:3000 |
| Viber | http://localhost:3001 |
| AI | http://localhost:3002 (localhost-only bind) |
| MongoDB | `127.0.0.1:27017` |
| RabbitMQ AMQP / UI | `127.0.0.1:5672` / http://127.0.0.1:15672 |

**Profiles:**

```bash
# Ollama for local LLM
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile local-llm up -d --build
docker exec -it vbar-ollama ollama pull qwen2.5:7b

# Chroma for RAG (optional; default stack stays 5 containers)
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile rag up -d
```

Local RAG: set `RAG_ENABLED=true` and `AI_TASK_TYPE=rag` (or unset `AI_TASK_TYPE` so `RAG_ENABLED` selects the RAG chain). Host npm uses `CHROMA_URL=http://localhost:8000`; Compose sets `http://chromadb:8000` on the `ai` service. See [rag.md](./rag.md).

### Try ingest locally

1. Start Chroma: `docker compose --env-file .env -f infrastructure/docker-compose.yml --profile rag up -d`
2. In `.env` set `RAG_ENABLED=true`, an embedding provider (`RAG_EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`, or Ollama), and the same `AI_SERVICE_TOKEN` on both admin and ai
3. Restart `ai` (and `admin` if tokens changed)
4. Open http://localhost:3000/knowledge-base (log in)
5. Upload a `.pdf` / `.md` / `.txt` or paste up to 20 URLs

Limits: ≤10 files, ≤10 MB each, ≤20 URLs. Ingest is synchronous — a large batch can take 30–60 s. `AI_SERVICE_TOKEN` must match; otherwise the UI shows 401 / 503.

There is no separate `docker-compose.infrastructure.yml`; infrastructure and apps share one compose file.

### Option 2: Infra in Docker, apps via npm

Start only Mongo + RabbitMQ (and optionally Ollama), then run Node processes on the host:

```bash
# Start shared Mongo + RabbitMQ (and optionally profiles)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d mongodb rabbitmq

# Optional local LLM
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile local-llm up -d ollama

# Optional Chroma for RAG
docker compose --env-file .env -f infrastructure/docker-compose.yml --profile rag up -d chromadb
```

In separate terminals:

```bash
npm run dev:admin   # :3000
npm run dev:viber   # :3001
npm run dev:ai      # :3002
```

Ensure root `.env` (or each service env) points `MONGODB_URI` and `RABBITMQ_URI` at `localhost`, and for local AI gRPC from viber set `AI_SERVICE_GRPC_HOST=localhost` and `AI_SERVICE_GRPC_PORT=50051`.

### Database notes

- One Mongo instance; databases `admin_service`, `bot`, and `ai` appear after first writes.
- Admin fails at first DB use if `MONGODB_URI` is unset (no hardcoded credentials).
- Compass / mongosh: `mongodb://MONGO_ROOT_USER:MONGO_ROOT_PASSWORD@localhost:27017/?authSource=admin`

### Message queue notes

- Management UI: http://127.0.0.1:15672 with `RABBITMQ_USER` / `RABBITMQ_PASS`
- Queues are declared by services on startup (admin → viber refresh path)

### Local Viber webhooks

Viber requires a public HTTPS URL. Tunnel port 3001:

```bash
ngrok http 3001
# Set VIBER_BOT_WEBHOOK_URL=https://<ngrok-host>/webhook/viber
```

## Development Workflow

### Workspace layout

```
vbar-viber-bot/
├── services/
│   ├── admin/      # Next.js CMS
│   ├── viber/      # Viber bot
│   └── ai/         # AI / gRPC
├── packages/shared/
├── infrastructure/
│   ├── docker-compose.yml
│   └── docker-compose.override.yml.example
├── .github/workflows/deploy.yml
├── .env.example
├── deploy.sh
└── documentation/
```

### Common scripts

```bash
npm run build          # all workspaces
npm run lint
npm run test

npm run docker:build
npm run docker:up
npm run docker:down
npm run docker:logs
npm run docker:pull
```

### Smoke check after compose up

1. Open admin at http://localhost:3000 and log in / create content.
2. Confirm viber logs a RabbitMQ refresh when admin saves content.
3. Exercise a bot step that calls AI (gRPC to `ai:50051` inside Compose).

## Service-Specific Notes

### Admin (`services/admin`)

- Next.js App Router on port 3000
- Health: `GET /api/health`
- Knowledge Base page: `/knowledge-base` (proxies to AI with `AI_SERVICE_URL` + `AI_SERVICE_TOKEN`)
- Needs `JWT_SECRET`, `BOT_TOKEN_ENCRYPTION_KEY`, `MONGODB_URI`, service tokens
- DB name in Compose: `admin_service`

### Viber (`services/viber`)

- Express on port 3001; must be reachable for webhooks (public or tunnel)
- Health: `GET /health`
- Needs `VIBER_BOT_TOKEN`, `VIBER_BOT_WEBHOOK_URL`, `RABBITMQ_URI`, `ADMIN_SERVICE_*`, `AI_SERVICE_GRPC_*`
- DB name: `bot`

### AI (`services/ai`)

- HTTP `:3002` (localhost bind in Compose) + gRPC `:50051` (Compose network only)
- Health: `GET /api/health`
- Does **not** connect to RabbitMQ
- Providers via `AI_MODEL_PROVIDER`; Ollama vars are `OLLAMA_BASE_URL` / `OLLAMA_MODEL`
- RAG: explicit `AI_TASK_TYPE` wins over `RAG_ENABLED` (see [rag.md](./rag.md))
- Persistent RAG store is Chroma (`RAG_VECTOR_STORE_TYPE=chroma`); start with `--profile rag`
- Knowledge-base ingest: HTTP `/api/knowledge-base/*` (`X-Service-Token` = `AI_SERVICE_TOKEN`)
- DB name: `ai` (conversations + prompt templates only)

## Troubleshooting

### Port in use

```bash
lsof -i :3000
kill -9 <PID>
```

### MongoDB connection

```bash
docker ps | grep vbar-mongodb
docker exec -it vbar-mongodb mongosh -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin
docker logs vbar-mongodb
```

Confirm `MONGODB_URI` includes credentials and `authSource=admin`. Admin has no default URI fallback.

### RabbitMQ connection

```bash
docker ps | grep vbar-rabbitmq
# URI must be RABBITMQ_URI=amqp://USER:PASS@localhost:5672 (host) or ...@rabbitmq:5672 (Compose)
docker logs vbar-rabbitmq
```

### Env vars not loading

1. Root `.env` exists next to `docker-compose.yml`’s `--env-file` / `env_file: ../.env`
2. No spaces around `=`
3. Restart containers / Node process after edits
4. Do not rely on removed names (`RABBITMQ_URL`, `OLLAMA_URL`, etc.)

### npm install / TypeScript

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
cd packages/shared && npm run build
```

### Getting help

1. Service READMEs under `services/*/README.md`
2. [Architecture](./architecture.md)
3. [Databases](./databases.md)
4. [RAG](./rag.md)
5. [Deployment](./deployment.md)
6. Container logs: `npm run docker:logs`

## Next Steps

1. [Architecture Documentation](./architecture.md)
2. [API Documentation](./api.md)
3. [Databases](./databases.md)
4. [RAG](./rag.md)
5. [Deployment Guide](./deployment.md) — GHCR + VPS production path
