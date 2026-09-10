# Admin Service

The admin Next.js app is the CMS for this stack. Dashboard users edit bot content here. The viber service never writes to admin Mongo — it pulls content over REST (service token) and keeps it in memory. This document is the service-level guide: architectural patterns, how data is stored, how the client is sliced, and the rules you need when changing admin.

Collection field lists live in [databases.md](./databases.md). HTTP contracts live in [api.md](./api.md). Stack-wide topology lives in [architecture.md](./architecture.md).

## Table of Contents

1. [What it does](#what-it-does)
2. [Role in the stack](#role-in-the-stack)
3. [Architectural patterns](#architectural-patterns)
4. [Project structure](#project-structure)
5. [How data is stored](#how-data-is-stored)
6. [Content model](#content-model)
7. [Domains](#domains)
8. [Authentication](#authentication)
9. [API conventions](#api-conventions)
10. [Refresh events](#refresh-events)
11. [Knowledge-base proxy](#knowledge-base-proxy)
12. [Client (FSD)](#client-fsd)
13. [App routes](#app-routes)
14. [Environment](#environment)
15. [Adding a new CMS domain](#adding-a-new-cms-domain)
16. [Leftover code](#leftover-code)
17. [What is not implemented](#what-is-not-implemented)

---

## What it does

- JWT login / refresh / logout for dashboard users
- CRUD for **messages**, **keyboards**, **carousels**, **steps**
- Singleton **bot settings** (the only bot config viber consumes)
- Knowledge Base UI (`/knowledge-base`) — thin proxy to the AI service
- Health check
- Publishes RabbitMQ `viber.refresh` so every viber instance reloads its cache

It is **one bot per deployment**. Documents have no `botId`. Leftover `botId` fields on old documents are ignored.

Port **3000**. Database name **`admin_service`**.

---

## Role in the stack

```
Browser (JWT) ──REST──► Admin :3000
                           │
                           ├─ Mongo `admin_service`  (CMS + dashboard users)
                           ├─ RabbitMQ `viber.refresh`  (cache invalidation)
                           └─ REST + X-Service-Token ──► AI `/api/knowledge-base/*`

Viber :3001 ──REST + X-Service-Token──► Admin CMS APIs
              (steps, messages, keyboards, carousels, bot-settings)
```

Admin owns the **source of truth** for conversation content. Viber owns **runtime** (subscribers, current step) in the `bot` database. AI owns **chat history / prompts** in `ai` and **RAG vectors** in Chroma. Admin does not query those stores.

---

## Architectural patterns

Admin is two codebases in one Next.js process. Do not mix their rules.

### Server — `route → service → repository`

```
app/api/messages/route.ts
        → MessageService.list / get / create / update / delete
        → MessageRepository (concrete Mongo class)
        → MessageModel (mongoose)
```

Same shape for keyboards, carousels, steps, bot-settings, and auth.

| Layer | Lives in | Allowed to do | Must not do |
|-------|----------|---------------|-------------|
| **Route** | `src/app/api/**` | Parse query/body, wire service + repository, map errors to HTTP, call `notifyRefresh` | Business rules, inline Mongo queries |
| **Service** | `src/domains/<x>/<X>Service.ts` | Validation, defaults, flatten/transform, cross-domain checks | HTTP, cookies, `NextResponse` |
| **Repository** | `src/domains/<x>/<X>Repository.ts` | Persist and load via the mongoose model | HTTP, domain policy beyond “not found” |

Repositories are **concrete Mongo classes**. Do not add a port interface, `ports/in/`, or `*UseCaseImpl` unless a second implementation is real.

**Auth** is `AuthService` (`login` / `logout` / `refresh`) with `UserRepository` + `SessionRepository`.

**Bot settings** is `BotSettingsService` (`get` / `update`) — singleton, not a list.

**Deviation — knowledge-base:** `app/api/knowledge-base/*` forwards to AI (`lib/aiService.ts` + `X-Service-Token`). No admin repository, no domain service. Justified as a transport adapter: admin owns no KB data.

Route helpers (`src/lib/api/routeHelpers.ts`): `withDb`, `jsonOk`, `jsonError`, `noContent`, `parsePagination`, `parseBoolParam`, `notifyRefresh`, `mapError`. Content CRUD routes use these. Auth and bot-settings still use hand-rolled try/catch.

### Client — Feature-Sliced Design

```
app → views → widgets → features → entities → shared
```

A layer imports only from layers **strictly below** it. Slices in the same layer never import each other. Import a slice only through its public `index.ts` (`@/entities/message`, never `@/entities/message/api/messages`).

The only client files that may reference `@/domains` are `entities/*/model/types.ts`, and only via `import type`.

`app/` is both Next.js App Router and the FSD app layer. `page.tsx` files are thin default-export wrappers that render a view. The FSD pages layer is named **`views/`** because Next.js reserves `pages/` and `app/`.

Do not recreate root `components/`, `store/`, or `types/` folders for new work. Zustand stores live in a slice `model/` segment.

### Why not Ports & Adapters here

Full hexagonal (ports + adapters + use-cases) is reserved for boundaries with **multiple real implementations** (for example `AIProviderPort` in the AI service). Admin CMS has one Mongo implementation and CRUD-shaped rules. Extra interfaces add files without changing behavior.

Older `domains/*/ports/` and `domains/*/application/use-cases/` folders still exist on disk. **Live routes do not import them.** See [Leftover code](#leftover-code).

---

## Project structure

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
│       └── lib/                 # Domain helpers (validators, flatteners)
├── lib/                         # mongodb, auth, api helpers, refresh publisher, AI proxy
└── middleware.ts                # Edge: JWT or service token
```

Per-domain folder (canonical files — use these):

```
<X>.ts             # optional domain entity class
<X>Model.ts        # mongoose schema + document interface
<X>Repository.ts   # concrete Mongo repository
<X>Service.ts      # business logic + input/filter/result types
<X>DTO.ts          # API-facing DTO (or re-export from @vbar/shared)
lib/               # validators / transformers
types.ts
index.ts           # public barrel
```

Carousel has no entity class: the repository maps documents ↔ `CarouselDTO` from `@vbar/shared`. That is allowed.

---

## How data is stored

### Connection

`src/lib/mongodb.ts` — Next.js-specific singleton (survives hot reload via `global.mongoose`).

- URI: `MONGODB_URI` (required at runtime; no fallback). `authSource=admin` is appended if missing.
- Database: `MONGODB_DB_NAME` (default `admin_service`).
- Build guard: URI is read inside `connectToDatabase()`, so `next build` can run without Mongo.
- On first connect: `UserModel` / `SessionModel` / `KeyboardModel.ensureIndexes()`, then `seedAdminUser()`.

Viber and AI use `@vbar/shared/infra` for Mongo. Admin does **not** — Next.js needs the build guard, seed, and index bootstrap.

### Database `admin_service`

| Collection | What | Shape |
|------------|------|--------|
| `users` | Dashboard logins (not Viber end users) | One document per account |
| `sessions` | Refresh-token sessions | TTL on `expiresAt` |
| `messages` | Reusable Viber message templates | `content` Mixed, shape depends on `type` |
| `keyboards` | Reply keyboards | Buttons **embedded** in `Buttons[]` |
| `carousels` | Rich-media carousels | `Cards[]` + computed `Buttons[]` embedded |
| `steps` | Conversation nodes | `content[]` and `keyboard` are **ObjectId refs** |
| `botsettings` | Singleton bot config | One document; `findOne()` / upsert |

Field-level schemas and indexes: [databases.md](./databases.md#admin_service).

### Storage rules

- **Embed** when the child is only meaningful on the parent: keyboard buttons, carousel cards/buttons.
- **Reference by ObjectId** when the child is a reusable CMS entity: step → messages, step → keyboard, bot-settings → welcome step, message content → carousel/keyboard id.
- **No separate `buttons` collection.** Keyboard and carousel buttons live on the parent document. Array index is layout order.
- **Soft-hide** with `hidden`. Lists filter it; delete is hard delete.
- **No referential delete guards.** Deleting a message/keyboard/carousel/step does not fail if something still points at it. Create/update **does** validate refs for steps (`content`, `keyboard`) and bot-settings (`welcomeStepId`). Viber skips missing IDs at send time.
- **No `botId`.** One bot per deployment.

### Seed

If `users` is empty, first connect creates:

| Field | Value |
|-------|--------|
| username | `admin` |
| password | `admin2525` |
| email | `admin@example.com` |
| role | `admin` |

Change this after first login. Seeding is skipped if any user already exists.

---

## Content model

This is the graph viber walks when it sends a step.

```
botsettings (singleton)
  └── welcomeStepId ──────────────► steps._id

steps
  ├── trigger[]                    # inbound user text that selects this step
  ├── isAi                         # if true, viber also calls AI
  ├── content[] ──────────────────► messages._id   (ordered)
  └── keyboard? ──────────────────► keyboards._id  (optional step keyboard)

messages
  ├── type "text" | "url" | ... | "keyboard" | "rich-media"
  ├── type "keyboard"   → content.keyboard.id ──► keyboards._id
  └── type "rich-media" → content.carousel.id ──► carousels._id

carousels
  ├── Cards[]                      # editor source of truth
  └── Buttons[]                    # flattened Viber grid, computed on save
```

**Two keyboard mechanisms (independent):**

1. **Step keyboard** — `steps.keyboard`. Attached to the last message of the step when viber sends.
2. **Keyboard-type message** — a message whose `content` references a keyboard. Used when a keyboard should appear as its own message in the step’s content list.

**Carousel attachment:** create a carousel, create a `rich-media` message with `{ carousel: { id } }`, add that message to a step’s `content`. Same pattern as keyboard-type messages.

**What viber actually sends:**

1. Fetch/cache order: steps → messages + keyboards (parallel) → carousels (after messages, because rich-media content holds carousel IDs).
2. `StepSender` loads the step’s messages. For `rich-media`, it looks up the carousel, runs `CarouselConverter`, injects `content.richMedia`.
3. `MessageConverter` builds `Message.RichMedia` (`min_api_version` ≥ 7).
4. Step keyboard (if any) is converted by `KeyboardConverter` and attached to the last message.
5. Reply `ActionBody`s get `buttonsPrefix` from bot settings (carousel converter prefixes **reply** only, so open-url bodies stay URLs).

---

## Domains

### User / session (auth)

**Service:** `AuthService` — `login`, `logout`, `refresh`.

- Login: find by username → bcrypt compare → update `lastLoginAt` → issue access + refresh JWTs → persist refresh in `sessions`.
- Refresh: verify refresh JWT → find session → check expiry → **rotate** refresh (delete old, create new).
- Logout: delete session by refresh token (always succeeds); clear `accessToken` cookie.

Roles (`admin` | `user` | `viewer`) are stored on the user and put in the JWT. Middleware does **not** enforce role-based route access — any valid JWT or service token can hit CMS APIs.

### Message

Reusable templates. `MessageContent` validates `content` by `type`:

| Type | Required content |
|------|------------------|
| `text` | `{ text }` |
| `url` | URL on the message root (`url`), content may be empty |
| `picture` / `video` / `file` | `{ media }` plus optional metadata |
| `location` | `{ lat, lon }` |
| `contact` | `{ name, phone_number }` |
| `sticker` | `{ sticker_id }` |
| `keyboard` | `{ keyboard }` object (typically `{ id }`); optional `text` |
| `rich-media` | `{ carousel }` object (typically `{ id }`) |

List filters: `hidden`, `type`, `search` (regex on `humanReadableName`).

### Keyboard

Viber reply keyboard. Buttons are embedded.

- `ViberApiValidator` + `lib/Validators.ts` enforce Viber layout (columns 1–6, rows 1–2, 6-column wrap, action types, colors).
- `isTemplate: true` — starter only. Admin copies `Buttons` into a new keyboard. Not attachable to live steps/messages. Viber fetches `GET /api/keyboards?hidden=false&isTemplate=false`.
- `isBroadcast` — filter flag; does not change send behavior by itself.
- Nested `addButton` / `updateButton` / `removeButton` exist on `KeyboardService` but **are not exposed** as API routes. The UI submits the full `Buttons[]` on POST/PUT.

### Carousel

Rich-media carousel. No entity class; DTO-shaped.

On create/update:

1. `CarouselValidators.validateCarousel` (card row budget, CTA actions, custom-card fill, max buttons `6 × ButtonsGroupColumns × ButtonsGroupRows`).
2. `CardFlattener.flattenCards` builds the Viber-shaped `Buttons[]`.
3. Both `Cards` (editor) and `Buttons` (send payload) are stored.

Card modes:

- **structured** (default): image + title/description + CTA buttons. Server generates the button layout.
- **custom**: free-form buttons, up to `ButtonsGroupRows` tall. Must fill the card block exactly (otherwise the next card bleeds into it on device).

Forbidden in carousel context: `location-picker`, `share-phone`. CTAs are `reply` | `open-url` | `none`.

Defaults: `ButtonsGroupColumns = 6`, `ButtonsGroupRows = 7`. Button `Rows` may be 1–7 (keyboards stay capped at 2 via `createButtonSchema(2)`).

### Step

A conversation node.

- `trigger[]` — at least one; unique per step, case-insensitive.
- `content[]` — at least one message ObjectId; order is send order. Create/update checks that every ID exists.
- `keyboard` — optional keyboard ObjectId; validated if set.
- `isAi` — viber sends the user text to the AI service for this step.

List filters: `hidden`, `isAi`, `search`, `trigger` (exact match in the array). `StepService.findByTrigger()` exists; the public API is `GET /api/steps?trigger=...`.

### Bot settings

Singleton. `GET` returns **404 until the first `PUT`**, which creates the document with defaults (`botName: "Bot"`, generated 14-character `buttonsPrefix` ending in `-`).

Fields viber cares about: `botName`, `botViberName`, `avatarURL`, `status`, `buttonsBackground`, `buttonsTextColor`, `buttonsPrefix`, `welcomeStepId`, `GAKey`.

`welcomeStepId` must reference an existing step when set.

---

## Authentication

Two mechanisms, both handled in Edge `middleware.ts`.

### Dashboard users (JWT)

| Piece | Detail |
|-------|--------|
| Library | `jose` (`lib/auth/jwt.ts`) |
| Secret | `JWT_SECRET` (required, ≥ 32 chars) |
| Access TTL | `JWT_EXPIRES_IN` (default `7d`) |
| Refresh TTL | `JWT_REFRESH_EXPIRES_IN` (default `30d`) |
| Payload | `{ userId, email, role }` |
| Cookie | `accessToken` httpOnly, `sameSite=lax`, `secure` in production, **maxAge 24h** |
| Client | Zustand `entities/session` (`auth-storage`); `shared/api/http.ts` sends `Authorization: Bearer` |

Login is **username + password**, not email.

Cookie maxAge is 24 hours while the JWT default is 7 days. After 24h the cookie is gone; the client still has the token in Zustand and can send the Bearer header. Middleware accepts either.

### Service-to-service

| Header | Role |
|--------|------|
| `X-Service-Token` | Required. Timing-safe SHA-256 compare (`lib/security/serviceTokens.ts`) |
| `X-Service-Name` | Optional, logged when the token is valid |

Accepted env values: `SERVICE_TOKEN`, `ADMIN_SERVICE_TOKEN`, `VIBER_SERVICE_TOKEN`, `AI_SERVICE_TOKEN`. At least one must be set for service-token auth to succeed. Viber’s `ADMIN_SERVICE_TOKEN` must match one of these.

### Public vs protected

**Public:** `/login`, `/api/auth/login`, `/api/auth/refresh`, `/api/health`.

**API (`/api/*`):** service token first, else JWT from `Authorization: Bearer` or cookie → 401 JSON (`AUTH_001`).

**Frontend:** no token → redirect to `/login?redirect=<path>`.

`PROTECTED_API_ROUTES` in middleware still lists `/api/users` and `/api/config`. Those routes **do not exist**. All other `/api/*` paths are protected by the `pathname.startsWith("/api/")` branch.

---

## API conventions

Envelope (`ApiResponse<T>` from `@vbar/shared`):

```typescript
{ data?: T; error?: { code, message, details? }; meta?: { page, limit, total } }
```

Pagination query: `page` (default 1), `limit` (default 10, max 100).

Deletes return **204** (`noContent()`).

| Resource | List / create | By id | Mutation refresh |
|----------|---------------|-------|------------------|
| Steps | `GET/POST /api/steps` | `GET/PUT/DELETE /api/steps/:id` | `steps` |
| Messages | `GET/POST /api/messages` | `GET/PUT/DELETE /api/messages/:id` | `messages` |
| Keyboards | `GET/POST /api/keyboards` | `GET/PUT/DELETE /api/keyboards/:id` | `keyboards` |
| Carousels | `GET/POST /api/carousels` | `GET/PUT/DELETE /api/carousels/:id` | `carousels` |
| Bot settings | `GET/PUT /api/bot-settings` | — | `bot_settings` |

List filters: messages (`hidden`, `type`, `search`); keyboards (`hidden`, `isBroadcast`, `isTemplate`, `search`); steps (`hidden`, `isAi`, `trigger`, `search`); carousels (`hidden`, `search`).

Error codes from `mapError`: `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500). Auth uses `AUTH_001`.

Full tables: [api.md](./api.md).

---

## Refresh events

Content mutations publish a fire-and-forget `RefreshEvent` to RabbitMQ. A failed publish is logged and **does not** fail the HTTP request.

```typescript
{
  type: "bot_data_refresh";
  timestamp: string;
  source: "admin_service";
  dataType?: "all" | "steps" | "messages" | "keyboards" | "carousels" | "bot_settings";
}
```

- Queue / routing key: `viber.refresh`
- Exchange: `viber-bot`
- Publisher: `lib/message-queue-publisher.ts` (`publishRefreshEvent`)
- Wrapper: `notifyRefresh` in route helpers (content CRUD). Bot-settings PUT calls `publishRefreshEvent("bot_settings")` directly.

Viber’s `RefreshConsumer` does **not** switch on `dataType`. Any event triggers `refreshAllData()` (steps → messages/keyboards → carousels) plus settings refresh.

Auth, health, and knowledge-base routes do not publish.

---

## Knowledge-base proxy

Admin stores **nothing** for RAG. The UI talks only to admin `/api/knowledge-base/*`; those routes forward to AI.

`lib/aiService.ts`:

- Base URL: `AI_SERVICE_URL` (default `http://localhost:3002`)
- Header: `X-Service-Token: <AI_SERVICE_TOKEN>`
- Returns AI status + JSON unchanged
- **503** `AI_SERVICE_NOT_CONFIGURED` if the token is empty
- **502** `AI_SERVICE_UNAVAILABLE` if AI is unreachable

| Admin | AI |
|-------|----|
| `POST /api/knowledge-base/files` | multipart, ≤10 files, ≤10 MB, `.pdf` / `.md` / `.txt` |
| `POST /api/knowledge-base/urls` | `{ urls }` ≤ 20 |
| `GET /api/knowledge-base/sources` | list |
| `DELETE /api/knowledge-base/sources/:id` | delete one source |
| `DELETE /api/knowledge-base/sources` | clear all |

Client types (`KnowledgeSource`, `IngestResult`) live in `entities/knowledge-base` and mirror the AI inbound port — they are **not** in `@vbar/shared`. Ingest is synchronous (a large batch can take 30–60 s). Vectors live in Chroma behind AI. See [rag.md](./rag.md).

---

## Client (FSD)

### Layers

| Layer | Role |
|-------|------|
| `app/` | Thin `page.tsx`, `layout.tsx`, providers, `globals.css`, `api/**` |
| `views/` | One slice per route; composes widgets + features |
| `widgets/` | Dashboard shell, side menu, list screens |
| `features/` | Forms, filters, ingest UI |
| `entities/` | Client `api/`, `model/types` (re-export domain types), presentational `ui/`, Zustand |
| `shared/` | `http`, `useResourceList`, Pagination, ErrorMessage, theme. Imports no FSD layer and never `@/domains` |

### Current slices

| Area | entities | features | widgets | views |
|------|----------|----------|---------|-------|
| session / auth | `session` | `auth` | — | `login` |
| messages | `message` | `message-manage` | `message-list` | `messages`, `message-create`, `message-edit` |
| keyboards | `keyboard` | `keyboard-manage` | `keyboard-list` | `keyboards`, `keyboard-create`, `keyboard-edit` |
| carousels | `carousel` | `carousel-manage` | `carousel-list` | `carousels`, `carousel-create`, `carousel-edit` |
| steps | `step` | `step-manage` | `step-list` | `steps`, `step-create`, `step-edit` |
| bot-settings | `bot-settings` | `bot-settings-manage` | — | `settings` |
| knowledge-base | `knowledge-base` | `knowledge-base-ingest` | `knowledge-base-sources` | `knowledge-base` |
| dashboard | — | — | `dashboard-layout`, `side-menu` | `dashboard` (`/` → `/settings`) |

List pages use `useResourceList` (pagination, filters, reload). Keyboard and carousel editors can reorder with dnd-kit; order is the array sent on POST/PUT.

Carousel FSD does **not** import keyboard slices (same-layer imports are forbidden). Button editing is an adapted copy (`CarouselButtonForm`) with carousel row limits.

### HTTP client

`shared/api/http.ts` unwraps `ApiResponse<T>`, attaches the Bearer token from the session store, and uses `NEXT_PUBLIC_API_URL` on the server (default `http://localhost:3000`).

---

## App routes

| Path | View | Implemented |
|------|------|-------------|
| `/` | `DashboardView` → `/settings` | yes |
| `/login` | `LoginView` | yes |
| `/settings` | `SettingsView` | yes |
| `/messages`, `/messages/new`, `/messages/[id]/edit` | message CRUD | yes |
| `/keyboards`, `/keyboards/new`, `/keyboards/[id]` | keyboard CRUD | yes |
| `/carousels`, `/carousels/new`, `/carousels/[id]` | carousel CRUD | yes |
| `/steps`, `/steps/new`, `/steps/[id]/edit` | step CRUD | yes |
| `/knowledge-base` | ingest + sources | yes |
| `/overview`, `/users`, `/analytics` | side-menu entries only | **no `page.tsx`** |

---

## Environment

Read by admin source:

| Variable | Required | Default / notes |
|----------|----------|-----------------|
| `MONGODB_URI` | runtime yes | No fallback |
| `MONGODB_DB_NAME` | no | `admin_service` |
| `JWT_SECRET` | yes | ≥ 32 characters |
| `JWT_EXPIRES_IN` | no | `7d` |
| `JWT_REFRESH_EXPIRES_IN` | no | `30d` |
| `RABBITMQ_URI` | no | `amqp://admin:admin@localhost:5672` |
| `AI_SERVICE_URL` | no | `http://localhost:3002` |
| `AI_SERVICE_TOKEN` | for KB proxy | Empty → 503 |
| `SERVICE_TOKEN` / `ADMIN_SERVICE_TOKEN` / `VIBER_SERVICE_TOKEN` | for inbound service auth | At least one |
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:${PORT\|\|3000}` |
| `NODE_ENV` | no | Cookie `secure` when `production` |

`npm run dev:admin` loads the **repo-root** `.env` via `services/admin/next.config.js` (`dotenv`). Do not put secrets in `services/admin/.env`.

`BOT_TOKEN_ENCRYPTION_KEY` and `NEXT_PUBLIC_APP_URL` appear in `.env.example` / README but are **not read** by current admin `src/`.

---

## Adding a new CMS domain

Follow the existing content domains. Do not invent a second pattern.

**Server**

1. Shared DTO in `packages/shared/src/types/admin.ts` if viber will consume it.
2. `domains/<x>/` — Model, Repository, Service, validators in `lib/`, barrel.
3. Routes at `app/api/<xs>/` and `app/api/<xs>/[id]/` — parse, wire, `withDb`, `notifyRefresh("<xs>")`.
4. Add `"<xs>"` to `RefreshEvent["dataType"]` if viber should know.

**Client**

1. `entities/<x>` — `model/types.ts` (`import type` from the domain barrel), `api/`, optional preview UI, `index.ts`.
2. `features/<x>-manage` — form.
3. `widgets/<x>-list` — table + filters.
4. `views/<xs>` (+ create/edit) and thin `app/<xs>/page.tsx`.
5. Side-menu entry in `widgets/side-menu`.

**Do not** add `ports/in/`, use-cases, or a root `components/` folder.

---

## Leftover code

The **live** path is `app/api` + `*Service` + `*Repository` + FSD (`views` / `widgets` / `features` / `entities` / `shared`).

Still on disk, **not imported by live routes or pages**:

| Leftover | Location | Do this |
|----------|----------|---------|
| Ports + use-cases | `domains/*/ports/`, `domains/*/application/use-cases/` | Do not extend. New logic goes on `*Service`. |
| Duplicate entities | `domains/*/entities/`, some `value-objects/` | Prefer the files at the domain root (`Message.ts`, `Keyboard.ts`, …). |
| Old keyboard helpers | `domains/keyboard/services/` | Live imports are `domains/keyboard/lib/`. |
| Old UI | `src/components/` | Dead. New UI is FSD. |
| Phantom API list | middleware `PROTECTED_API_ROUTES` | `/api/users`, `/api/config` have no handlers. |
| Side-menu stubs | `/overview`, `/users`, `/analytics` | No pages. |

Comments on some auth routes still say “Hexagonal / use case”. Ignore those — the handlers call `AuthService`.

---

## What is not implemented

- Admin user-management API / UI (`/api/users`, `/users`)
- Config API (`/api/config`)
- Overview and analytics pages
- Role-based authorization on CMS routes (roles exist on the user/JWT only)
- Referential integrity on delete
- Knowledge-base data in admin Mongo

---

## Related documentation

- [Architecture](./architecture.md) — three-service topology
- [API](./api.md) — endpoint tables
- [Databases](./databases.md) — collection fields and indexes
- [Setup](./setup.md) — local env and Compose
- [Deployment](./deployment.md)
- [RAG](./rag.md) — what the knowledge-base UI actually feeds
- Service README: `services/admin/README.md`
