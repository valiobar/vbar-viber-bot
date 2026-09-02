# System Architecture

Accurate as of Phases 2–4. Three app services (admin, viber, ai), one Viber bot per deployment, one shared MongoDB, one RabbitMQ used for cache refresh.

## Table of Contents

1. [Overview](#overview)
2. [Services](#services)
3. [Admin layering](#admin-layering)
4. [Databases](#databases) — summary; full collection/field list in [databases.md](./databases.md)
5. [Communication](#communication)
6. [Shared package](#shared-package)
7. [Infrastructure](#infrastructure)
8. [Diagrams](#diagrams)
9. [Future / not implemented](#future--not-implemented)

## Overview

```
Admin (Next.js :3000)  --REST+JWT / service token-->  CMS APIs
        | publish RefreshEvent
        | REST + X-Service-Token  /api/knowledge-base
        v
RabbitMQ (viber.refresh) --> Viber (Express :3001)
                                | REST (content cache)
                                | gRPC ProcessMessage
                                v
                             AI (Express :3002 + gRPC :50051)
```

Default Compose stack is **5 containers**: `admin`, `viber`, `ai`, `mongodb`, `rabbitmq`. Optional profile `local-llm` adds Ollama. Optional profile `rag` adds Chroma for RAG vectors.

Principles:

- **One bot per deployment.** Singleton `bot-settings` is the config viber consumes.
- **Server:** `route → service → repository`. Routes never contain business logic or inline DB queries. Admin repositories are concrete Mongo classes — do not add a port interface unless a second implementation is real.
- **Admin client:** Feature-Sliced Design (`app → views → widgets → features → entities → shared`).
- **Full Ports & Adapters** only where there are multiple implementations or dense rules (e.g. `AIProviderPort` in ai). Admin does not use ports/adapters/use-cases.

## Services

### Admin (`services/admin`)

Next.js 14 App Router, MongoDB (`admin_service`), RabbitMQ publisher.

- CMS for messages, keyboards, steps, and singleton bot settings
- Knowledge Base page (`/knowledge-base`): upload files, ingest URLs, list / delete / clear sources
- JWT login / refresh / logout
- Service-token access so viber can pull content
- Publishes `viber.refresh` on content mutations
- Thin proxy to AI for knowledge-base ingest (`AI_SERVICE_URL` + `AI_SERVICE_TOKEN`)

**Server** lives in `src/app/api/**`, `src/domains/**`, `src/lib/**`, `src/middleware.ts`. Each domain is a flat folder (`Model` / `Repository` / `Service` / `DTO` / `types` / `index`). Repositories are concrete Mongo classes. Auth is `AuthService` (`login` / `logout` / `refresh`); bot settings is `BotSettingsService` (`get` / `update`).

**Client** is FSD (see [Admin layering](#admin-layering)).

### Viber (`services/viber`)

Express, MongoDB (`bot`), RabbitMQ consumer, Viber webhook.

- `GET/POST /webhook/viber` — Viber events
- `GET /health` — Mongo + RabbitMQ
- In-memory content cache loaded from admin REST (`ADMIN_SERVICE_URL` + service token)
- Step routing; AI steps call gRPC `ProcessMessage`
- Reloads cache when a `RefreshEvent` arrives

Connects to Mongo and RabbitMQ via `@vbar/shared/infra` (`createMongoConnection`, `createQueueChannel`).

### AI (`services/ai`)

Express + gRPC, MongoDB (`ai`). **Does not use RabbitMQ.**

- HTTP `GET /api/health` — Mongo + provider (no message-queue component)
- HTTP `/api/knowledge-base/*` — file / URL ingest and source management (`X-Service-Token`)
- gRPC `AIProcessingService.ProcessMessage` on `:50051` (Compose network only)
- LangChain providers: Ollama, OpenAI, Anthropic, Google
- Per-user conversation history and prompt templates in Mongo (no process-wide shared memory)
- Optional RAG: embeddings live in **Chroma** (Compose profile `rag`), not in the `ai` Mongo database. `memory` is available for tests. Ingest writes chunks into that store.

**RAG precedence:** an explicit `AI_TASK_TYPE` (`simple` / `rag` / `custom`) wins. If `AI_TASK_TYPE` is unset, `RAG_ENABLED=true` selects the RAG chain. `.env.example` still sets `AI_TASK_TYPE=simple`, so `RAG_ENABLED=true` alone will not engage RAG until that var is unset or set to `rag`. The vector store is created only when `RAG_ENABLED=true`; RAG failures fall back to the simple chain. Full flow: [rag.md](./rag.md).

## Admin layering

### Server — `route → service → repository`

```
app/api/messages/route.ts
        → MessageService.list/get/create/update/delete
        → MessageRepository (concrete Mongo class)
```

Same shape for keyboards, steps, bot-settings, and auth. Routes use `withDb`, shared error codes, `parsePagination`, and `notifyRefresh` from `src/lib/api/`. Do not add `ports/in/`, `adapters/`, or `*UseCaseImpl`.

**Deviation — knowledge-base proxy:** `app/api/knowledge-base/*` forwards to the AI service (`lib/aiService.ts` + `X-Service-Token`) and does not use `route → service → repository`. Admin owns no knowledge-base data (vectors live in Chroma behind AI), so there is no admin repository or domain service. Justified as a transport adapter, not a second CMS domain.

Per-domain folder (under `src/domains/<x>/`):

```
<X>.ts             # domain entity class
<X>Model.ts        # mongoose schema + document interface
<X>Repository.ts   # concrete Mongo repository class
<X>Service.ts      # business logic + input/filter/result types
<X>DTO.ts
lib/               # domain helpers (keyboard, bot-settings)
types.ts
index.ts           # public barrel
```

Client entities import server types only from the domain barrel via `import type` (e.g. `import type { MessageDTO } from "@/domains/message"`).

### Client — Feature-Sliced Design

```
app → views → widgets → features → entities → shared
```

| Layer | Role |
|-------|------|
| `app/` | App Router + FSD app layer: thin `page.tsx` wrappers, `layout.tsx` (ThemeProvider, AuthProvider, DashboardLayoutWrapper), `globals.css`, `api/**` |
| `views/` | FSD pages layer (named `views` because Next.js reserves `pages/` and `app/`). One slice per route. |
| `widgets/` | Composite UI: dashboard layout, side menu, list screens |
| `features/` | User actions: forms, filters, auth UI |
| `entities/` | DTO types, client `api/`, presentational `ui/`, Zustand `model/` |
| `shared/` | Pagination, ErrorMessage, theme, `http`, `useResourceList`. Imports no other FSD layer and never `@/domains`. |

Rules:

- A layer imports only from layers strictly below it; slices never import each other.
- Import a slice only through its public `index.ts` (`@/entities/message`).
- The only client files that may reference `@/domains` are `entities/*/model/types.ts`, and only via `import type`.
- Do not recreate root `components/`, `store/`, or `types/` folders.

A new content domain on the client is `entities/<x>` + `features/<x>-manage` + `widgets/<x>-list` + `views/<xs>` (plus create/edit views).

Current content / feature slices:

| Slice | entities | features | widgets | views |
|-------|----------|----------|---------|-------|
| messages | `message` | `message-manage` | `message-list` | `messages` |
| keyboards | `keyboard` | `keyboard-manage` | `keyboard-list` | `keyboards` |
| steps | `step` | `step-manage` | `step-list` | `steps` |
| bot-settings | `bot-settings` | `bot-settings-manage` | — | `settings` |
| knowledge-base | `knowledge-base` | `knowledge-base-ingest` | `knowledge-base-sources` | `knowledge-base` |

Keyboard create/edit (`keyboard-manage` / `KeyboardForm`) can reorder embedded `Buttons` with drag-and-drop from the buttons list and the phone preview. Order is the array sent on POST/PUT; there is no separate order field.

Knowledge-base types are mirrored from the AI inbound port (not `@vbar/shared`). The entity API talks only to admin `/api/knowledge-base/*`.

## Databases

One MongoDB container. Databases appear on first write:

| Service | `MONGODB_DB_NAME` | What is stored |
|---------|-------------------|----------------|
| admin | `admin_service` | Users, sessions, messages, keyboards, steps, singleton bot settings |
| viber | `bot` | Viber users and bot runtime state |
| ai | `ai` | Per-user conversation history and prompt templates. RAG vectors live in Chroma, not Mongo. |

Admin content documents do not have a `botId`. Existing leftover `botId` fields on old documents are ignored.

Collection names, fields, and indexes: [databases.md](./databases.md).

## Communication

| Path | Protocol | Notes |
|------|----------|--------|
| Browser → Admin | REST + JWT | CMS + Knowledge Base UI |
| Viber platform → Viber | HTTPS webhook | `GET/POST /webhook/viber` |
| Viber → Admin | REST + `X-Service-Token` | Content + bot-settings fetch |
| Admin → Viber | RabbitMQ `viber.refresh` | Cache invalidation (`RefreshEvent`) |
| Admin → AI | REST + `X-Service-Token` | Knowledge-base ingest / sources. `AI_SERVICE_TOKEN` must match on both services. |
| Viber → AI | gRPC `:50051` | `ProcessMessage` only |

`RefreshEvent` (`@vbar/shared`):

```typescript
interface RefreshEvent {
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "bot_settings";
}
```

## Shared package

`@vbar/shared` (root barrel) and `@vbar/shared/infra` (Mongo/RabbitMQ helpers — not on the root barrel so Edge middleware can import `ConfigHelper` without mongoose/amqplib).

- **Types:** `common.ts` (`ApiResponse`, `PaginationParams`, `HealthCheckResponse`, `RefreshEvent`, queue names) and `admin.ts` (content DTOs, `User`)
- **Utils:** `Logger` / `ConsoleLogger`, `PathUtils`
- **Config:** `ConfigHelper`, `EnvironmentConfig`, `resolveRootEnvPath`
- **Infra:** `createMongoConnection`, `createQueueChannel` — mandated for new connections in viber/ai. Admin `lib/mongodb.ts` stays Next.js-specific.

## Infrastructure

Compose file: `infrastructure/docker-compose.yml`. Images built in GitHub Actions and pushed to GHCR; a VPS pulls and runs `deploy.sh`. See [deployment.md](./deployment.md).

| Container | Host bind | Role |
|-----------|-----------|------|
| `vbar-admin` | `:3000` | CMS |
| `vbar-viber` | `:3001` | Webhooks |
| `vbar-ai` | `127.0.0.1:3002` | HTTP health; gRPC 50051 internal |
| `vbar-mongodb` | `127.0.0.1:27017` | Shared Mongo |
| `vbar-rabbitmq` | `127.0.0.1:5672` / `:15672` | Refresh events |

Profile `local-llm` adds Ollama on `127.0.0.1:11434`. Set `AI_MODEL_PROVIDER=ollama` and `OLLAMA_BASE_URL=http://ollama:11434` inside Compose.

Profile `rag` adds Chroma on `127.0.0.1:8000`. Compose sets `CHROMA_URL=http://chromadb:8000` on the `ai` service. Default `docker compose up` does not start Chroma. See [rag.md](./rag.md).

## Diagrams

- [architecture.mmd](./diagrams/architecture.mmd)
- [data-flow.mmd](./diagrams/data-flow.mmd)
- [deployment.mmd](./diagrams/deployment.mmd)

## Related documentation

- [API](./api.md)
- [Setup](./setup.md)
- [Deployment](./deployment.md)
- [Databases](./databases.md)
- [RAG](./rag.md)
- Service READMEs under `services/*/README.md`

## Future / not implemented

Material that is **not** in the running stack. Do not treat this appendix as current architecture.

- Archived extra runtime on branch `archive/web3-service` (REST/gRPC, dedicated Mongo). Reintroduce only when a step needs wallets or chain calls.
- Additional messaging platforms (no second messenger service in this repo).
- Multi-bot hosting (removed; singleton bot-settings is the product).
- Admin REST for users/config, Viber REST send/config APIs, AI REST process/intent/batch endpoints (knowledge-base ingest REST is implemented).
- Viber media handlers (picture/video/file/location/contact/sticker/url) are stubbed and will be implemented later — they are not deleted.
- Kubernetes — manifests removed; Compose-on-VPS is the deploy target.
