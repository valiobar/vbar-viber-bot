# Databases

One MongoDB container (`vbar-mongodb`) hosts three application databases. Each service sets `MONGODB_DB_NAME` and only reads/writes its own database. Databases and collections appear on first write.

RabbitMQ is the refresh event bus, not a database. Mongo’s built-in `admin` database is auth only (`authSource=admin`); it is not the admin service data store.

## Table of Contents

1. [Overview](#overview)
2. [admin_service](#admin_service)
3. [bot](#bot)
4. [ai](#ai)
5. [Chroma](#chroma)
6. [Connection](#connection)
7. [What is not stored](#what-is-not-stored)

## Overview

| Database | Service | Owner | What is stored |
|----------|---------|-------|----------------|
| `admin_service` | admin | CMS | Dashboard users, JWT sessions, messages, keyboards, carousels, steps, broadcasts, singleton bot settings, step-usage events |
| `bot` | viber | Runtime | Viber subscribers and per-user conversation position |
| `ai` | ai | LLM | Per-user chat history and prompt templates only |

Compose injects per-service URIs:

- admin → `.../admin_service?authSource=admin`
- viber → `.../bot?authSource=admin`
- ai → `.../ai?authSource=admin`

Local npm uses the host URI from the root `.env` plus each service’s default `MONGODB_DB_NAME`.

Admin content documents do not have a `botId`. Leftover `botId` fields on old documents are ignored.

Services do not share collections. Viber loads CMS content over admin REST (service token) and keeps it in memory; it does not query `admin_service`.

## admin_service

Used by the admin Next.js service. Seeded on first connect with a default dashboard user if `users` is empty (`username: admin`).

### `users`

Dashboard login accounts (not Viber end users).

| Field | Type | Notes |
|-------|------|--------|
| `username` | string | Unique, lowercase `[a-z0-9_]`, 3–50 chars |
| `email` | string | Unique |
| `passwordHash` | string | bcrypt hash |
| `name` | string | Display name |
| `role` | `"admin"` \| `"user"` \| `"viewer"` | Default `"user"` |
| `lastLoginAt` | Date? | Set on successful login |
| `createdAt` / `updatedAt` | Date | |

Indexes: unique `username`, unique `email`.

### `sessions`

Refresh-token sessions. Mongo TTL deletes a document when `expiresAt` is reached.

| Field | Type | Notes |
|-------|------|--------|
| `userId` | ObjectId | Ref `users` |
| `refreshToken` | string | Unique |
| `expiresAt` | Date | TTL index (`expireAfterSeconds: 0`) |
| `createdAt` / `updatedAt` | Date | |

### `messages`

Reusable Viber message templates. `content` shape depends on `type`.

| Field | Type | Notes |
|-------|------|--------|
| `type` | enum | `text`, `url`, `contact`, `picture`, `video`, `file`, `location`, `sticker`, `rich-media`, `keyboard` |
| `content` | object | Type-specific payload |
| `url` | string \| null | Required when `type` is `url` |
| `humanReadableName` | string | Admin label |
| `hidden` | boolean | Soft-hide from default lists |
| `createdAt` / `updatedAt` | Date | |

Index: `hidden`.

### `keyboards`

Viber keyboards. Buttons are **embedded** in `Buttons` — there is no `buttons` collection.

| Field | Type | Notes |
|-------|------|--------|
| `Type` | string | Default `"keyboard"` |
| `Buttons` | Button[] | At least one. Array index is Viber layout order (left-to-right, 6-column wrap). Admin reorders this array in the keyboard form. Columns/Rows, Text, colors, media, `ActionType` / `ActionBody`, alignment, `Silent`, `isJson` (reply payload is `{"trigger","...props"}` — viber merges extra keys into user state), optional `OpenURLType` + `InternalBrowser` |
| `DefaultHeight` | boolean | |
| `InputFieldState` | `"regular"` \| `"minimized"` \| `"hidden"` | |
| `BgColor` | hex \| null | |
| `hidden` | boolean | |
| `humanReadableName` | string | Admin label |
| `title` | string \| null | |
| `isBroadcast` | boolean | |
| `isTemplate` | boolean | Default `false`. When true, starter-only: buttons are copied into a new keyboard on create. Not attachable to steps/messages. Viber fetches `GET /api/keyboards?hidden=false&isTemplate=false`. |
| `createdAt` / `updatedAt` | Date | |

Indexes: `hidden`, `isBroadcast`, `isTemplate`, `humanReadableName`, compound `{ hidden, isBroadcast }`, compound `{ hidden, isTemplate }`.

### `carousels`

Viber rich-media carousels. `Cards` is the editor source of truth; `Buttons` is the flattened, Viber-shaped layout computed by `CarouselService` on save. There is no separate cards/buttons collection.

| Field | Type | Notes |
|-------|------|--------|
| `Type` | string | Always `"rich_media"` |
| `humanReadableName` | string | Required, max 100 |
| `hidden` | boolean | Indexed |
| `isTemplate` | boolean | Default `false`. Starter-only: selectable in the create form, never sent by the bot. Viber fetches `GET /api/carousels?hidden=false&isTemplate=false`. Indexed; compound `{ hidden, isTemplate }`. |
| `BgColor` | string? | Hex `#RRGGBB` / `#RRGGBBAA` or null |
| `ButtonsGroupColumns` | number | 1–6, default 6 |
| `ButtonsGroupRows` | number | 1–7, default 7 |
| `Cards` | Card[] | At least one. Structured (`image` / `title` / `description` / `ctaButtons`) or custom (`Buttons` with Rows 1–7) |
| `Buttons` | Button[] | Computed flattened Viber layout (Rows 1–7). Same embedded button shape as keyboards, with a higher row cap |
| `createdAt` / `updatedAt` | Date | |

Indexes: `hidden`, `humanReadableName`.

A `messages` document with `type: "rich-media"` stores `content.carousel.id` pointing at a document in this collection.

### `steps`

Conversation-flow nodes. `content` and `keyboard` are IDs into this same database.

| Field | Type | Notes |
|-------|------|--------|
| `humanReadableName` | string | Admin label |
| `trigger` | string[] | At least one; unique per step, case-insensitive |
| `content` | ObjectId[] | Refs `messages`, at least one |
| `keyboard` | ObjectId \| null | Ref `keyboards` |
| `hidden` | boolean | |
| `isAi` | boolean | When true, viber sends the user text to the AI service |
| `aiPromptName` | string \| null | Optional AI `prompt_templates.name` (max 64). Null = use the active prompt for the selected chain. |
| `customHandler` | string \| null | Optional custom step handler (`CUSTOM_STEP_HANDLER_NAMES` in `@vbar/shared`; currently `"example"`). Replaces the normal send path. Content may be empty when set. |
| `responseHandler` | string \| null | Optional inbound handler (`CUSTOM_RESPONSE_HANDLER_NAMES`; `"example"` \| `"locationHandler"`). Runs on the user's reply to this step. |
| `createdAt` / `updatedAt` | Date | |

Index: `hidden`.

### `botsettings`

Singleton bot config (one document). Viber fetches this over admin REST.

| Field | Type | Notes |
|-------|------|--------|
| `avatarURL` | URL \| null | |
| `botName` | string | Required |
| `botViberName` | string \| null | |
| `status` | `"active"` \| `"inactive"` \| `"maintenance"` | Default `"active"` |
| `buttonsBackground` | hex \| null | |
| `buttonsTextColor` | hex \| null | |
| `buttonsFrame` | `ButtonFrame` \| null | Viber API level 6 frame (`BorderWidth` 0–10, `BorderColor`, `CornerRadius` 0–10). Null means “do not send Frame”. Used as the default theme for new keyboard / carousel buttons. |
| `buttonsPrefix` | string \| null | |
| `welcomeStepId` | ObjectId \| null | Ref `steps` |
| `GAKey` | string \| null | |
| `createdAt` / `updatedAt` | Date | |

Index: `createdAt` descending.

### `stepusageevents`

One document per step execution in the viber service (written by the RabbitMQ consumer).

| Field | Type | Notes |
|-------|------|--------|
| `stepId` | ObjectId → `steps` | Indexed with `timestamp` |
| `userId` | string | Viber user ID |
| `source` | `"trigger"` \| `"welcome"` \| `"subscribe"` | How the step was initiated |
| `trigger` | string \| null | Matched trigger text |
| `customHandler` | string \| null | Set when the step ran a custom handler |
| `timestamp` | Date | Event time (from viber); not mongoose `createdAt` |

Indexes: `{ stepId: 1, timestamp: -1 }`, TTL `{ timestamp: 1 }` with `expireAfterSeconds = 8,640,000` (100 days).

Retention: events are kept for **100 days**; MongoDB’s TTL monitor deletes older documents automatically (no cron job needed). Changing retention later requires `collMod` (or drop + recreate) — `ensureIndexes()` will not alter an existing index’s `expireAfterSeconds`.

### `broadcasts`

Scheduled or in-flight step sends. Admin is the source of truth; viber claims and reports progress over REST (no broadcast payload on RabbitMQ). Collection name is `"broadcasts"`.

| Field | Type | Notes |
|-------|------|--------|
| `name` | string | Required, max 100 |
| `stepId` | ObjectId → `steps` | Must exist and must **not** be hidden (viber only caches visible steps) |
| `sendToAll` | boolean | Default `false`. When false, `testViberIds` is required |
| `testViberIds` | string[] | Explicit Viber user ids for a test send |
| `scheduledAt` | Date | Required. Omitted on create = send now |
| `status` | `"scheduled"` \| `"sending"` \| `"finished"` \| `"failed"` \| `"canceled"` | `canceled` only from `scheduled` |
| `totalCount` | number | Set on first worker progress report |
| `successCount` | number | Recipients accepted by Viber |
| `failedList` | `{ viberId, reason }[]` | Per-recipient failures |
| `startedAt` / `finishedAt` | Date \| null | |
| `errorMessage` | string \| null | Stored on worker failure; **not** exposed on `BroadcastDTO` |
| `lockedBy` | string \| null | Worker `instanceId` |
| `lockedAt` / `lastHeartbeatAt` | Date \| null | Stale lock recovery (`BROADCAST_STALE_MS`, default 5 min) |
| `lastProcessedId` | string \| null | Cursor: Mongo `_id` (send-to-all) or last test Viber id |
| `createdAt` / `updatedAt` | Date | |

Indexes: `{ status: 1, scheduledAt: 1 }` (due claim), `{ status: 1, lastHeartbeatAt: 1 }` (stale recovery).

`BroadcastDTO` (`@vbar/shared`) omits `errorMessage`, `lockedAt`, and `lastHeartbeatAt`.

## bot

Used by the viber service. Collection name is Mongoose’s default for model `ViberUser`: `viberusers`.

### `viberusers`

One document per Viber subscriber. This is runtime state, not CMS content.

| Field | Type | Notes |
|-------|------|--------|
| `viberId` | string | Unique Viber user id |
| `name` | string | Display name from Viber |
| `avatar` | string? | |
| `language` | string? | |
| `country` | string? | |
| `apiVersion` | number? | Viber client API version |
| `subscribed` | boolean | |
| `subscribedAt` / `unsubscribedAt` | Date? | |
| `currentStepId` | string? | Last / current step (admin step id as string) |
| `state` | object? | Per-user flow state |
| `metadata` | object? | Extra runtime data |
| `createdAt` / `updatedAt` | Date | |

Indexes: unique `viberId`, `subscribed`, `currentStepId`.

## ai

Used by the ai service (native Mongo driver via `@vbar/shared/infra`, not Mongoose).

### `conversations`

One document per Viber user id. New messages are `$push`ed; the document is upserted on first save.

| Field | Type | Notes |
|-------|------|--------|
| `userId` | string | Viber user id |
| `messages` | array | `{ role: "user" \| "assistant", content, timestamp }` |
| `metadata` | object | Default `{}` on insert |
| `createdAt` / `updatedAt` | Date | |

How much history is kept and sent to the model is controlled by `CONVERSATION_MAX_HISTORY` (default 15). Older messages are dropped on write with Mongo `$slice`.

### `prompt_templates`

Named prompt strings. Used when `PROMPT_TEMPLATES_ENABLED` is true and `PROMPT_TEMPLATE_STORAGE=mongodb` (the defaults).

| Field | Type | Notes |
|-------|------|--------|
| `name` | string | Lookup key (e.g. `bulgarian_culture_system`, `default_rag`). 1–64 chars `[a-zA-Z0-9_-]` |
| `template` | string | Body. Simple prompts must not contain `{placeholders}`; RAG prompts must include exactly `{context}` and `{question}` |
| `taskType` | string | `simple` / `rag` / `custom` |
| `variables` | string[] | Placeholder names (auto-extracted) |
| `description` | string? | |
| `isActive` | boolean | Default `false`. At most one active template per `taskType` (activating one deactivates the others) |
| `createdAt` / `updatedAt` | Date | |

Startup (`initPromptTemplates`) upserts `bulgarian_culture_system` and `default_rag`, then activates one template per `simple` / `rag` only when none is active. Operators manage templates through admin `/prompts` (proxy to AI `/api/prompts`). `PROMPT_TEMPLATE_DEFAULT` is the fallback name for a `custom` task with no `promptName` (fallback `"default"`).

## Chroma

RAG vectors are **not** stored in Mongo. When RAG is enabled, the AI service uses self-hosted Chroma (`chromadb/chroma:0.6.3`).

| Setting | Value |
|---------|--------|
| Compose service | `chromadb` — always started with the default stack |
| Host bind | `127.0.0.1:8000` |
| Volume | `vbar-chromadb-data` |
| Collection name | `RAG_VECTOR_STORE_COLLECTION` (default `embeddings`) |
| URL (host / `npm run dev:ai`) | `CHROMA_URL=http://localhost:8000` |
| URL (Compose `ai` service) | `CHROMA_URL=http://chromadb:8000` (hardcoded; ignores host `.env`) |

Allowed `RAG_VECTOR_STORE_TYPE`: `chroma` (default) or `memory` (tests). `mongodb` is rejected.

Ingest writes one embedding per chunk. Sources are grouped by `sourceId` for list / delete (`GET/DELETE /api/knowledge-base/sources`). "Clear all" wipes the collection.

Chunk metadata on every vector:

| Field | Type | Notes |
|-------|------|--------|
| `sourceId` | string | Groups chunks from one ingest item |
| `source` | string | Filename or URL |
| `sourceType` | `"file"` \| `"url"` | |
| `fileType` | `"pdf"` \| `"md"` \| `"txt"` \| `"html"` \| `"xlsx"` | |
| `chunkIndex` | number | 0-based within that source |
| `ingestedAt` | string | ISO date |

Chunks without `sourceId` (legacy / manual) are skipped by `listSources` and per-source delete; they are removed by clear-all. See [rag.md](./rag.md).

## Connection

| Context | How |
|---------|-----|
| admin | `services/admin/src/lib/mongodb.ts` (Next.js singleton, seed, indexes) |
| viber / ai | `@vbar/shared/infra` (`createMongoConnection`, `getMongoDatabase`) |
| Compose | `MONGODB_URI` rewritten to host `mongodb` |
| Host / local npm | `MONGODB_URI=...@localhost:27017/?authSource=admin` plus each service’s `MONGODB_DB_NAME` |

See [setup.md](./setup.md) and [deployment.md](./deployment.md) for env names and Compose binds (`127.0.0.1:27017`).

## What is not stored

- **No second Mongo per service.** One container, three databases.
- **No RAG embeddings in Mongo.** Vectors live in Chroma (`vbar-chromadb`) or in-memory. See [rag.md](./rag.md).
- **No admin content in `bot` or `ai`.** Viber caches steps/messages/keyboards/carousels/settings in memory and refreshes on RabbitMQ `viber.refresh`.
- **No multi-bot / `botId` tenancy.** One bot per deployment.
- **No message-queue persistence of CMS data.** RabbitMQ carries `RefreshEvent` (cache invalidation) and `StepUsageEvent` (analytics). CMS content itself is not stored on the queue.
- **Archived web3 Mongo** lived on `archive/web3-service` and is not in this stack.

## Related documentation

- [Architecture](./architecture.md)
- [Admin service](./admin.md)
- [Viber service](./viber.md)
- [API](./api.md)
- [Setup](./setup.md)
- [Deployment](./deployment.md)
- [RAG](./rag.md)
