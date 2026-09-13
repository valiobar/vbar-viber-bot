# AI Service

Architecture, runtime behaviour, consumers, and contracts of `services/ai`. Accurate against the current working tree. System-wide context: [architecture.md](./architecture.md). RAG specifics: [rag.md](./rag.md).

## Table of Contents

1. [Overview](#overview)
2. [Process layout](#process-layout)
3. [Hexagonal layering](#hexagonal-layering)
4. [Request flow — gRPC ProcessMessage](#request-flow--grpc-processmessage)
5. [Chain selection](#chain-selection)
6. [Chains in detail](#chains-in-detail)
7. [AI providers](#ai-providers)
8. [Conversation history](#conversation-history)
9. [Prompt templates](#prompt-templates)
10. [Knowledge base and RAG](#knowledge-base-and-rag)
11. [Consumers](#consumers)
12. [Contracts](#contracts)
13. [Configuration](#configuration)
14. [Storage](#storage)
15. [Observability and error handling](#observability-and-error-handling)
16. [Deployment](#deployment)
17. [Security notes](#security-notes)
18. [Known gaps](#known-gaps)
19. [Related documentation](#related-documentation)

## Overview

The AI service turns a single Viber message into a single LLM answer. It is the only service that talks to an LLM, and it owns per-user conversation history plus the knowledge-base vectors used for retrieval.

It exposes two inbound surfaces:

| Surface | Port | Used by | Purpose |
|---------|------|---------|---------|
| gRPC `ai.AIProcessingService` | `50051` (`GRPC_PORT`) | Viber service | `ProcessMessage` — the primary API |
| HTTP (Express) | `3002` (`PORT`) | Admin service, health checks | `GET /api/health`, `/api/knowledge-base/*` ingest |

The service does **not** connect to RabbitMQ, has no REST message-processing endpoint, and does not read admin content (steps, messages, keyboards). It only receives what viber puts in the gRPC request.

Stack: Node 20, Express, `@grpc/grpc-js`, LangChain (`langchain` + `@langchain/*`), MongoDB via `@vbar/shared/infra`, optional Chroma for vectors, optional LangSmith tracing.

## Process layout

One Node process runs both servers. Entry point: `services/ai/src/index.ts`.

Startup:

1. Load the monorepo-root `.env` through `resolveRootEnvPath()` (from `@vbar/shared/infra`), falling back to a local `.env`.
2. Register Express middleware and routes at module scope. The vector store is created here — `createVectorStore(logger)` is synchronous and returns `null` when `RAG_ENABLED=false`. The same instance is shared by the HTTP ingest routes and the gRPC chain executor.
3. `initialize()` then runs: LangSmith init → MongoDB connect → `initBulgarianCulturePrompt()` (upserts the default system prompt; failures are logged and ignored) → gRPC `bindAsync` on `0.0.0.0:GRPC_PORT` → `app.listen(PORT)`.

Shutdown on `SIGTERM` / `SIGINT` / uncaught exception: `grpcServer.tryShutdown()` (force shutdown on error), then `closeMongoConnection()`, then `process.exit(0)`.

A Mongo connection failure at startup is fatal (`process.exit(1)`). A missing prompt template or an unreachable Chroma is not.

## Hexagonal layering

The AI service is the one service in the repo that uses full Ports & Adapters, because there are genuinely multiple implementations behind the LLM and vector-store boundaries.

```
adapters/in/grpc/server.ts ─┐
adapters/in/routes/*        ├─→ application/use-cases/* ─→ ports/out/* ─→ adapters/out/*
                            ┘         (domain entities)
```

| Layer | Path | Contents |
|-------|------|----------|
| Inbound adapters | `src/adapters/in/` | `grpc/server.ts` (ProcessMessage), `routes/health.ts`, `routes/knowledgeBase.ts` |
| Inbound ports | `src/ports/in/` | `ProcessMessageUseCase`, `IngestKnowledgeUseCase` (also the admin-facing type contract) |
| Application | `src/application/use-cases/` | `ProcessMessageUseCaseImpl`, `IngestKnowledgeUseCaseImpl` |
| Domain | `src/domains/ai/` | Entities (`MessageRequest`, `MessageResponse`, `ConversationContext`, `AITask`, `PromptTemplate`), value objects (`AIProvider`, `AITaskType`), services (`PromptTemplateService`, `CultureDetectionService`) |
| Outbound ports | `src/ports/out/` | `AIProviderPort`, `ChainExecutorPort`, `VectorStorePort`, `ConversationRepository`, `PromptTemplateRepository` |
| Outbound adapters | `src/adapters/out/` | `langchain/` (adapter base, executor, providers, RAG stores), `mongodb/` (two repositories), `ingest/DocumentProcessor` |
| Config | `src/config/` | `aiConfig.ts` (all env parsing/validation), `langsmith.ts` |

Wiring happens in `createGrpcServer()` — it constructs the provider, the prompt-template repository, the chain executor, the conversation repository, and the use case, then registers the RPC handler. There is no DI container.

Domain entities validate in their constructors: `MessageRequest` requires non-empty `messageContent`, `messageType`, `userId`, and `stepId`; `MessageResponse` requires a non-empty response string. An empty LLM answer therefore surfaces as an error, not as an empty reply.

## Request flow — gRPC ProcessMessage

```
Viber (user is on a step with isAi=true)
  └─ AiServiceGrpcClient.ProcessMessage
      └─ adapters/in/grpc/server.ts
          map request → MessageRequest
          └─ ProcessMessageUseCaseImpl.execute
              1. load ConversationContext for userId (Mongo)      ← failure: warn, continue without history
              2. resolve effective task type (see below)
              3. build AITask { taskType, ragEnabled, metadata }
              4. ChainExecutorPort.executeTask(task, messageContent, context)
                   └─ LangChainAdapter.generateResponse → LLM
              5. save user message, then assistant message (Mongo) ← failures: warn, response still returned
              6. return MessageResponse { response, model, processingTimeMs }
          map → { response } and send back
```

Every step is synchronous within the RPC — there is no queue, no streaming, and no partial response. `AITask.metadata` carries `{ stepId, messageType, userId }`, which is only consumed by the custom chain.

Note that `MessageResponse` carries `model` and `processingTimeMs`, but the proto response has a single `response` field, so those values are logged on the AI side and never reach viber. `tokensUsed` is always `undefined` — the use case never populates it.

## Chain selection

Three task types exist (`AITaskType`): `simple`, `rag`, `custom`. The effective type is resolved in `ProcessMessageUseCaseImpl.execute` and re-checked in `LangChainExecutor.resolveEffectiveTaskType`:

1. An explicit value wins — gRPC `ProcessMessageRequest.taskType` first, then env `AI_TASK_TYPE`.
2. An unparseable explicit value logs a warning and falls back to `simple`.
3. If no explicit value is set, `RAG_ENABLED=true` selects `rag`, otherwise `simple`.

`ragEnabled` on the task is `aiConfig.rag.enabled || explicitTaskType === "rag"`.

Because `.env.example` ships `AI_TASK_TYPE=simple`, setting `RAG_ENABLED=true` alone does not engage retrieval — you must unset `AI_TASK_TYPE` or set it to `rag`. Viber never sends `taskType` today, so the AI service environment decides the chain for all bot traffic.

If the RAG chain is selected but throws (no vector store, Chroma down, embedding failure), the executor logs a warning and **falls back to the simple chain** rather than failing the request.

## Chains in detail

### Simple

`executeSimpleChain` builds a system prompt before calling the provider:

1. Load the template named by `BULGARIAN_CULTURE_PROMPT_TEMPLATE` (default `bulgarian_culture_system`) from Mongo.
2. If `CultureDetectionService.isBulgarianCultureRelated(prompt)` matches (keyword list, Cyrillic and Latin), try `<name>_enhanced` and use it when present; otherwise use the base template.
3. Append a hard instruction: keep the answer under 700 characters, do not reveal chain-of-thought. If no template was found, that instruction alone becomes the system prompt.
4. After generation, `<think>` and `<thinking>` blocks are stripped from the answer — relevant for reasoning-style local models.

The reasoning strip and the template lookup apply to the simple chain **only**. RAG and custom answers are returned as produced by the model.

### RAG

`executeRAGChain` requires a non-null vector store. It runs `similaritySearch(query, RAG_RETRIEVER_K, RAG_SIMILARITY_THRESHOLD)`, formats hits as `[Document N]` blocks, and wraps them in a prompt that instructs the model to answer from context, stay under 700 characters, copy Google Maps URLs verbatim, and recommend only items present in the context. An active managed RAG template in Mongo overrides that fallback. An empty collection returns no documents; the prompt still runs with an empty context block. Details and ingest limits: [rag.md](./rag.md).

### Custom

`executeCustomChain` loads a named template, renders `{variable}` placeholders through `PromptTemplateService.renderTemplate`, and appends the 700-character cap. The template name comes from `PROMPT_TEMPLATE_DEFAULT` (the use case only sets it for `custom` tasks); a custom task without a template name throws. Variables are the stringified `AITask.metadata` (`stepId`, `messageType`, `userId`), plus `input` set to the user message when the template does not already declare `input` / `query` / `message`. `PromptTemplate.validateVariables` throws when a declared placeholder has no value, so template authoring and the metadata keys must stay in sync.

## AI providers

`createAIProvider(logger)` reads `AI_MODEL_PROVIDER` and returns one of four adapters, all extending `LangChainAdapter` (which implements `AIProviderPort`):

| Provider | Adapter | Model env | Notes |
|----------|---------|-----------|-------|
| `ollama` (default) | `OllamaProvider` → `ChatOllama` | `OLLAMA_MODEL` (default `qwen3:4b`) | `OLLAMA_BASE_URL`, Compose profile `local-llm` |
| `openai` | `OpenAIProvider` → `ChatOpenAI` | `OPENAI_MODEL` (default `gpt-3.5-turbo`) | `OPENAI_API_KEY` required |
| `anthropic` | `AnthropicProvider` → `ChatAnthropic` | `ANTHROPIC_MODEL` (required) | `ANTHROPIC_API_KEY` required |
| `google` | `GoogleProvider` → `ChatGoogleGenerativeAI` | `GOOGLE_AI_MODEL` (default `gemini-pro`) | `GOOGLE_AI_API_KEY` required |

Missing keys throw during `getAIConfig()`, which runs on the first request path that touches config as well as at provider creation.

`LangChainAdapter.generateResponse` builds a `ChatPromptTemplate` of `[optional system] + MessagesPlaceholder("chat_history") + human "{input}"`, runs it through an `LLMChain`, and retries transient failures **3 times with exponential backoff** (1 s, 2 s, 4 s) before rethrowing. Token usage is read from `response_metadata.usage_metadata` when the provider supplies it and is logged only.

## Conversation history

`MongoConversationRepository` (collection `conversations`, one document per `userId`) upserts and `$push`es each message:

```ts
{ userId, messages: [{ role: "user" | "assistant", content, timestamp }], metadata, createdAt, updatedAt }
```

Only the last `CONVERSATION_MAX_HISTORY` messages (default 15) are loaded, stored, and sent to the model. Mongo `$push` uses `$slice: -N` so older messages are dropped on write; reads use the same slice. `LangChainAdapter` also trims via `ConversationContext.getRecentMessages(n)` before building `chat_history`. There is no process-scoped LangChain memory — history is Mongo-only and per request, so multiple AI service replicas stay consistent.

`CONVERSATION_MEMORY_TYPE` is parsed and validated in `aiConfig.ts` but unused (`buffer` / `summary` have no effect). History load/save failures never fail the request; they are logged as warnings, so a Mongo outage degrades to stateless answers rather than errors.

`clearConversationHistory(userId)` exists on the port and adapter but no inbound adapter calls it — there is no "reset conversation" API.

## Prompt templates

`MongoPromptTemplateRepository` (collection `prompt_templates`) implements get / getDefault / save / list / delete. Documents are `{ name, template, taskType, variables, description, createdAt, updatedAt }`, keyed by `name`.

`initBulgarianCulturePrompt()` runs at startup and upserts the base `bulgarian_culture_system` template from `src/scripts/bulgarianCulturePromptTemplate.ts`. It is idempotent. The `_enhanced` variant used for culture-related questions is **not** seeded — create it manually if you want the enhanced path to trigger.

There is no admin UI or API for prompt templates; they are managed directly in Mongo or through the seed script.

## Knowledge base and RAG

Ingest is an inbound HTTP adapter (`routes/knowledgeBase.ts`) over `IngestKnowledgeUseCaseImpl`. Two middlewares run before anything else: the service-token check (503 when `AI_SERVICE_TOKEN` is unset on the AI service, 401 on mismatch), then the RAG guard (503 when the vector store is `null`).

Processing is synchronous on the request: extract → chunk → embed → write. `DocumentProcessor` handles PDF (`pdf-parse`), Markdown, plain text, HTML-at-URL (`cheerio`, stripping `script/style/nav/footer/noscript/svg`), and Excel `.xlsx` (exceljs). Free-text files and URLs use `RecursiveCharacterTextSplitter` with `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP`. Spreadsheets bypass the splitter: one data row = one chunk with headers inlined; address-like columns get a precomputed Google Maps directions URL. URLs are fetched three at a time; a per-item failure is reported in the result and never aborts the batch.

Every chunk carries `{ sourceId, source, sourceType, fileType, chunkIndex, ingestedAt }`, which is how `listSources` groups and how per-source delete works. Two implementations sit behind `VectorStorePort`: `ChromaVectorStore` (persistent, Compose profile `rag`) and `MemoryVectorStoreAdapter` (ephemeral, tests). Chroma delete takes a metadata `where` filter, not Mongo `deleteMany` semantics.

Full limits, chunk metadata, and enablement recipes: [rag.md](./rag.md).

## Consumers

There are exactly two consumers, and neither shares a database with the AI service.

### Viber service — gRPC (message processing)

Trigger, in `MessageHandler.handleMessage`: the user has a `currentStepId`, the bot cache resolves that step, `step.isAi === true`, and the message text does **not** contain the configured `buttonsPrefix` (so button presses still route to normal step handling). Media messages are flattened to a text description first — a picture becomes `<url> | Text: ...`, a location becomes `lat,lng`, a contact becomes `Contact: name (phone)`, and so on.

The call chain is unchanged (`MessageHandler` → `ViberAiService.handleMessage` → `AiServiceGrpcClient.processMessage`, `services/viber/src/adapters/out/grpc/AiServiceGrpcClient.ts`), targeting `AI_SERVICE_GRPC_HOST:AI_SERVICE_GRPC_PORT` (defaults `localhost:50051`) with insecure credentials. When `AI_THINKING_GIF_URL` is set, viber sends a keyboard-only thinking message (6×2 GIF, no `"..."` bubble) before the gRPC call, then sends the answer as `Message.Text` with the step keyboard restored. On empty/error after a thinking send, viber sends another keyboard-only message with that restore keyboard.

Failure behaviour: `ViberAiService` still catches everything, logs, and does not rethrow. The restore keyboard is sent only when a thinking keyboard was already sent (so the GIF is replaced). If the thinking indicator was skipped or failed to send, a down AI service still produces no user reply. Viber also never sets `taskType`, so chain selection is entirely an AI-service env concern.

#### Carousel directive (viber-side interpretation)

The gRPC contract is unchanged — the reply is one string. Viber, however, parses every non-empty reply for a JSON **carousel directive** and renders it as a Viber rich-media carousel instead of a text bubble (`services/viber/src/application/services/AiCarouselDirective.ts`; render details in [viber.md](./viber.md)). The AI service needs no code change: whether the model produces the directive is purely prompt-template content.

Directive schema the model must emit (as its ENTIRE reply):

```json
{
  "type": "carousel",
  "text": "optional intro sentence",
  "cards": [
    {
      "title": "Item name",
      "description": "one short sentence",
      "image": "https://... (optional)",
      "buttons": [
        { "text": "Open map", "actionType": "open-url", "actionBody": "https://..." },
        { "text": "Tell me more", "actionType": "reply", "actionBody": "Tell me more about Item name" }
      ]
    }
  ]
}
```

Ready-to-paste block for a managed prompt template (per-step via `StepDTO.aiPromptName`, or the RAG/simple template):

```text
When your answer recommends or lists multiple concrete items (places, tours, events, options),
respond with ONLY a JSON object in exactly this shape and nothing else — no markdown, no code
fences, no text before or after:

{"type":"carousel","text":"<one short intro sentence>","cards":[{"title":"<item name>","description":"<one short sentence>","image":"<https image URL, omit this key if unknown>","buttons":[{"text":"<label>","actionType":"open-url","actionBody":"<https URL>"},{"text":"Tell me more","actionType":"reply","actionBody":"Tell me more about <item name>"}]}]}

Rules:
- At most 6 cards; every card needs at least a "title".
- Include "image" only when a real image URL appears in the provided context — never invent URLs.
- "actionType" is "reply" or "open-url" only. A "reply" button sends its actionBody back to you as the user's next message.
- For a normal single answer, reply with plain text as usual (no JSON).
```

Caveat: `executeSimpleChain` appends a hard "under 700 characters" instruction, which pushes the model toward fewer cards. Acceptable for now; relaxing the cap for carousel prompts would be an AI-side change. Viber's parser strips code fences defensively, and any reply that is not a valid directive (or validates to zero cards) is sent as plain text.

### Admin service — REST (knowledge base)

`services/admin/src/app/api/knowledge-base/**` are thin proxies over `forwardToAiService` (`src/lib/aiService.ts`). Each route forwards to `AI_SERVICE_URL` (default `http://localhost:3002`) with an `X-Service-Token` header and passes the AI body and status through unchanged. Admin owns no knowledge-base data.

Proxy-level errors added by admin: `AI_SERVICE_NOT_CONFIGURED` (503, token unset on admin) and `AI_SERVICE_UNAVAILABLE` (502, AI unreachable). `AI_SERVICE_TOKEN` must be identical on both services.

### Not consumers

Nothing consumes AI over RabbitMQ (`ai.processed` is named in shared types but unwired), the browser never reaches the AI service directly, and no service reads the `ai` Mongo database except the AI service itself.

## Contracts

### gRPC — `packages/shared/proto/ai_service.proto`

Both sides load the same proto file from the shared package at runtime (`PathUtils.findProjectRoot`), so the contract cannot drift between services.

```protobuf
service AIProcessingService {
  rpc ProcessMessage(ProcessMessageRequest) returns (ProcessMessageResponse);
}

message ProcessMessageRequest {
  string messageContent = 1;
  string messageType = 2;
  string userId = 3;
  string stepId = 4;
  UserProfile userProfile = 5;  // { id, name, avatar }
  string taskType = 6;          // "simple" | "rag" | "custom" (optional)
}

message ProcessMessageResponse {
  string response = 1;
}
```

Required by the domain entity: `messageContent`, `messageType`, `userId`, `stepId`. `userProfile` is mapped but currently unused by the use case. `taskType` is optional.

gRPC status codes are derived from substring matching on the error message in `adapters/in/grpc/server.ts`:

| Condition in the error message | Status | Client-visible message |
|--------------------------------|--------|------------------------|
| `api key`, `authentication`, `unauthorized` | `UNAUTHENTICATED` | Authentication failed with AI provider |
| `rate limit`, `quota`, `too many requests` | `RESOURCE_EXHAUSTED` | AI provider rate limit exceeded |
| `database`, `mongodb`, `connection`, `repository` | `UNAVAILABLE` | Database connection error |
| `invalid`, `validation`, `required` | `INVALID_ARGUMENT` | original message |
| `not found`, `missing` | `NOT_FOUND` | original message |
| anything else | `INTERNAL` | original message |

The use case prefixes errors first (`AI provider error:`, `Repository error:`, `Chain execution error:`, `Processing error:`), so the classification usually lands on the intended bucket — but it is string matching, not typed errors.

### HTTP

`GET /api/health` — public, returns a `HealthCheckResponse` with `status`, `service`, `version`, `uptime`, and `dependencies`. Mongo is really pinged; `aiProvider: "connected"` is a hardcoded placeholder, so a broken LLM key still reports healthy. Status is `200` when ok, `503` otherwise.

`GET /` — service stub (`{ service, version, status }`).

Knowledge base — all paths require `X-Service-Token`, responses are `ApiResponse<T>`:

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/knowledge-base/files` | multipart `files` (≤10 files × ≤`INGEST_MAX_FILE_SIZE_MB`, `.pdf` / `.md` / `.txt` / `.xlsx`) | `IngestResult` |
| `POST` | `/api/knowledge-base/urls` | `{ "urls": string[] }` (1–`INGEST_MAX_URLS`) | `IngestResult` |
| `GET` | `/api/knowledge-base/sources` | — | `KnowledgeSource[]` |
| `DELETE` | `/api/knowledge-base/sources/:sourceId` | — | `{ "deleted": true }` |
| `DELETE` | `/api/knowledge-base/sources` | — | `{ "cleared": true }` |

Error codes: `INGEST_NOT_CONFIGURED` / `RAG_DISABLED` (503), `UNAUTHORIZED` (401), `NO_FILES` / `INVALID_URLS` / `INGEST_VALIDATION` (400), `INGEST_FAILED` (500). Outside the knowledge-base router, unhandled errors return `SVC_002` (500) and unknown paths `SVC_001` (404).

### Shared types

The ingest contract lives on the inbound port `src/ports/in/IngestKnowledgeUseCase.ts` — deliberately not in `@vbar/shared`; admin mirrors these shapes in its `entities/knowledge-base` slice.

```ts
interface IngestResult {
  items: { source: string; status: "success" | "error"; chunks?: number; sourceId?: string; error?: string }[];
  totalChunks: number;
}

interface KnowledgeSource {
  sourceId: string;
  source: string;       // filename or URL
  sourceType: string;   // "file" | "url"
  chunkCount: number;
  ingestedAt: string;   // ISO date
}
```

## Configuration

All env parsing and validation is centralised in `src/config/aiConfig.ts` via `ConfigHelper`. Invalid enum values throw at config load.

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3002` | Express HTTP port |
| `GRPC_PORT` | `50051` | gRPC port |
| `MONGODB_URI` / `MONGODB_DB_NAME` | local URI / `ai` | Conversation history + prompt templates |
| `AI_MODEL_PROVIDER` | `ollama` | `ollama` / `openai` / `anthropic` / `google` |
| `AI_TEMPERATURE` | `0.7` | Sampling temperature |
| `AI_MAX_TOKENS` | unset | Optional response cap |
| `AI_TASK_TYPE` | unset (`simple` in `.env.example`) | Explicit chain override |
| `CONVERSATION_MEMORY_TYPE` / `CONVERSATION_MAX_HISTORY` | `buffer` / `15` | Memory type unused; max history limits Mongo and the model prompt |
| `PROMPT_TEMPLATES_ENABLED` / `PROMPT_TEMPLATE_STORAGE` / `PROMPT_TEMPLATE_DEFAULT` | `true` / `mongodb` / unset | Template storage and custom-chain template |
| `BULGARIAN_CULTURE_PROMPT_TEMPLATE` | `bulgarian_culture_system` | System-prompt template name for the simple chain |
| `AI_SERVICE_TOKEN` | unset | Inbound ingest auth; must match admin |
| `RAG_*`, `CHROMA_URL`, `INGEST_*` | see [rag.md](./rag.md) | Retrieval and ingest |
| `LANGSMITH_TRACING` / `LANGSMITH_API_KEY` / `LANGSMITH_PROJECT` / `LANGSMITH_ENDPOINT` | `false` / — | Optional tracing |

Provider keys are required only for the selected provider. `PROMPT_TEMPLATES_ENABLED` is read into config but the executor always consults the template repository, so disabling it does not currently bypass template lookups.

## Storage

| Store | Contents | When |
|-------|----------|------|
| Mongo `ai.conversations` | Per-user message history | Always |
| Mongo `ai.prompt_templates` | Named prompt strings | Always |
| Chroma collection (`RAG_VECTOR_STORE_COLLECTION`, default `embeddings`) | One embedding per ingested chunk | `RAG_ENABLED=true` + `RAG_VECTOR_STORE_TYPE=chroma` |
| In-memory store | Same shape, ephemeral | `RAG_VECTOR_STORE_TYPE=memory` |

Field-level detail: [databases.md](./databases.md).

## Observability and error handling

Logging goes through `ConsoleLogger("AIService")` from `@vbar/shared`, with structured payloads at the interesting boundaries: request received, provider/model/task-type selection, chosen chain, LLM call initiated, response generated (length, latency, token usage when available), and processing finished (`processingTimeMs`).

LangSmith tracing is opt-in: `initializeLangSmith()` maps `LANGSMITH_*` to the `LANGCHAIN_*` variables LangChain reads. When `LANGSMITH_TRACING=true` without an API key it warns and continues.

Degradation is layered — history failures warn and continue, RAG failures fall back to the simple chain, provider failures retry three times, and only then does the RPC fail. On the viber side that failure is swallowed, so the observable symptom of a broken AI service is silence in the chat plus errors in both services' logs.

## Deployment

Compose service `ai` (container `vbar-ai`, image `ghcr.io/valiobar/vbar-ai`):

- Publishes `127.0.0.1:3002` only. **gRPC 50051 is not published** — it is reachable only on `vbar-network`, which is why viber must run in Compose to talk to it.
- `depends_on: mongodb (service_healthy)`. It deliberately does not depend on `chromadb`, because a profiled dependency would break the default `docker compose up`.
- Healthcheck fetches `http://127.0.0.1:3002/api/health` every 30 s.
- Env comes from the root `.env` file plus explicit overrides (Mongo URI, `CHROMA_URL=http://chromadb:8000`, provider settings, ingest limits).

The Dockerfile is a three-stage Node 20 Alpine build that also builds `packages/shared` and copies `packages/shared/proto` into the runner — the proto must exist at runtime because it is loaded dynamically. The process runs as a non-root `ai` user.

Local development: `npm run dev:ai` (tsx watch). Start Chroma separately with `--profile rag` if you want retrieval.

## Security notes

- The gRPC server uses `ServerCredentials.createInsecure()` and performs **no authentication**. Anything that can reach port 50051 can spend LLM budget and read nothing but its own answers. Keeping the port off the host bind is the only control today.
- Ingest routes are protected by a shared static token (`X-Service-Token`), compared with a plain string equality check.
- User messages are stored in Mongo verbatim and forwarded to whichever provider is configured; there is no redaction or retention policy.

## Known gaps

- `CONVERSATION_MEMORY_TYPE` is inert (`buffer` / `summary` have no effect).
- No API to clear a user's conversation, even though the port method exists.
- Health reports the AI provider as `connected` unconditionally.
- `tokensUsed`, `model`, and `processingTimeMs` never cross the gRPC boundary.
- No REST process / intent / batch endpoints (use gRPC), no streaming responses, no async ingest jobs.
- `local` embedding provider throws; only `openai` and `ollama` work.
- Prompt templates have no management UI or API.

## Related documentation

- [Architecture](./architecture.md) — system topology and service boundaries
- [API](./api.md) — full API reference across services
- [RAG](./rag.md) — retrieval, ingest limits, and enablement
- [Databases](./databases.md) — collections, fields, and Chroma metadata
- [Admin service](./admin.md) — the knowledge-base UI and proxy
- [Viber service](./viber.md) — when and how ProcessMessage is called
- [Setup](./setup.md) / [Deployment](./deployment.md)
- [AI service README](../services/ai/README.md)
