# Viber Service

Runtime for the Viber bot. Accurate against the current working tree. System-wide context: [architecture.md](./architecture.md). HTTP surface: [api.md](./api.md). AI-side processing: [ai.md](./ai.md).

## Table of Contents

1. [Overview](#overview)
2. [Role in the stack](#role-in-the-stack)
3. [Process layout](#process-layout)
4. [Layering](#layering)
5. [Webhook and events](#webhook-and-events)
6. [Step routing](#step-routing)
7. [Communication with Admin](#communication-with-admin)
8. [Communication with AI](#communication-with-ai)
9. [Storage](#storage)
10. [HTTP API](#http-api)
11. [Configuration](#configuration)
12. [Security](#security)
13. [Deployment](#deployment)
14. [Known gaps](#known-gaps)
15. [Related documentation](#related-documentation)

## Overview

The viber service is the only process that talks to the Viber platform. It receives webhook events, keeps each subscriber’s current step in Mongo (`bot`), and sends scripted replies from an in-memory cache of admin content.

It does **not** own conversation copy (admin does) and does **not** call an LLM (AI does). When the user is on a step with `isAi === true`, viber forwards the inbound message to AI over gRPC and sends the returned text back to Viber.

Stack: Node 20, Express, `viber-bot`, MongoDB via `@vbar/shared/infra`, RabbitMQ consumer, `@grpc/grpc-js` client. Port **3001**. Database name **`bot`**.

## Role in the stack

```
Viber platform
    │ HTTPS POST /webhook/viber
    v
Viber :3001
    ├─ Mongo `bot`          subscribers + currentStepId
    ├─ REST + X-Service-Token ──► Admin CMS (steps, messages, keyboards, carousels, bot-settings)
    ├─ RabbitMQ consume `viber.refresh`  (reload in-memory cache)
    ├─ RabbitMQ publish `analytics.step-usage`  (AnalyticsPublisher)
    └─ gRPC ProcessMessage ──► AI :50051
```

One bot per deployment. Singleton `bot-settings` from admin is the config this process consumes (`name`, `avatar`, `welcomeStepId`, `buttonsPrefix`).

## Process layout

One Node process. Entry point: `services/viber/src/index.ts`.

Startup (`initialize()`):

1. Load the monorepo-root `.env` through `resolveRootEnvPath()`, falling back to a local `.env`.
2. Register Express middleware (raw body on `/webhook/viber`, JSON, general rate limit).
3. Connect Mongo (`MONGODB_URI` / `MONGODB_DB_NAME`, default `bot`).
4. Construct `AiServiceGrpcClient` (no connection check — first RPC fails later if AI is down).
5. Connect RabbitMQ.
6. `ViberBotService.initializeBot()` — fetch settings + cache from admin, construct `viber-bot` `Bot`.
7. `registerWebhook()` — call Viber’s `setWebhook` with `VIBER_BOT_WEBHOOK_URL`. Failure is logged; the process stays up.
8. Register event handlers (`Message`, `Subscribe`, `Unsubscribe`, `ConversationStarted`, `Delivery`).
9. Start `RefreshConsumer` on queue `viber.refresh`.
10. `app.listen(PORT)`.

A Mongo or RabbitMQ connection failure at startup is fatal (`process.exit(1)`). A failed admin fetch of steps/messages is not — the bot can start with an empty cache.

Shutdown on `SIGTERM` / `SIGINT`: stop the refresh consumer, close RabbitMQ, close Mongo.

The webhook route is wired **before** generic routes and requires `viberBotService.isInitialized()`. Until then, `POST /webhook/viber` returns `503` / `SVC_003`.

## Layering

Viber uses ports only where there is a real external system (admin HTTP, AI gRPC, user Mongo). There is no DI container.

```
adapters/in/   webhook, health, RefreshConsumer
      │
application/   handlers, ViberBotService, BotDataService, StepSender, ViberAiService
      │
ports/out/     IAdminServiceClient, IAiServiceClient, IUserRepository
      │
adapters/out/  AdminServiceClient, AiServiceGrpcClient, MongooseUserRepository, AnalyticsPublisher
```

| Layer | Path | Contents |
|-------|------|----------|
| Inbound adapters | `src/adapters/in/` | Express routes, webhook middleware, `RefreshConsumer` |
| Application | `src/application/` | Event handlers, `ViberBotService`, `BotDataService`, `StepSender`, converters, `ViberAiService` |
| Domain | `src/domains/user/` | `ViberUser` entity |
| Outbound ports | `src/ports/out/` | `IAdminServiceClient`, `IAiServiceClient`, `IUserRepository` |
| Outbound adapters | `src/adapters/out/` | Admin REST client, `grpc/AiServiceGrpcClient`, mongoose user model/repo, `AnalyticsPublisher` |
| Config | `src/config/` | `viber.ts`, `security.ts` |

Wiring is in `index.ts`: construct the gRPC client, construct `MessageHandler` with that client (required — constructor throws if it is missing).

## Webhook and events

Viber calls `POST /webhook/viber`. The raw body is preserved for HMAC signature checks (`X-Viber-Content-Signature`, secret = bot token). The `viber-bot` middleware then dispatches to registered handlers.

| Event | Handler | What it does |
|-------|---------|--------------|
| `MESSAGE_RECEIVED` | `MessageHandler` | Ensure user exists, optional welcome step, AI or scripted routing |
| Subscribe | `SubscribeHandler` | Mark subscribed, optional welcome step |
| Unsubscribe | `UnsubscribeHandler` | Mark unsubscribed |
| Conversation started | `ConversationStartedHandler` | Profile upsert |
| Delivered / seen | `DeliveryHandler` | Logged only |

`GET /webhook/viber` is the verification endpoint Viber hits when the webhook URL is set.

## Step routing

Scripted replies go through `TextMessageHandler` + `StepSender`.

1. Bot settings supply `buttonsPrefix` (e.g. a hidden prefix on keyboard buttons).
2. If the inbound text contains that prefix, the prefix is stripped.
3. If the remainder is a JSON **object** (admin `isJson` reply buttons): `trigger` is matched against step `trigger` strings (case-insensitive). Every other key is merged into that user’s state (`userRepository.updateState`) **before** the step is sent. Example: `{"trigger":"welcome","click":"now"}` opens the welcome step and sets `click` to `"now"` on the user. A missing or empty `trigger` is logged and no step is sent; the state patch still applies.
4. Otherwise the remainder is matched as a plain trigger string (case-insensitive).
5. The first matching step is sent: resolve message IDs → optional carousel → optional keyboard → `bot.sendMessage`.
6. On success, `user.currentStepId` is updated in Mongo and a `StepUsageEvent` is published (fire-and-forget).

`StepSender` also runs a **custom handler** when `step.customHandler` is set (`application/custom-steps/`). That replaces the normal send path; a successful custom handler still publishes analytics (with `customHandler` set).

**Custom response handlers** (`application/custom-responses/`): when the user is already on a step with `responseHandler` set, `MessageHandler` runs that handler **before** AI and before per-type handlers. Prefixed keyboard taps still go through normal trigger navigation. Names are synced with `CUSTOM_RESPONSE_HANDLER_NAMES` in `@vbar/shared`.

`locationHandler` reads lat/lng from a location message, calls `getNearbyLocations` from `@vbar/shared/locations`, and sends one `rich_media` carousel: up to 3 closest pharmacies (name, address, distance, Google Maps directions via `getDestinationUrl`) plus a **Виж на картата** card that opens the public admin `/locations?lat=&lng=` page. It also attaches the named admin keyboard `"hui"` and a follow-up `Message.Keyboard` so the client replaces the previous keyboard.

**Analytics instrumentation** (`AnalyticsPublisher`): `sendStep` accepts an optional `{ source, trigger? }` context from the call site. Sources:

| Source | Call site | When |
|--------|-----------|------|
| `trigger` | `TextMessageHandler` | Matched step trigger (includes the trigger text) |
| `welcome` | `MessageHandler` | Welcome step on first message |
| `subscribe` | `SubscribeHandler` | Welcome step on subscribe |

Not tracked: broadcasts (`BroadcastSender` does not go through `sendStep`) and AI conversation turns while the user stays on the same `isAi` step (no step transition). Publish failures are logged only — they never block or fail the user-visible send.

Non-text message types (picture, video, file, location, contact, sticker, URL) have dedicated handlers that currently **log only**, unless a custom `responseHandler` handles the message (for example `locationHandler`) or the user is on an AI step (see below).

First message / subscribe: if `bot-settings.welcomeStepId` is set, that step is sent once.

## Communication with Admin

Outbound adapter: `AdminServiceClient` implementing `IAdminServiceClient`.

| Call | Admin route |
|------|-------------|
| Bot settings | `GET /api/bot-settings` |
| Steps | `GET /api/steps` (non-hidden) |
| Messages | `GET /api/messages` |
| Keyboards | `GET /api/keyboards` |
| Carousels | `GET /api/carousels` |

Auth: `X-Service-Token`. Viber sends `ADMIN_SERVICE_TOKEN`, then `VIBER_SERVICE_TOKEN`, then `SERVICE_TOKEN`. Admin accept-lists those plus `AI_SERVICE_TOKEN`.

`BotDataService` holds the result in memory (maps by id and by trigger). Fetch order: steps → messages + keyboards in parallel → carousels (after messages, because rich-media content references carousel IDs).

`RefreshConsumer` binds queue `viber.refresh` and calls `refreshAllData()` so every instance reloads after an admin save. Viber never writes to `admin_service` Mongo.

`AnalyticsPublisher` publishes persistent `StepUsageEvent` messages to the `viber-bot` topic exchange with routing key `analytics.step-usage`. It asserts and binds the durable queue on first publish so events are retained if admin’s consumer is not yet running.

Retries: the REST client uses a 30 s timeout and up to 3 retries with backoff on transient HTTP failures.

## Communication with AI

This is the only path from a user message to an LLM. Viber never calls AI over HTTP and never reads the `ai` database.

### When a message is sent to AI

`MessageHandler.handleMessage` runs **before** the type-specific handlers:

1. Load the user. If `currentStepId` is missing, skip AI.
2. Resolve that step from the in-memory cache (`BotDataService.getStepById`).
3. Call AI only when **all** of these hold:
   - the step exists
   - `step.isAi === true`
   - the message is **not** a prefixed keyboard tap (`buttonsPrefix` present in a text message)

A prefixed tap on an AI step is treated as navigation (leave / switch step), not as a prompt. That is how the user exits an AI step.

If the AI-step check throws, viber logs and continues with normal routing.

### Call stack

```
MessageHandler
  └─ ViberAiService.handleMessage
      └─ IAiServiceClient.processMessage
          └─ AiServiceGrpcClient
              └─ AIProcessingService.ProcessMessage  (ai:50051)
```

| Piece | File | Role |
|-------|------|------|
| Port | `src/ports/out/IAiServiceClient.ts` | `processMessage(...) → { response: string }` |
| Adapter | `src/adapters/out/grpc/AiServiceGrpcClient.ts` | Loads `packages/shared/proto/ai_service.proto`, insecure channel |
| Application | `src/application/services/ViberAiService.ts` | Calls the port, sends `Message.Text` back to the user |
| Proto | `packages/shared/proto/ai_service.proto` | Shared contract with `services/ai` |

The proto is loaded at runtime from the monorepo root (or the copy in the Docker image). The Dockerfile copies `packages/shared/proto` into the runner for that reason.

### Request viber sends

```
ProcessMessageRequest
  messageContent   extracted string (see table below)
  messageType      text | picture | video | file | location | contact | sticker | url
  userId           Viber user id
  stepId           user.currentStepId
  userProfile      { id, name, avatar } when present
  taskType         always omitted today (undefined)
  promptName       step.aiPromptName, or omitted when null
```

`taskType` is on the port and proto (`simple` / `rag` / `custom`) but `MessageHandler` always passes `undefined`. **The AI service environment decides the chain** (`AI_TASK_TYPE` wins, then `RAG_ENABLED`). See [ai.md](./ai.md) chain selection and [rag.md](./rag.md).

`promptName` is the per-step override from admin (`StepDTO.aiPromptName`). It must match a `prompt_templates.name` in the AI Mongo database. `null` means “use the AI service default / active prompt”.

### How non-text messages become `messageContent`

AI receives a string, not Viber binary payloads.

| Viber type | String sent to AI |
|------------|-------------------|
| Text | `message.text` |
| Picture | URL, plus optional ` \| Text: ...` |
| Video | URL + optional text / size / duration |
| File | URL + optional filename / size |
| Location | `latitude,longitude` |
| Contact | `Contact: name (phone)` |
| Sticker | `Sticker ID: …` |
| URL | `message.url` |

Viber does not download files or images for the model. If you need vision or file ingest, that work is not in this path.

### Response and user-visible behaviour

The proto response is a single field: `response` (string). AI also computes `model` and `processingTimeMs` internally; those never reach viber.

`ViberAiService`:

- If `AI_THINKING_GIF_URL` is a non-empty public HTTPS URL, first sends a keyboard-only `Message.Keyboard` (no chat bubble) with one button (6 columns × 2 rows, `BgMediaType: gif`, `ActionType: none`, `InputFieldState: hidden`). SVG is not a valid Viber `BgMediaType`.
- On a non-empty `response`, first tries to parse it as a **carousel directive** (see below); otherwise sends the AI text with the step keyboard restored (converted via `KeyboardConverter` + `buttonsPrefix`). If the step has no keyboard, a dismiss keyboard (`InputFieldState: regular`, one silent `none` button) replaces the GIF.
- On an empty/missing `response`, or on gRPC / network errors: if a thinking keyboard was sent, sends another keyboard-only message with the same restore keyboard so the GIF does not persist. If no thinking keyboard was sent, behaviour is unchanged (log only).
- Errors are still swallowed; the type-specific handler is not run.

There is no deadline on the gRPC call. A hung AI process holds the webhook handler until Node or a proxy times out.

### AI carousel directive

The AI reply is still a single string, but `ViberAiService` interprets a JSON object of this shape as an instruction to render a dynamically generated carousel (`src/application/services/AiCarouselDirective.ts`):

```json
{
  "type": "carousel",
  "text": "optional intro text",
  "cards": [
    {
      "title": "Rila Monastery",
      "description": "10th-century monastery in the Rila mountains",
      "image": "https://example.com/rila.jpg",
      "buttons": [
        { "text": "Open map", "actionType": "open-url", "actionBody": "https://maps.google.com/..." },
        { "text": "Tell me more", "actionType": "reply", "actionBody": "Tell me more about Rila Monastery" }
      ]
    }
  ]
}
```

Behaviour:

- `parseAiCarouselDirective` strips markdown code fences, then requires `type: "carousel"` and at least one renderable card (a card needs a `title` or an `image`; invalid cards/buttons are dropped, max 6 cards). Anything else — including a directive that validates to zero cards — falls back to the plain-text send, so a malformed model answer never silences the bot.
- `buildRichMediaFromCards` emits a `rich_media` payload (`ButtonsGroupColumns: 6`) with a uniform per-card layout: image (3 rows, when any card has one), title, description, then one row per action button — padded with filler cells and capped at Viber's 7-row limit.
- The send is `[optional Message.Text intro] + Message.RichMedia` with the restore keyboard attached to the rich-media message. `min_api_version` is 7 on every send.
- `reply` buttons carry **no** `buttonsPrefix`, so a tap routes the `actionBody` text back to the AI as a normal user message (follow-up questions). `open-url` buttons open the URL. Other action types are not allowed.
- The directive contract and the prompt instructions that produce it are documented in [ai.md](./ai.md).

### Transport and addressing

```
AI_SERVICE_GRPC_HOST   default localhost
AI_SERVICE_GRPC_PORT   default 50051
```

Compose sets `AI_SERVICE_GRPC_HOST=ai`. gRPC **50051 is not published on the host** — only containers on `vbar-network` can reach it. Local `npm run dev:viber` + `npm run dev:ai` works because both bind localhost.

The client uses `grpc.credentials.createInsecure()`. There is **no service token and no TLS** on this hop. Binding 50051 to the Docker network (not `0.0.0.0` on the host) is the only isolation. Details: [ai.md](./ai.md) security notes.

### What viber does not do

- No HTTP calls to `AI_SERVICE_URL` (that variable is for admin → AI ingest).
- No conversation-history reads or writes (AI owns `conversations` in Mongo `ai`).
- No RAG / Chroma / prompt-template CRUD.
- No retry or circuit breaker on `ProcessMessage`.
- No streaming; one request, one text reply.

### Sequence

```
User on step isAi=true
  → POST /webhook/viber
  → MessageHandler (prefix? → scripted step : AI)
  → ViberAiService
      → bot.sendMessage(thinking keyboard only)   # when AI_THINKING_GIF_URL is set
      → AiServiceGrpcClient.ProcessMessage
      → AI ProcessMessageUseCase (history + chain + save)
      → bot.sendMessage(AI text, restored keyboard)
```

## Storage

Mongo database **`bot`**, collection `viberusers` (`ViberUserModel`). Field list: [databases.md](./databases.md).

Viber persists subscribers and `currentStepId` only. Steps, messages, keyboards, carousels, and settings live in admin Mongo and in this process’s memory.

`currentStepId` is what gates AI: it must be the admin step id of an `isAi` step.

## HTTP API

Port **3001**. Full tables in [api.md](./api.md).

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | public (tight rate limit) | Mongo + RabbitMQ ping |
| `GET` | `/` | public | `{ service, status }` |
| `GET` | `/webhook/viber` | Viber verification | Webhook setup |
| `POST` | `/webhook/viber` | Viber signature | Events |

Health in production returns status/timestamp/service only. Dependencies are included in non-production. Health does **not** ping AI gRPC.

Not implemented: `POST /api/messages/send`, REST message history, REST bot config.

## Configuration

Root `.env` (Compose and `deploy.sh`). Relevant keys:

| Variable | Role |
|----------|------|
| `PORT` | HTTP listen (default `3001`) |
| `MONGODB_URI` / `MONGODB_DB_NAME` | Runtime DB; Compose injects `/bot` |
| `RABBITMQ_URI` | Refresh consumer and analytics publisher |
| `VIBER_BOT_TOKEN` | Viber API + webhook HMAC |
| `VIBER_BOT_WEBHOOK_URL` | Public `https://…/webhook/viber` |
| `PUBLIC_URL` | Fallback only: `${PUBLIC_URL}/webhook/viber` if webhook URL is empty |
| `AI_THINKING_GIF_URL` | Optional public HTTPS GIF for the AI thinking keyboard. Empty disables it |
| `ADMIN_SERVICE_URL` | Admin base (Compose: `http://admin:3000`) |
| `ADMIN_SERVICE_TOKEN` / `VIBER_SERVICE_TOKEN` / `SERVICE_TOKEN` | Token sent to admin |
| `AI_SERVICE_GRPC_HOST` / `AI_SERVICE_GRPC_PORT` | AI gRPC (`ai` / `50051` in Compose) |
| `RATE_LIMIT_*` | Optional; webhook default 1000 req/min |

`AI_SERVICE_URL` and `AI_SERVICE_TOKEN` are **not** used by this service.

## Security

- Webhook HMAC (`verifyWebhookSignature`) on the raw body.
- Layered rate limits (general, health, webhook).
- Service token on **outbound** admin calls only.
- AI gRPC is unauthenticated; do not publish `50051`.
- Compose publishes `:3001` on all interfaces. Put a reverse proxy in front and firewall `3001` on the VPS. Mongo and RabbitMQ bind localhost. See [deployment.md](./deployment.md).

## Deployment

Compose service `viber`: image `ghcr.io/valiobar/vbar-viber:${IMAGE_TAG}`, healthcheck `GET /health`, `depends_on` Mongo + RabbitMQ healthy.

Dockerfile is a three-stage Node 20 Alpine build (shared package + viber). Runner user `viber`. Proto files must be in the image.

Production: Caddy (or equivalent) terminates TLS for the bot hostname and proxies to `localhost:3001`. Set `VIBER_BOT_WEBHOOK_URL` to `https://<bot-host>/webhook/viber` — Viber requires public HTTPS.

Local: `npm run dev:viber` plus ngrok (or similar) for the webhook. AI must be reachable at `localhost:50051`.

## Known gaps

- AI failures are silent to the user.
- No gRPC deadline, retry, or health check of AI.
- `taskType` is never sent; RAG/simple is entirely an AI-service env decision.
- Non-text AI inputs are lossy string summaries (URLs, not bytes).
- Picture / video / file / location / contact / sticker / URL handlers do nothing when the user is **not** on an AI step and no custom `responseHandler` is set (`locationHandler` is the exception for location messages).
- `DeliveryHandler` does not persist delivery state.
- Webhook registration failure does not fail startup.
- Custom step handlers are in-repo code (`custom-steps/`), not CMS-editable logic.

## Related documentation

- [Architecture](./architecture.md) — three-service topology
- [Admin service](./admin.md) — CMS and refresh events
- [AI service](./ai.md) — ProcessMessage, chains, prompts
- [RAG](./rag.md) — when retrieval actually runs
- [API](./api.md) — webhook and health
- [Databases](./databases.md) — `bot` / `viberusers`
- [Setup](./setup.md) / [Deployment](./deployment.md)
- Service README: `services/viber/README.md`
