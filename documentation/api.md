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
| Viber → Admin | RabbitMQ | `analytics.step-usage` (`StepUsageEvent`) |
| Admin → AI | REST + `X-Service-Token` | Knowledge-base ingest / sources, prompt-template CRUD, keyboard-builder generate, and carousel-builder generate (`AI_SERVICE_TOKEN`) |
| Viber → AI | gRPC | `AIProcessingService.ProcessMessage` (`promptName` from `step.aiPromptName`) |
| Viber → Admin | REST | Content fetch, `POST /api/broadcasts/claim`, `PATCH /api/broadcasts/:id/progress` |

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

`AI_SERVICE_TOKEN` must be the same value on admin (outbound proxy) and ai (inbound ingest, prompts, keyboard-builder, and carousel-builder). A mismatch returns `401 UNAUTHORIZED` from AI; an unset token on either side returns `503`.

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

**DTO fields:** `id`, `avatarURL`, `botName`, `botViberName`, `status`, `buttonsBackground`, `buttonsTextColor`, `buttonsFrame` (`ButtonFrame` \| null), `buttonsPrefix`, `welcomeStepId`, `GAKey`, `createdAt`, `updatedAt`.

### Steps / messages / keyboards / carousels

Standard CRUD; mutations publish `viber.refresh` so viber reloads its cache. There is no `botId` query or body field.

| Resource | List / create | By id |
|----------|---------------|--------|
| Steps | `GET/POST /api/steps` | `GET/PUT/DELETE /api/steps/:id` |
| Messages | `GET/POST /api/messages` | `GET/PUT/DELETE /api/messages/:id` |
| Keyboards | `GET/POST /api/keyboards` | `GET/PUT/DELETE /api/keyboards/:id` |
| Carousels | `GET/POST /api/carousels` | `GET/PUT/DELETE /api/carousels/:id` |
| Broadcasts | `GET/POST /api/broadcasts` | `GET/PUT/DELETE /api/broadcasts/:id` (DELETE cancels a scheduled broadcast) |

List endpoints support pagination and resource-specific filters (see route handlers). Content routes use `route → service → repository` (`MessageService` / `KeyboardService` / `StepService` / `CarouselService` / `BroadcastService`). List pagination is returned **inside** `data` (`{ messages, total, page, limit, totalPages }`); the shared `ApiResponse.meta` field is unused.

Step create/update also accept `aiPromptName`, `customHandler` (`"example"`), and `responseHandler` (`"example"` \| `"locationHandler"`). `content` may be empty when `customHandler` is set.

Keyboard list filters: `hidden`, `isBroadcast`, `isTemplate`, `search`. Create/update bodies accept `isTemplate` (boolean, default `false`). A keyboard with `isTemplate: true` is a starter for new keyboards only (admin copies `Buttons` in the create form; no live link). Viber fetches `GET /api/keyboards?hidden=false&isTemplate=false`. Step and keyboard-message pickers use the same `isTemplate=false` filter.

### Carousels

Reusable Viber rich-media carousels. Cards are the editor source of truth; the service flattens them into a Viber-shaped `Buttons` array on create/update.

| Method | Endpoint | Description | Query / Body |
|--------|----------|-------------|--------------|
| GET | `/api/carousels` | List carousels (filters: `hidden`, `isTemplate`, `search`) | `page`, `limit` |
| POST | `/api/carousels` | Create carousel | `humanReadableName`, `Cards[]`, `BgColor?`, `ButtonsGroupColumns?`, `ButtonsGroupRows?`, `hidden?`, `isTemplate?` |
| GET | `/api/carousels/:id` | Get carousel | |
| PUT | `/api/carousels/:id` | Update carousel (partial) | same fields as create |
| DELETE | `/api/carousels/:id` | Delete carousel | |

Notes:
- `humanReadableName` and a non-empty `Cards` array are required on create.
- On create/update the service validates cards and computes the flattened, Viber-shaped `Buttons` array stored alongside `Cards`. Clients send `Cards`; they do not send `Buttons`.
- Mutations publish a refresh event with `dataType: "carousels"`.
- `isTemplate: true` is a starter for new carousels only (same idea as keyboard templates). Viber fetches `GET /api/carousels?hidden=false&isTemplate=false`.
- Messages of type `rich-media` use content `{ "carousel": { "id": "<carouselId>" } }`. Viber resolves that ID from its carousel cache, converts the stored `Buttons` via `CarouselConverter`, and sends `Message.RichMedia` (`min_api_version` ≥ 7).

### Knowledge Base (thin proxy to AI)

Same paths as the AI service under `/api/knowledge-base/*`. JWT via existing middleware. Routes forward to AI with `X-Service-Token`; admin stores no knowledge-base data.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/knowledge-base/files` | multipart `files` (≤10 × ≤10 MB, `.pdf` / `.md` / `.txt` / `.xlsx`) | `IngestResult` |
| `POST` | `/api/knowledge-base/urls` | `{ "urls": string[] }` (≤20) | `IngestResult` |
| `GET` | `/api/knowledge-base/sources` | — | `KnowledgeSource[]` |
| `DELETE` | `/api/knowledge-base/sources/:id` | — | `{ "deleted": true }` |
| `DELETE` | `/api/knowledge-base/sources` | — | `{ "cleared": true }` |

Proxy-only error codes (admin, before the call reaches AI): `AI_SERVICE_NOT_CONFIGURED` (503, token unset on admin), `AI_SERVICE_UNAVAILABLE` (502, AI unreachable). AI error codes are passed through unchanged.

### Prompts (thin proxy to AI)

Same paths as the AI service under `/api/prompts/*`. JWT via existing middleware. Routes forward to AI with `X-Service-Token`; admin stores no prompt documents (they live in `ai.prompt_templates`).

| Method | Path | Body / query | Returns |
|--------|------|--------------|---------|
| `GET` | `/api/prompts` | `?taskType=simple\|rag\|custom` | `PromptDTO[]` |
| `POST` | `/api/prompts` | `{ name, template, taskType, description?, isActive? }` | `PromptDTO` (201) |
| `GET` | `/api/prompts/:name` | — | `PromptDTO` |
| `PUT` | `/api/prompts/:name` | `{ template?, taskType?, description?, isActive? }` | `PromptDTO` |
| `DELETE` | `/api/prompts/:name` | — | `{ "deleted": true }` |

`name` is 1–64 chars `[a-zA-Z0-9_-]` and immutable after create. Simple templates must not contain `{placeholders}`; RAG templates must include exactly `{context}` and `{question}`. Setting `isActive: true` deactivates the other template of the same `taskType`.

Same proxy-only error codes as knowledge-base. AI error codes: `PROMPTS_NOT_CONFIGURED` (503), `UNAUTHORIZED` (401), `PROMPT_VALIDATION` (400), `PROMPT_NOT_FOUND` (404), `PROMPT_CONFLICT` (409), `PROMPT_FAILED` (500).

### Broadcasts

Schedule a cached step send to test Viber IDs or all subscribed users. Admin owns the document; viber’s `BroadcastWorker` claims and reports progress. `route → BroadcastService → BroadcastRepository`. Create/update publish `viber.refresh` with `dataType: "broadcasts"` (nudge, not a cache reload). DELETE **cancels** a `scheduled` broadcast and returns the DTO (`200`), not 204.

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| `GET` | `/api/broadcasts` | JWT or service token | Pagination inside `data` |
| `POST` | `/api/broadcasts` | JWT or service token | `{ name, stepId, sendToAll?, testViberIds?, scheduledAt? }`. Omitted `scheduledAt` = send now. Step must exist and not be hidden. `testViberIds` required when `sendToAll` is false. |
| `GET` | `/api/broadcasts/:id` | JWT or service token | |
| `PUT` | `/api/broadcasts/:id` | JWT or service token | Same body as create. Only while `status === "scheduled"`. |
| `DELETE` | `/api/broadcasts/:id` | JWT or service token | Cancel scheduled only. History is kept (`status: "canceled"`). |
| `POST` | `/api/broadcasts/claim` | JWT or service token | `{ instanceId }`. Atomic claim of one due or stale (`BROADCAST_STALE_MS`, default 5 min) broadcast. Returns `{ broadcast: BroadcastDTO \| null }`. |
| `PATCH` | `/api/broadcasts/:id/progress` | JWT or service token | `BroadcastProgressUpdate`: `{ instanceId, totalCount?, successCount, failedList, status?: "finished"\|"failed", errorMessage?, lastProcessedId? }`. Rejected if the caller lost the lock. |

`BroadcastDTO` fields: `id`, `name`, `stepId`, `sendToAll`, `testViberIds`, `scheduledAt`, `status` (`scheduled` \| `sending` \| `finished` \| `failed` \| `canceled`), `totalCount`, `successCount`, `failedList`, `startedAt`, `finishedAt`, `lockedBy`, `lastProcessedId`, `createdAt`, `updatedAt`. Stored `errorMessage` / lock timestamps are not on the DTO.

### AI keyboard builder (thin proxy to AI)

`POST /api/ai/keyboard-builder` → AI `POST /api/keyboard-builder/generate`. JWT via existing middleware. Admin adds `X-Service-Token` when forwarding and stores nothing — the browser holds `history` and resends it on each turn. Before forwarding, the proxy overwrites `availableSteps` with the live step catalog from `lib/aiBuilderContext.ts` (up to 200 steps including hidden, 15 min in-process TTL). Contract types live in `@vbar/shared` (`types/ai.ts`). AI-side rules: [ai.md](./ai.md#keyboard-builder).

**Request:** `{ description: string, history?: AiChatTurn[], templateButtons?: KeyboardDraftButton[], buttonDefaults?: { TextColor, BgColor, Frame }, currentDraft?: KeyboardDraft, availableSteps?: AvailableStep[] }`

**Response:** `{ data: { draft, missingFields, summary, assistantMessage } }` — `draft` matches `CreateKeyboardInput` (without `DefaultHeight`); blank required values are listed in `missingFields`. Assistant turns in `history` must be the previous `assistantMessage`. `buttonDefaults` is the current Bot Settings button theme (`resolveButtonColors` / `resolveButtonFrame`); unspecified colors/frame on **newly added** buttons use that theme. Buttons already in `currentDraft` / `templateButtons` keep their own colors, frame, and `BgMedia`. A requested background image is `BgMedia` plus `BgMediaType` / `BgMediaScaleType` / `BgLoop`. `currentDraft` is the live form state (may include manual user edits) — when present it is the authoritative base the newest turn refines, taking precedence over drafts in `history` and over `templateButtons`. The admin client sends it whenever the form has a name or at least one button.

Same proxy-only error codes as knowledge-base (`AI_SERVICE_NOT_CONFIGURED` / `AI_SERVICE_UNAVAILABLE`). AI error codes are passed through unchanged.

### Analytics

#### `GET /api/analytics/step-usage`

Step usage statistics aggregated from raw events (`admin_service.stepusageevents`). Session auth required (middleware). `route → AnalyticsService → AnalyticsRepository`.

**Query parameters:**

| Param | Required | Notes |
|-------|----------|--------|
| `startDate` | no | ISO date. Default: 30 days before `endDate` |
| `endDate` | no | ISO date. Default: now |

**Success `200`:**

```json
{
  "data": {
    "totals": [
      {
        "stepId": "…",
        "stepName": "Main menu",
        "triggers": ["menu"],
        "sources": ["trigger"],
        "total": 120,
        "uniqueUsers": 45,
        "lastUsedAt": "2026-09-10T12:00:00.000Z"
      }
    ],
    "daily": [{ "date": "2026-09-10", "count": 34 }],
    "range": { "startDate": "…", "endDate": "…" }
  }
}
```

`totals` are sorted by execution count descending. Deleted steps still appear with `stepName` `"(deleted step)"`. `triggers` are the distinct matched trigger texts from events; welcome/subscribe-only rows have an empty `triggers` array and `sources` of `welcome` / `subscribe`.

**Errors:** `400 VALIDATION_ERROR` — invalid ISO dates, or `startDate` after `endDate`.

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

- Loads bot content from Admin over REST using `ADMIN_SERVICE_URL` + `ADMIN_SERVICE_TOKEN`. Keyboards and carousels are fetched with `hidden=false&isTemplate=false`.
- Calls AI via gRPC (`AI_SERVICE_GRPC_HOST` / `AI_SERVICE_GRPC_PORT`). Sends `promptName` from `step.aiPromptName`; never sends `taskType`.
- Consumes RabbitMQ queue `viber.refresh` (content reload, or `BroadcastWorker` nudge when `dataType === "broadcasts"`).
- Claims broadcasts via `POST /api/broadcasts/claim` and reports via `PATCH /api/broadcasts/:id/progress`.
- Publishes `StepUsageEvent` to RabbitMQ queue `analytics.step-usage` (`AnalyticsPublisher`) after a successful `StepSender.sendStep`.

### Not implemented

- `POST /api/messages/send`
- `GET /api/messages`
- `GET/PUT /api/bot/config`

---

## AI Service API

HTTP port **3002** (Compose: localhost-only). Viber message processing is **gRPC**. Knowledge-base ingest (`/api/knowledge-base/*`), prompt-template CRUD (`/api/prompts/*`), keyboard generation (`POST /api/keyboard-builder/generate`), and carousel generation (`POST /api/carousel-builder/generate`) are **REST**.

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
| POST | /api/knowledge-base/files | multipart `files` (≤10 × ≤10 MB, .pdf/.md/.txt/.xlsx) | `IngestResult` |
| POST | /api/knowledge-base/urls | `{ "urls": string[] }` (≤20) | `IngestResult` |
| GET | /api/knowledge-base/sources | — | `KnowledgeSource[]` |
| DELETE | /api/knowledge-base/sources/:sourceId | — | `{ "deleted": true }` |
| DELETE | /api/knowledge-base/sources | — | `{ "cleared": true }` |

Error codes: `RAG_DISABLED` (503), `INGEST_NOT_CONFIGURED` (503), `UNAUTHORIZED` (401),
`INGEST_VALIDATION` / `INVALID_URLS` / `NO_FILES` (400), `INGEST_FAILED` (500).

Admin proxy: the same paths under the admin service `/api/knowledge-base/*` (JWT auth via middleware).

### Prompt templates (AI service, REST)

All endpoints require the `X-Service-Token` header (`AI_SERVICE_TOKEN`). Responses are `ApiResponse<T>`.

| Method | Path | Body / query | Returns |
|--------|------|--------------|---------|
| `GET` | `/api/prompts` | `?taskType=simple\|rag\|custom` | `PromptDTO[]` |
| `POST` | `/api/prompts` | `{ name, template, taskType, description?, isActive? }` | `PromptDTO` (201) |
| `GET` | `/api/prompts/:name` | — | `PromptDTO` |
| `PUT` | `/api/prompts/:name` | `{ template?, taskType?, description?, isActive? }` | `PromptDTO` |
| `DELETE` | `/api/prompts/:name` | — | `{ "deleted": true }` |

```typescript
interface PromptDTO {
  name: string;
  template: string;
  taskType: "simple" | "rag" | "custom";
  variables: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Error codes: `PROMPTS_NOT_CONFIGURED` (503), `UNAUTHORIZED` (401), `PROMPT_VALIDATION` (400), `PROMPT_NOT_FOUND` (404), `PROMPT_CONFLICT` (409), `PROMPT_FAILED` (500).

Admin proxy: the same paths under the admin service `/api/prompts/*` (JWT). See [Prompts (thin proxy to AI)](#prompts-thin-proxy-to-ai).

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

For `.xlsx`, `items[].chunks` equals the number of data rows (header excluded; one row = one chunk). Free-text files still use the character splitter, so `chunks` is not a row count. Limits, row-based chunking, and Maps-link enrichment: [rag.md](./rag.md).

### Keyboard builder (AI service, REST)

`POST /api/keyboard-builder/generate`. Requires `X-Service-Token` (`AI_SERVICE_TOKEN`). Responses are `ApiResponse<GenerateKeyboardResult>`. The service is stateless: the client holds `history` and sends it on every turn. Architecture and normalization rules: [ai.md](./ai.md#keyboard-builder).

Admin proxy: `POST /api/ai/keyboard-builder` (JWT). See [AI keyboard builder (thin proxy to AI)](#ai-keyboard-builder-thin-proxy-to-ai).

#### `POST /api/keyboard-builder/generate`

**Request body:**

```json
{
  "description": "Main menu in Bulgarian with buttons Цени, Локации and Контакти",
  "history": [
    { "role": "user", "content": "previous description" },
    { "role": "assistant", "content": "<assistantMessage from the previous response>" }
  ],
  "templateButtons": [],
  "buttonDefaults": {
    "TextColor": "#000000",
    "BgColor": null,
    "Frame": { "BorderWidth": 1, "BorderColor": "#000000", "CornerRadius": 10 }
  },
  "currentDraft": {
    "humanReadableName": "My menu (AI)",
    "title": null,
    "InputFieldState": "hidden",
    "BgColor": null,
    "Buttons": []
  },
  "availableSteps": [{ "name": "Welcome", "triggers": ["welcome", "start"] }]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `description` | yes | Newest user message: full description (first turn) or a refinement. Max 4000 characters. |
| `history` | no | Prior turns, client-held. Assistant `content` must be the previous `assistantMessage`. |
| `templateButtons` | no | Starting layout (first turn only; ignored when `history` or `currentDraft` is present). |
| `buttonDefaults` | no | Admin-resolved bot-settings theme (`TextColor`, `BgColor`, `Frame`). |
| `currentDraft` | no | Live form state (may include manual user edits). Authoritative base for the newest turn — takes precedence over drafts in `history` and over `templateButtons`. |
| `availableSteps` | no | `{ name, triggers[] }[]`. Admin `POST /api/ai/keyboard-builder` and `/api/ai/carousel-builder` attach the live step list (up to 200, including hidden) before forwarding. Direct AI callers may send it; the AI service does not load steps. |

**Success `200`:**

```json
{
  "data": {
    "draft": {
      "humanReadableName": "",
      "title": null,
      "InputFieldState": "hidden",
      "BgColor": null,
      "Buttons": [
        {
          "Columns": 2,
          "Rows": 1,
          "Text": "Цени",
          "TextColor": "#000000",
          "BgColor": null,
          "ActionType": "reply",
          "ActionBody": "",
          "OpenURLType": "internal",
          "Frame": null
        }
      ]
    },
    "missingFields": [
      "Keyboard name (required)",
      "Button \"Цени\": reply text (ActionBody)"
    ],
    "summary": "Клавиатура с 3 бутона…",
    "assistantMessage": "{\"humanReadableName\":\"\",\"title\":null,…}"
  }
}
```

`draft` matches admin `CreateKeyboardInput` (admin adds `DefaultHeight`). Unknown required values (`humanReadableName`, reply / open-url `ActionBody`) are `""` and listed in `missingFields`. JSON reply buttons set `isJson: true` and `ActionBody` to `{"trigger":"...","<prop>":"..."}`; a missing `trigger` is listed as `JSON trigger (ActionBody.trigger)`. A button background image is `BgMedia` (`BgMediaType` `picture` | `gif`, `BgMediaScaleType` `fit` | `crop` | `fill`, `BgLoop`) — URLs are never invented. Unspecified colors/frame on new buttons use `buttonDefaults`; existing `currentDraft` / `templateButtons` buttons keep their own styles and media. Append `assistantMessage` as the next `history` assistant turn.

Error codes: `KEYBOARD_BUILDER_VALIDATION` (400), `UNAUTHORIZED` (401), `KEYBOARD_BUILDER_BAD_AI_OUTPUT` (502), `KEYBOARD_BUILDER_NOT_CONFIGURED` (503), `KEYBOARD_BUILDER_FAILED` (500).

### Carousel builder (AI service, REST)

`POST /api/carousel-builder/generate`. Requires `X-Service-Token` (`AI_SERVICE_TOKEN`). Responses are `ApiResponse<GenerateCarouselResult>`. The service is stateless: the client holds `history` and sends it on every turn. Architecture and normalization rules: [ai.md](./ai.md#carousel-builder).

Admin proxy: `POST /api/ai/carousel-builder` (JWT). Same thin-proxy pattern as the keyboard builder: attaches `availableSteps` and forwards `buttonDefaults`. See [admin.md](./admin.md#ai-carousel-builder).

#### `POST /api/carousel-builder/generate`

**Request body:**

```json
{
  "description": "Карусел с карти Пица и Паста, всяка с бутон Поръчай",
  "history": [
    { "role": "user", "content": "previous description" },
    { "role": "assistant", "content": "<assistantMessage from the previous response>" }
  ],
  "currentDraft": {
    "humanReadableName": "Food menu (AI)",
    "BgColor": null,
    "ButtonsGroupColumns": 6,
    "ButtonsGroupRows": 7,
    "Cards": []
  },
  "ctaDefaults": {
    "textColor": "#FFFFFF",
    "bgColor": "#7360F2",
    "Frame": null
  },
  "buttonDefaults": {
    "TextColor": "#000000",
    "BgColor": null,
    "Frame": null
  },
  "availableSteps": [{ "name": "Welcome", "triggers": ["welcome", "start"] }]
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `description` | yes | Newest user message: full description (first turn) or a refinement. Max 4000 characters. |
| `history` | no | Prior turns, client-held. Assistant `content` must be the previous `assistantMessage`. |
| `currentDraft` | no | Live form state (may include manual user edits). Authoritative base for the newest turn — takes precedence over drafts in `history`. |
| `ctaDefaults` | no | Admin-resolved bot-settings CTA theme (`textColor`, `bgColor`, `Frame` via `resolveCtaColors` / `resolveButtonFrame`). Applied only to newly added structured CTAs. |
| `buttonDefaults` | no | Admin-resolved keyboard button theme (`TextColor`, `BgColor`, `Frame` via `resolveButtonColors` / `resolveButtonFrame`). Applied only to newly added custom Buttons. The admin carousel proxy forwards this field. |
| `availableSteps` | no | `{ name, triggers[] }[]`. Admin `POST /api/ai/keyboard-builder` and `/api/ai/carousel-builder` attach the live step list (up to 200, including hidden) before forwarding. Direct AI callers may send it; the AI service does not load steps. |

**Success `200`:**

```json
{
  "data": {
    "draft": {
      "humanReadableName": "",
      "BgColor": null,
      "ButtonsGroupColumns": 6,
      "ButtonsGroupRows": 7,
      "Cards": [
        {
          "mode": "custom",
          "image": null,
          "title": "",
          "titleColor": "#323232",
          "description": "",
          "descriptionColor": "#777777",
          "textRows": 2,
          "ctaButtons": [],
          "Buttons": [
            {
              "Columns": 6,
              "Rows": 6,
              "Text": "Пица",
              "TextColor": "#000000",
              "BgColor": null,
              "ActionType": "none",
              "ActionBody": "",
              "OpenURLType": "internal",
              "Silent": true,
              "isJson": false,
              "Frame": null
            },
            {
              "Columns": 6,
              "Rows": 1,
              "Text": "Поръчай",
              "TextColor": "#000000",
              "BgColor": null,
              "ActionType": "reply",
              "ActionBody": "",
              "OpenURLType": "internal",
              "Silent": true,
              "isJson": false,
              "Frame": null
            }
          ]
        }
      ]
    },
    "missingFields": [
      "Carousel name (required)",
      "Card \"Пица\", button \"Поръчай\": reply text (ActionBody)"
    ],
    "summary": "Карусел с 2 карти…",
    "assistantMessage": "{\"humanReadableName\":\"\",\"BgColor\":null,…}"
  }
}
```

`draft` matches admin `CarouselForm` state. New cards default to `mode: "custom"` with a `Buttons[]` grid that must fill `ButtonsGroupRows` exactly. Structured cards (`image` / title / description / `ctaButtons`) are used when the user asks for that layout, or when an existing `currentDraft` card is already structured. A custom-card background image is `Buttons[].BgMedia` (`BgMediaType` `picture` | `gif`, `BgMediaScaleType` `fit` | `crop` | `fill`, `BgLoop`) — not card-level `image`. Unknown required values (`humanReadableName`, reply / open-url bodies) are `""`, unknown images / `BgMedia` are `null`, and all are listed in `missingFields`. Image URLs are never invented. Unspecified colors/frame on **newly added custom Buttons** use `buttonDefaults`, then `#000000` / `null`. Unspecified colors/frame on **newly added structured CTAs** use `ctaDefaults`, then `#FFFFFF` / `#7360F2` / `null`. Existing `currentDraft` cards (matched by title, first button text, or image) keep their mode, colors, frame, media, and custom `Columns` / `Rows`. Flattening `Cards` → `Buttons` stays on the admin server (`CardFlattener`) at save time. Append `assistantMessage` as the next `history` assistant turn.

Error codes: `CAROUSEL_BUILDER_VALIDATION` (400), `UNAUTHORIZED` (401), `CAROUSEL_BUILDER_BAD_AI_OUTPUT` (502), `CAROUSEL_BUILDER_NOT_CONFIGURED` (503), `CAROUSEL_BUILDER_FAILED` (500).

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
| `analytics.step-usage` | `analytics.step-usage` | Viber (`AnalyticsPublisher`) | Admin (`startStepUsageConsumer` via `src/instrumentation.ts`) |

**Payload** (`RefreshEvent` in `@vbar/shared`):

```typescript
interface RefreshEvent {
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "carousels" | "bot_settings" | "broadcasts";
}
```

**Payload** (`StepUsageEvent` in `@vbar/shared`):

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

Durable queue, persistent messages. Viber asserts/binds the analytics queue on first publish so events are retained if admin is down. Admin persists each event in `admin_service.stepusageevents`. A refresh event with `dataType: "broadcasts"` does not reload the content cache — viber’s `RefreshConsumer` calls `BroadcastWorker.triggerPoll()`.

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
  string taskType = 6; // "simple" | "rag" | "custom" (optional)
  string promptName = 7; // per-step prompt override (optional)
}

message ProcessMessageResponse {
  string response = 1;
}
```

**Client:** Viber (`AiServiceGrpcClient`).  
There is no separate intent-detection RPC.

**Task type vs RAG:** if `taskType` is set on the request (or `AI_TASK_TYPE` is set in the environment), that value wins. Else if `promptName` is set, the named template’s `taskType` is used. Otherwise `RAG_ENABLED=true` selects the RAG chain. Viber always omits `taskType` and sends `promptName` from `step.aiPromptName`. Ingest, prompts, and builders are REST, not gRPC. See [rag.md](./rag.md).

---

## Shared Contracts

Import from `@vbar/shared`:

- `ApiResponse<T>`, `PaginationParams`, `HealthCheckResponse`
- `RefreshEvent`, `MessageQueueName`, `MessageQueueEvent`
- Admin content DTOs: `StepDTO`, `MessageDTO`, `KeyboardDTO`, `ButtonDTO`, `CarouselDTO`, `CarouselCardDTO`, `CarouselCtaDTO`, `BroadcastDTO`, `BroadcastProgressUpdate`, `User`
- AI↔admin builder contracts (`types/ai.ts`): `AiChatTurn`, `AvailableStep`, `KeyboardDraft`, `KeyboardDraftButton`, `KeyboardButtonDefaults`, `GenerateKeyboardInput`, `GenerateKeyboardResult`, `CarouselDraft`, `CarouselDraftCard`, `CarouselCtaDefaults`, `GenerateCarouselInput`, `GenerateCarouselResult` — implemented by AI, consumed by admin; not mirrored per service

Admin application input types (`CreateMessageInput`, etc.) live on the domain services and are re-exported to the client through `entities/*/model/types.ts`.

---

## Related documentation

- [Setup](./setup.md)
- [Deployment](./deployment.md)
- [Architecture](./architecture.md)
- [Admin service](./admin.md)
- [Viber service](./viber.md)
- [AI service](./ai.md)
- [Databases](./databases.md)
