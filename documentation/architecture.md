# System Architecture

Accurate against the current working tree. Three app services (admin, viber, ai), one Viber bot per deployment, one shared MongoDB, one RabbitMQ used for cache refresh, step-usage analytics, and broadcast “send now” nudges. Admin: [admin.md](./admin.md). Viber: [viber.md](./viber.md). AI: [ai.md](./ai.md).

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
        | publish RefreshEvent  (content + broadcasts)
        | consume analytics.step-usage  (instrumentation hook)
        | REST + X-Service-Token  /api/knowledge-base
        | REST + X-Service-Token  /api/prompts
        | REST + X-Service-Token  POST /api/keyboard-builder/generate
        | REST + X-Service-Token  POST /api/carousel-builder/generate
        v
RabbitMQ
  viber.refresh          --> Viber (Express :3001)  cache reload
                             (dataType: broadcasts → BroadcastWorker.poll)
  analytics.step-usage   <-- Viber StepSender / AnalyticsPublisher
                                | REST (content cache + broadcast claim/progress)
                                | gRPC ProcessMessage
                                v
                             AI (Express :3002 + gRPC :50051)
```

Default Compose stack is **6 containers**: `admin`, `viber`, `ai`, `mongodb`, `rabbitmq`, `chromadb`. Optional profile `local-llm` adds Ollama.

Principles:

- **One bot per deployment.** Singleton `bot-settings` is the config viber consumes.
- **Server:** `route → service → repository`. Routes never contain business logic or inline DB queries. Admin repositories are concrete Mongo classes — do not add a port interface unless a second implementation is real.
- **Admin client:** Feature-Sliced Design (`app → views → widgets → features → entities → shared`).
- **Full Ports & Adapters** only where there are multiple implementations or dense rules (e.g. `AIProviderPort` in ai). Admin does not use ports/adapters/use-cases.

## Services

### Admin (`services/admin`)

Next.js 14 App Router, MongoDB (`admin_service`), RabbitMQ publisher **and** consumer.

- CMS for messages, keyboards, carousels, steps, broadcasts, and singleton bot settings
- Knowledge Base page (`/knowledge-base`): upload files, ingest URLs, list / delete / clear sources
- Prompts page (`/prompts`): CRUD for AI prompt templates (thin proxy to AI)
- Broadcasts page (`/broadcasts`): schedule a step send to test Viber IDs or all subscribers
- Analytics page (`/analytics`): step-usage totals and daily activity (last 30 days by default)
- Public locations map (`/locations`): pharmacy catalog from `@vbar/shared/locations` (no JWT)
- JWT login / refresh / logout
- Service-token access so viber can pull content and claim/report broadcasts
- Publishes `viber.refresh` on content mutations and broadcast create/update (`dataType: "broadcasts"`)
- Consumes `analytics.step-usage` via the Next.js instrumentation hook (`src/instrumentation.ts`, `experimental.instrumentationHook`) and persists events in `admin_service.stepusageevents`
- Thin proxy to AI for knowledge-base ingest, prompt templates, and keyboard / carousel-builder generate (`AI_SERVICE_URL` + `AI_SERVICE_TOKEN`)

**Server** lives in `src/app/api/**`, `src/domains/**`, `src/lib/**`, `src/instrumentation.ts`, `src/middleware.ts`. Each domain is a flat folder (`Model` / `Repository` / `Service` / `DTO` / `types` / `index`). Repositories are concrete Mongo classes. Auth is `AuthService` (`login` / `logout` / `refresh`); bot settings is `BotSettingsService` (`get` / `update`). Analytics is `AnalyticsService` (`getStepUsageStats`). Broadcasts are `BroadcastService` (`list` / `get` / `create` / `update` / `cancel` / `claim` / `reportProgress`).

**Client** is FSD (see [Admin layering](#admin-layering)).

### Viber (`services/viber`)

Express, MongoDB (`bot`), RabbitMQ consumer, Viber webhook.

- `GET/POST /webhook/viber` — Viber events
- `GET /health` — Mongo + RabbitMQ
- In-memory content cache loaded from admin REST (`ADMIN_SERVICE_URL` + service token)
- Cache fetch/refresh order: steps → messages + keyboards (in parallel) → carousels (after messages, because rich-media content holds carousel IDs)
- `StepSender` resolves `rich-media` messages via `BotDataService.getCarouselById`, converts with `CarouselConverter`, injects `content.richMedia`, then `MessageConverter` builds `Message.RichMedia` (`min_api_version` ≥ 7)
- Step routing; AI steps call gRPC `ProcessMessage`
- Reloads the full in-memory cache (`refreshAllData`, including carousels) when a content `RefreshEvent` arrives. `dataType: "broadcasts"` does **not** reload the cache — it nudges `BroadcastWorker.poll()`
- `BroadcastWorker` polls admin (`POST /api/broadcasts/claim`), sends via Viber `pa/broadcast_message`, and reports progress (`PATCH /api/broadcasts/:id/progress`)
- Publishes fire-and-forget `StepUsageEvent` messages (`AnalyticsPublisher`) when `StepSender.sendStep` succeeds (trigger / welcome / subscribe; broadcasts and AI turns are not tracked)

Connects to Mongo and RabbitMQ via `@vbar/shared/infra` (`createMongoConnection`, `createQueueChannel`).

### AI (`services/ai`)

Express + gRPC, MongoDB (`ai`). **Does not use RabbitMQ.**

- HTTP `GET /api/health` — Mongo + provider (no message-queue component)
- HTTP `/api/knowledge-base/*` — file / URL ingest and source management (`X-Service-Token`)
- HTTP `/api/prompts/*` — prompt-template CRUD (`X-Service-Token`); one active template per `taskType`
- HTTP `POST /api/keyboard-builder/generate` — keyboard draft from a description (`X-Service-Token`)
- HTTP `POST /api/carousel-builder/generate` — carousel draft from a description (`X-Service-Token`)
- gRPC `AIProcessingService.ProcessMessage` on `:50051` (Compose network only); optional `promptName` is the per-step override
- LangChain providers: Ollama, OpenAI, Anthropic, Google, DeepSeek (`AI_MODEL_PROVIDER`)
- Per-user conversation history and prompt templates in Mongo (no process-wide shared memory)
- Optional RAG: embeddings live in **Chroma** (`vbar-chromadb`, always started), not in the `ai` Mongo database. `memory` is available for tests. Ingest writes chunks into that store.

**RAG / chain precedence:** an explicit `taskType` on the gRPC request, then env `AI_TASK_TYPE`, then the named prompt’s `taskType` (`step.aiPromptName` → `prompt_templates.taskType`) when no explicit type is set, then `RAG_ENABLED=true` selects RAG. `.env.example` still sets `AI_TASK_TYPE=simple`, so `RAG_ENABLED=true` alone will not engage RAG until that var is unset or set to `rag`. The vector store is created only when `RAG_ENABLED=true`; RAG failures fall back to the simple chain. Full flow: [rag.md](./rag.md).

## Admin layering

### Server — `route → service → repository`

```
app/api/messages/route.ts
        → MessageService.list/get/create/update/delete
        → MessageRepository (concrete Mongo class)
```

Same shape for keyboards, carousels, steps, broadcasts, bot-settings, auth, and analytics. Routes use `withDb`, shared error codes, `parsePagination`, and `notifyRefresh` from `src/lib/api/`. Do not add `ports/in/`, `adapters/`, or `*UseCaseImpl`.

**Deviation — AI proxies:** `app/api/knowledge-base/*`, `app/api/prompts/*`, `POST /api/ai/keyboard-builder`, and `POST /api/ai/carousel-builder` forward to the AI service (`lib/aiService.ts` + `X-Service-Token`). Keyboard / carousel proxies attach `availableSteps` from `lib/aiBuilderContext.ts` (StepService.list behind a 15 min in-process TTL) and still persist nothing — not a second CMS domain. Admin owns no knowledge-base data (vectors live in Chroma behind AI) and does not persist prompts or AI drafts, so there is no admin repository or domain service for those. Justified as transport adapters.

Per-domain folder (under `src/domains/<x>/`):

```
<X>.ts             # domain entity class
<X>Model.ts        # mongoose schema + document interface
<X>Repository.ts   # concrete Mongo repository class
<X>Service.ts      # business logic + input/filter/result types
<X>DTO.ts
lib/               # domain helpers (keyboard, carousel, bot-settings)
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
| carousels | `carousel` | `carousel-manage` | `carousel-list` | `carousels` (+ create/edit) |
| steps | `step` | `step-manage` | `step-list` | `steps` |
| bot-settings | `bot-settings` | `bot-settings-manage` | — | `settings` |
| knowledge-base | `knowledge-base` | `knowledge-base-ingest` | `knowledge-base-sources` | `knowledge-base` |
| prompts | `prompt` | `prompt-manage` | `prompt-list` | `prompts` |
| broadcasts | `broadcast` | `broadcast-manage` | `broadcast-list` | `broadcasts` |
| analytics | `analytics` | — | `step-usage-stats` | `analytics` |
| locations | `location` | — | `location-map` | `locations` (public `/locations`) |

Keyboard create/edit (`keyboard-manage` / `KeyboardForm`) can reorder embedded `Buttons` with drag-and-drop from the buttons list and the phone preview. Order is the array sent on POST/PUT; there is no separate order field. Create mode (`/keyboards/new`) also has “Create with AI”: a right-side chat panel (`shared/ui/AiChatDrawer` + `shared/lib/useAiChat`, phases in `KeyboardAiChat`) that squeezes the form instead of overlaying it and hydrates the form from a draft. The draft is never auto-saved.

Carousel create/edit (`carousel-manage` / `CarouselForm`) edits a list of cards (`structured` or `custom`). The client sends `Cards`; `CarouselService` flattens and validates them into stored `Buttons`. A `rich-media` message references a carousel by `{ carousel: { id } }` (same attachment pattern as keyboard-type messages).

Knowledge-base types are mirrored from the AI inbound port (not `@vbar/shared`). The entity API talks only to admin `/api/knowledge-base/*`.

## Databases

One MongoDB container. Databases appear on first write:

| Service | `MONGODB_DB_NAME` | What is stored |
|---------|-------------------|----------------|
| admin | `admin_service` | Users, sessions, messages, keyboards, carousels, steps, broadcasts, singleton bot settings, step-usage events |
| viber | `bot` | Viber users and bot runtime state |
| ai | `ai` | Per-user conversation history and prompt templates. RAG vectors live in Chroma, not Mongo. |

Admin content documents do not have a `botId`. Existing leftover `botId` fields on old documents are ignored.

Collection names, fields, and indexes: [databases.md](./databases.md).

## Communication

| Path | Protocol | Notes |
|------|----------|--------|
| Browser → Admin | REST + JWT | CMS + Knowledge Base + Prompts + Broadcasts + Analytics UI. `/locations` is public (no JWT). |
| Viber platform → Viber | HTTPS webhook | `GET/POST /webhook/viber` |
| Viber → Admin | REST + `X-Service-Token` | Content + bot-settings fetch; `POST /api/broadcasts/claim` and `PATCH /api/broadcasts/:id/progress` |
| Admin → Viber | RabbitMQ `viber.refresh` | Cache invalidation (`RefreshEvent`). `dataType: "broadcasts"` nudges the worker instead of reloading the cache. |
| Viber → Admin | RabbitMQ `analytics.step-usage` | Step usage events (`StepUsageEvent`); admin consumer started from `src/instrumentation.ts` |
| Admin → AI | REST + `X-Service-Token` | Knowledge-base ingest / sources, prompt-template CRUD, and keyboard / carousel-builder generate. Keyboard / carousel proxies attach a request-scoped `availableSteps` catalog; AI does not read admin Mongo. `AI_SERVICE_TOKEN` must match on both services. |
| Viber → AI | gRPC `:50051` | `ProcessMessage` only (`promptName` from `step.aiPromptName`) |

`RefreshEvent` (`@vbar/shared`):

```typescript
interface RefreshEvent {
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "carousels" | "bot_settings" | "broadcasts";
}
```

`StepUsageEvent` (`@vbar/shared`):

```typescript
interface StepUsageEvent {
  type: "step_usage";
  stepId: string;
  userId: string;
  source: "trigger" | "welcome" | "subscribe";
  trigger?: string;
  customHandler?: string | null;
  timestamp: string;
}
```

Admin persists consumed events in `admin_service.stepusageevents` (100-day TTL). The dashboard reads aggregates via `GET /api/analytics/step-usage`.

## Shared package

`@vbar/shared` (root barrel), `@vbar/shared/infra` (Mongo/RabbitMQ helpers), and `@vbar/shared/locations` (pharmacy catalog + nearby algorithm). Infra and locations are **not** on the root barrel so Next.js Edge middleware can import `ConfigHelper` without mongoose, amqplib, or the locations JSON.

- **Types:** `common.ts` (`ApiResponse`, `PaginationParams`, `HealthCheckResponse`, `RefreshEvent`, `StepUsageEvent`, queue names), `admin.ts` (content DTOs, `User`, `BroadcastDTO` / `BroadcastProgressUpdate`, custom-handler name constants), and `ai.ts` (AI↔admin builder contract: `AiChatTurn`, `AvailableStep`, `KeyboardDraft`, `GenerateKeyboardInput`, `GenerateKeyboardResult`, … — used by `services/ai` and `services/admin`, not mirrored per service). Prompt CRUD types live on the AI inbound port and are mirrored in admin `entities/prompt` (not `@vbar/shared`).
- **Utils:** `Logger` / `ConsoleLogger`, `PathUtils`
- **Config:** `ConfigHelper`, `EnvironmentConfig`, `resolveRootEnvPath`
- **Infra:** `createMongoConnection`, `createQueueChannel` — mandated for new connections in viber/ai. Admin `lib/mongodb.ts` stays Next.js-specific.
- **Locations:** `@vbar/shared/locations` — `Location` / `LatLng` types, `getNearbyLocations` / `haversineKm`, `getDestinationUrl`, and `locations.json`. Admin `/locations` and viber `locationHandler` import this subpath. Regenerate the catalog with `services/admin/scripts/geocode-locations.mjs` (writes `packages/shared/src/locations/locations.json`).

## Infrastructure

Compose file: `infrastructure/docker-compose.yml`. Images built in GitHub Actions and pushed to GHCR; a VPS pulls and runs `deploy.sh`. See [deployment.md](./deployment.md).

| Container | Host bind | Role |
|-----------|-----------|------|
| `vbar-admin` | `:3000` | CMS |
| `vbar-viber` | `:3001` | Webhooks |
| `vbar-ai` | `127.0.0.1:3002` | HTTP health; gRPC 50051 internal |
| `vbar-mongodb` | `127.0.0.1:27017` | Shared Mongo |
| `vbar-rabbitmq` | `127.0.0.1:5672` / `:15672` | Refresh events and step-usage analytics |
| `vbar-chromadb` | `127.0.0.1:8000` | RAG vector store |

Profile `local-llm` adds Ollama on `127.0.0.1:11434`. Set `AI_MODEL_PROVIDER=ollama` and `OLLAMA_BASE_URL=http://ollama:11434` inside Compose.

Compose sets `CHROMA_URL=http://chromadb:8000` on the `ai` service (not the host `.env` value). See [rag.md](./rag.md).

## Diagrams

- [architecture.mmd](./diagrams/architecture.mmd)
- [data-flow.mmd](./diagrams/data-flow.mmd)
- [deployment.mmd](./diagrams/deployment.mmd)

## Related documentation

- [Admin service](./admin.md) — admin architecture, storage, FSD, auth
- [Viber service](./viber.md) — webhooks, step routing, admin cache, AI gRPC
- [AI service](./ai.md) — AI architecture, chains, consumers, contracts
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
- Admin REST for users/config, Viber REST send/config APIs, AI REST process/intent/batch endpoints (knowledge-base ingest REST and prompt-template REST are implemented).
- Viber media handlers (picture/video/file/location/contact/sticker/url) are stubbed unless a step `responseHandler` handles them (for example `locationHandler`) or the user is on an AI step — they are not deleted.
- Kubernetes — manifests removed; Compose-on-VPS is the deploy target.
