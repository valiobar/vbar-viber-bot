# API Documentation

Only endpoints and queues that exist in the working tree are documented.

## Table of Contents

1. [Overview](#overview)
2. [Admin Service API](#admin-service-api)
3. [Viber Service API](#viber-service-api)
4. [AI Service API](#ai-service-api)
5. [Message Queue](#message-queue)
6. [gRPC](#grpc)
7. [Shared Contracts](#shared-contracts)

---

## Overview

### Communication

| Path | Protocol | Notes |
|------|----------|--------|
| Browser → Admin | REST + JWT | Next.js App Router |
| Viber platform → Viber | HTTPS webhook | `POST/GET /webhook/viber` |
| Admin → Viber | RabbitMQ | `viber.refresh` cache invalidation |
| Admin → AI | REST + `X-Service-Token` | Knowledge-base ingest / sources (`AI_SERVICE_TOKEN`) |
| Viber → AI | gRPC | `AIProcessingService.ProcessMessage` |
| Viber → Admin | REST | Content fetch with service token |

### Base URLs (local / Compose)

| Service | HTTP | Other |
|---------|------|--------|
| Admin | `http://localhost:3000` | — |
| Viber | `http://localhost:3001` | — |
| AI | `http://127.0.0.1:3002` | gRPC `ai:50051` (Compose network; not published to host) |

Production: reverse proxy (e.g. Caddy) terminates TLS in front of admin `:3000` and viber `:3001`. See [deployment.md](./deployment.md).

### Authentication

**Admin JWT** (CMS routes except health/login):

```http
Authorization: Bearer <access_token>
```

Login uses `username` + `password` (not email).

**Service tokens** (viber outbound to admin; admin outbound to AI):

```http
X-Service-Token: <token>
```

Configured via `SERVICE_TOKEN`, `ADMIN_SERVICE_TOKEN`, `VIBER_SERVICE_TOKEN`, and `AI_SERVICE_TOKEN` (see `.env.example`).

`AI_SERVICE_TOKEN` must be the same value on admin (outbound proxy) and ai (inbound ingest). A mismatch returns `401 UNAUTHORIZED` from AI; an unset token on either side returns `503`.

### Response envelope

Shared type `ApiResponse<T>` from `@vbar/shared`:

```typescript
interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

### Pagination query params

`page` (default 1), `limit` (default 10, max typically 100).

---

## Admin Service API

Port **3000**. Auth middleware protects CMS routes; `POST /api/auth/login` and `GET /api/health` are public.

### Auth

#### `POST /api/auth/login`

**Body:** `{ "username": "string", "password": "string" }`

**Success:** `data` with access/refresh tokens and user summary.

#### `POST /api/auth/logout`

Requires JWT. Invalidates session.

#### `POST /api/auth/refresh`

**Body:** refresh token payload as implemented by the refresh route. Returns a new access token.

### Health

#### `GET /api/health`

Returns service health including Mongo connectivity (`HealthCheckResponse`-shaped).

### Bot settings (singleton — the only config API)

| Method | Path |
|--------|------|
| `GET` | `/api/bot-settings` |
| `PUT` | `/api/bot-settings` |

Update publishes a `viber.refresh` event (`dataType: bot_settings` when applicable). This is the config viber consumes.

**DTO fields:** `id`, `avatarURL`, `botName`, `botViberName`, `status`, `buttonsBackground`, `buttonsTextColor`, `buttonsPrefix`, `welcomeStepId`, `GAKey`, `createdAt`, `updatedAt`.

### Steps / messages / keyboards

Standard CRUD; mutations publish `viber.refresh` so viber reloads its cache. There is no `botId` query or body field.

| Resource | List / create | By id |
|----------|---------------|--------|
| Steps | `GET/POST /api/steps` | `GET/PUT/DELETE /api/steps/:id` |
| Messages | `GET/POST /api/messages` | `GET/PUT/DELETE /api/messages/:id` |
| Keyboards | `GET/POST /api/keyboards` | `GET/PUT/DELETE /api/keyboards/:id` |

List endpoints support pagination and resource-specific filters (see route handlers). Content routes use `route → service → repository` (`MessageService` / `KeyboardService` / `StepService`).

Keyboard list filters: `hidden`, `isBroadcast`, `isTemplate`, `search`. Create/update bodies accept `isTemplate` (boolean, default `false`). A keyboard with `isTemplate: true` is a starter for new keyboards only (admin copies `Buttons` in the create form; no live link). Viber fetches `GET /api/keyboards?hidden=false&isTemplate=false`. Step and keyboard-message pickers use the same `isTemplate=false` filter.

### Knowledge Base (thin proxy to AI)

Same paths as the AI service under `/api/knowledge-base/*`. JWT via existing middleware. Routes forward to AI with `X-Service-Token`; admin stores no knowledge-base data.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/knowledge-base/files` | multipart `files` (≤10 × ≤10 MB, `.pdf` / `.md` / `.txt`) | `IngestResult` |
| `POST` | `/api/knowledge-base/urls` | `{ "urls": string[] }` (≤20) | `IngestResult` |
| `GET` | `/api/knowledge-base/sources` | — | `KnowledgeSource[]` |
| `DELETE` | `/api/knowledge-base/sources/:id` | — | `{ "deleted": true }` |
| `DELETE` | `/api/knowledge-base/sources` | — | `{ "cleared": true }` |

Proxy-only error codes (admin, before the call reaches AI): `AI_SERVICE_NOT_CONFIGURED` (503, token unset on admin), `AI_SERVICE_UNAVAILABLE` (502, AI unreachable). AI error codes are passed through unchanged.

### Not implemented (do not call)

- `/api/users/*`
- `/api/config`

---

## Viber Service API

Port **3001**.

### Health

#### `GET /health`

Checks MongoDB and RabbitMQ. Returns JSON status.

#### `GET /`

Service stub (`service` / `status`).

### Webhooks

#### `GET /webhook/viber`

Webhook verification / challenge handling.

#### `POST /webhook/viber`

Viber events. Requires a public HTTPS URL (`VIBER_BOT_WEBHOOK_URL`).

### Outbound / internal

- Loads bot content from Admin over REST using `ADMIN_SERVICE_URL` + `ADMIN_SERVICE_TOKEN`.
- Calls AI via gRPC (`AI_SERVICE_GRPC_HOST` / `AI_SERVICE_GRPC_PORT`).
- Consumes RabbitMQ queue `viber.refresh`.

### Not implemented

- `POST /api/messages/send`
- `GET /api/messages`
- `GET/PUT /api/bot/config`

---

## AI Service API

HTTP port **3002** (Compose: localhost-only). Viber message processing is **gRPC**. Knowledge-base ingest is **REST** (`/api/knowledge-base/*`).

### Health

#### `GET /api/health`

Mongo + AI provider. No message-queue component (AI does not connect to RabbitMQ). Public — no service token.

#### `GET /`

Service stub.

### Knowledge Base (AI service, REST)

All endpoints require the `X-Service-Token` header (`AI_SERVICE_TOKEN`).
Responses are `ApiResponse<T>`: `{ "data": ... }` or `{ "error": { "code", "message" } }`.

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | /api/knowledge-base/files | multipart `files` (≤10 × ≤10 MB, .pdf/.md/.txt) | `IngestResult` |
| POST | /api/knowledge-base/urls | `{ "urls": string[] }` (≤20) | `IngestResult` |
| GET | /api/knowledge-base/sources | — | `KnowledgeSource[]` |
| DELETE | /api/knowledge-base/sources/:sourceId | — | `{ "deleted": true }` |
| DELETE | /api/knowledge-base/sources | — | `{ "cleared": true }` |

Error codes: `RAG_DISABLED` (503), `INGEST_NOT_CONFIGURED` (503), `UNAUTHORIZED` (401),
`INGEST_VALIDATION` / `INVALID_URLS` / `NO_FILES` (400), `INGEST_FAILED` (500).

Admin proxy: the same paths under the admin service `/api/knowledge-base/*` (JWT auth via middleware).

**`IngestResult`:**

```typescript
{
  items: { source: string; status: "success" | "error"; chunks?: number; sourceId?: string; error?: string }[];
  totalChunks: number;
}
```

**`KnowledgeSource`:**

```typescript
{
  sourceId: string;
  source: string;
  sourceType: string; // "file" | "url"
  chunkCount: number;
  ingestedAt: string;
}
```

Processing is synchronous on the request. Limits and chunk metadata: [rag.md](./rag.md).

### Not implemented (REST)

- `POST /api/ai/process`
- `POST /api/ai/batch-process`
- `POST /api/ai/detect-intent`

Use gRPC `ProcessMessage` instead.

---

## Message Queue

**Exchange:** `viber-bot` (topic, durable) — asserted by services that connect.

### Live path

| Queue | Routing key | Publisher | Consumer |
|-------|-------------|-----------|----------|
| `viber.refresh` | `viber.refresh` | Admin (`publishRefreshEvent`) | Viber (`RefreshConsumer`) |

**Payload** (`RefreshEvent` in `@vbar/shared`):

```typescript
interface RefreshEvent {
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "bot_settings";
}
```

### Named in shared types but unused

`MessageQueueName` also lists `viber.messages`, `ai.processed`, `admin.config`. No active publish/consume wiring for these.

---

## gRPC

### AI — `packages/shared/proto/ai_service.proto`

**Service:** `ai.AIProcessingService`  
**Host (Compose):** `ai:50051`

```protobuf
rpc ProcessMessage(ProcessMessageRequest) returns (ProcessMessageResponse);

message ProcessMessageRequest {
  string messageContent = 1;
  string messageType = 2;
  string userId = 3;
  string stepId = 4;
  UserProfile userProfile = 5;
  string taskType = 6; // "simple" | "rag" | "custom"
}

message ProcessMessageResponse {
  string response = 1;
}
```

**Client:** Viber (`AiServiceGrpcClient`).  
There is no separate intent-detection RPC.

**Task type vs RAG:** if `taskType` is set on the request (or `AI_TASK_TYPE` is set in the environment), that value wins. Otherwise `RAG_ENABLED=true` selects the RAG chain. Ingest and source management are REST (`/api/knowledge-base/*`), not gRPC. See [rag.md](./rag.md).

---

## Shared Contracts

Import from `@vbar/shared`:

- `ApiResponse<T>`, `PaginationParams`, `HealthCheckResponse`
- `RefreshEvent`, `MessageQueueName`, `MessageQueueEvent`
- Admin content DTOs: `StepDTO`, `MessageDTO`, `KeyboardDTO`, `ButtonDTO`, `User`

Admin application input types (`CreateMessageInput`, etc.) live on the domain services and are re-exported to the client through `entities/*/model/types.ts`.

---

## Related documentation

- [Setup](./setup.md)
- [Deployment](./deployment.md)
- [Architecture](./architecture.md)
- [Databases](./databases.md)
