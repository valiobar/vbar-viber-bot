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
| `admin_service` | admin | CMS | Dashboard users, JWT sessions, messages, keyboards, steps, singleton bot settings |
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
| `Buttons` | Button[] | At least one. Array index is Viber layout order (left-to-right, 6-column wrap). Admin reorders this array in the keyboard form. Columns/Rows, Text, colors, media, `ActionType` / `ActionBody`, alignment, `Silent`, `isJson`, optional `OpenURLType` + `InternalBrowser` |
| `DefaultHeight` | boolean | |
| `InputFieldState` | `"regular"` \| `"minimized"` \| `"hidden"` | |
| `BgColor` | hex \| null | |
| `hidden` | boolean | |
| `humanReadableName` | string | Admin label |
| `title` | string \| null | |
| `isBroadcast` | boolean | |
| `isTemplate` | boolean | Default `false`. When true, starter-only: buttons are copied into a new keyboard on create. Not attachable to steps/messages and not fetched by Viber. |
| `createdAt` / `updatedAt` | Date | |

Indexes: `hidden`, `isBroadcast`, `isTemplate`, `humanReadableName`, compound `{ hidden, isBroadcast }`, compound `{ hidden, isTemplate }`.

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
| `buttonsPrefix` | string \| null | |
| `welcomeStepId` | ObjectId \| null | Ref `steps` |
| `GAKey` | string \| null | |
| `createdAt` / `updatedAt` | Date | |

Index: `createdAt` descending.

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

How much history is sent to the model is controlled by `CONVERSATION_MAX_HISTORY` (default 10), not by deleting old rows.

### `prompt_templates`

Named prompt strings. Used when `PROMPT_TEMPLATES_ENABLED` is true and `PROMPT_TEMPLATE_STORAGE=mongodb` (the defaults).

| Field | Type | Notes |
|-------|------|--------|
| `name` | string | Lookup key (e.g. `default`, `bulgarian_culture_system`) |
| `template` | string | Body with `{variable}` placeholders |
| `taskType` | string | `simple` / `rag` / `custom` (and other `AITaskType` values) |
| `variables` | string[] | Placeholder names |
| `description` | string? | |
| `createdAt` / `updatedAt` | Date | |

Default template name: `PROMPT_TEMPLATE_DEFAULT` (fallback `"default"`).

## Chroma

RAG vectors are **not** stored in Mongo. When RAG is enabled, the AI service uses self-hosted Chroma (`chromadb/chroma:0.6.3`).

| Setting | Value |
|---------|--------|
| Compose profile | `rag` — not started by default |
| Host bind | `127.0.0.1:8000` |
| Volume | `vbar-chromadb-data` |
| Collection name | `RAG_VECTOR_STORE_COLLECTION` (default `embeddings`) |
| URL (host / `npm run dev:ai`) | `CHROMA_URL=http://localhost:8000` |
| URL (Compose `ai` service) | `CHROMA_URL=http://chromadb:8000` (set automatically) |

Allowed `RAG_VECTOR_STORE_TYPE`: `chroma` (default) or `memory` (tests). `mongodb` is rejected.

Ingest writes one embedding per chunk. Sources are grouped by `sourceId` for list / delete (`GET/DELETE /api/knowledge-base/sources`). "Clear all" wipes the collection.

Chunk metadata on every vector:

| Field | Type | Notes |
|-------|------|--------|
| `sourceId` | string | Groups chunks from one ingest item |
| `source` | string | Filename or URL |
| `sourceType` | `"file"` \| `"url"` | |
| `fileType` | `"pdf"` \| `"md"` \| `"txt"` \| `"html"` | |
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
- **No RAG embeddings in Mongo.** Vectors live in Chroma (profile `rag`) or in-memory. See [rag.md](./rag.md).
- **No admin content in `bot` or `ai`.** Viber caches steps/messages/keyboards/settings in memory and refreshes on RabbitMQ `viber.refresh`.
- **No multi-bot / `botId` tenancy.** One bot per deployment.
- **No message-queue persistence of CMS data.** RabbitMQ only carries `RefreshEvent`.
- **Archived web3 Mongo** lived on `archive/web3-service` and is not in this stack.

## Related documentation

- [Architecture](./architecture.md)
- [API](./api.md)
- [Setup](./setup.md)
- [Deployment](./deployment.md)
- [RAG](./rag.md)
