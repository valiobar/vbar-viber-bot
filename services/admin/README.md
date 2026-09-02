# Admin Service

Next.js application for the Viber bot administrative dashboard.

## Overview

The Admin Service provides a web-based CMS for the Viber bot:

- Login / session (JWT)
- Messages, keyboards, and steps CRUD
- Singleton bot settings
- Knowledge Base page (`/knowledge-base`): upload files, ingest URLs, list / delete / clear sources (thin proxy to AI)
- Health check
- RabbitMQ refresh events so viber reloads its cache

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (`admin_service`)
- **Server**: `route → service → repository`
- **Client**: Feature-Sliced Design (`app → views → widgets → features → entities → shared`)

## Project Structure

```
services/admin/src/
├── app/                         # App Router + FSD app layer
│   ├── api/                     # REST routes (server; not FSD-sliced)
│   ├── layout.tsx               # ThemeProvider, AuthProvider, DashboardLayoutWrapper
│   └── **/page.tsx              # Thin default-export wrappers → views
├── views/                       # FSD pages layer (one slice per route)
├── widgets/                     # Layout, side menu, list screens
├── features/                    # Forms, filters, auth UI
├── entities/                    # DTO types, client api/, presentational ui/, stores
├── shared/                      # Pagination, theme, http, useResourceList
├── domains/                     # Server: flat per-domain folders
│   └── <x>/                     # Model / Repository / Service / DTO / types / index
│                                # Repositories are concrete Mongo classes (no ports)
├── lib/                         # mongodb, auth, api helpers, refresh publisher
└── middleware.ts
```

Client import rules: slices only through `index.ts`; the only `@/domains` imports on the client are `entities/*/model/types.ts` (`import type`). Do not add root `components/`, `store/`, or `types/` folders.

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB instance running

### Installation

1. Install dependencies from the root:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp ../../.env.example ../../.env
   # Edit the repo-root .env (single system config)
   ```

3. Configure environment variables in `.env`:
   - `MONGODB_URI`: MongoDB connection string
   - `MONGODB_DB_NAME`: Database name (Compose: `admin_service`)

### Development

Run the development server:

```bash
npm run dev
# or from root:
npm run dev:admin
```

The application will be available at `http://localhost:3000`.

### Build

Build for production:

```bash
npm run build
# or from root:
npm run build:admin
```

### Start Production Server

```bash
npm start
```

## Environment Variables

| Variable                  | Description                                                                        | Default                             |
| ------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `NODE_ENV`                | Node environment                                                                   | `development`                       |
| `NEXT_PUBLIC_APP_URL`     | Public app URL                                                                     | `http://localhost:3000`             |
| `MONGODB_URI`             | MongoDB connection string                                                          | `mongodb://localhost:27017`         |
| `MONGODB_DB_NAME`         | MongoDB database name                                                              | `admin_service`                     |
| `VIBER_SERVICE_URL`       | Viber service URL                                                                  | `http://localhost:3001`             |
| `AI_SERVICE_URL`          | AI service URL                                                                     | `http://localhost:3002`             |
| `LOG_LEVEL`               | Logging level                                                                      | `info`                              |
| `SERVICE_TOKEN`           | General service token for service-to-service authentication                        | -                                   |
| `VIBER_SERVICE_TOKEN`     | Viber service specific token (should match `ADMIN_SERVICE_TOKEN` in viber service) | -                                   |
| `AI_SERVICE_TOKEN`        | AI ingest token — **must match** `AI_SERVICE_TOKEN` on the AI service               | -                                   |
| `RABBITMQ_URI`            | RabbitMQ connection URI for refresh notifications                                  | `amqp://admin:admin@localhost:5672` |

### Service Token Authentication

The admin service supports service-to-service authentication using service tokens. API routes that accept JWT tokens (for admin UI users) also accept service tokens (for service-to-service communication).

**Service Token Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging and identification

**Service Token Configuration**:

- Service tokens are configured via environment variables
- Multiple tokens can be configured for different services
- Tokens should be long, random strings (recommended: 64 hex characters)
- Generate tokens using: `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Routes Supporting Service Tokens**:

- `/api/bot-settings` (GET)
- `/api/steps` (GET)
- `/api/messages` (GET)
- `/api/keyboards` (GET)
- All other `/api/*` routes that require authentication

## API Endpoints

### Health Check

- **GET** `/api/health`
- Returns service health status and database connection status

### Knowledge Base (proxy)

JWT-protected thin proxy to the AI service (`AI_SERVICE_URL` + `X-Service-Token`). Admin stores no knowledge-base data.

| Method | Path |
|--------|------|
| `POST` | `/api/knowledge-base/files` |
| `POST` | `/api/knowledge-base/urls` |
| `GET` | `/api/knowledge-base/sources` |
| `DELETE` | `/api/knowledge-base/sources/:id` |
| `DELETE` | `/api/knowledge-base/sources` |

UI: `/knowledge-base` — upload ≤10 files (≤10 MB, `.pdf` / `.md` / `.txt`), paste ≤20 URLs, list sources, delete one, or clear all. Ingest is synchronous (a large batch can take 30–60 s). `AI_SERVICE_TOKEN` must match the value on AI.

## Bot Data Refresh Notification

The admin service automatically notifies all viber service instances when bot data changes. This ensures that all viber service instances stay synchronized.

### How It Works

When steps, messages, keyboards, or bot-settings are created, updated, or deleted:

1. The admin service publishes a refresh event to RabbitMQ
2. All viber service instances consume the event
3. Each instance refreshes its in-memory cache

### Configuration

**Environment Variables**:

- `RABBITMQ_URI` - RabbitMQ connection URI (default: `amqp://admin:admin@localhost:5672`)

### Dependencies

- RabbitMQ must be running and accessible
- Viber service instances must be running and connected to RabbitMQ

### Error Handling

- If RabbitMQ publish fails, the error is logged but doesn't affect the main operation
- Refresh notifications use fire-and-forget pattern (non-blocking)

## Database

The Admin Service uses MongoDB (`admin_service`) with users, sessions, messages, keyboards, steps, and singleton bot settings.

## Shared Package

```typescript
import { User, ApiResponse, RefreshEvent, ConfigHelper } from "@vbar/shared";
```

Admin's `lib/mongodb.ts` stays Next.js-specific (build guard, seed, indexes). Viber/ai use `@vbar/shared/infra` for connections.

## Docker

The service includes a multi-stage Dockerfile for containerization.

Build the Docker image:

```bash
docker build -t vbar-admin -f services/admin/Dockerfile .
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Deployment Guide](../../documentation/deployment.md)
- [Setup Guide](../../documentation/setup.md)
