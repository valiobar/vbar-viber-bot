# RAG (Retrieval Augmented Generation)

How the AI service retrieves documents and injects them into the LLM prompt. Documents enter the vector store through the knowledge-base ingest API (Admin UI or AI REST).

## Table of Contents

1. [Overview](#overview)
2. [When RAG runs](#when-rag-runs)
3. [Request flow](#request-flow)
4. [Implementation](#implementation)
5. [Knowledge base ingest](#knowledge-base-ingest)
6. [How to enable it](#how-to-enable-it)
7. [Environment](#environment)
8. [What is not implemented](#what-is-not-implemented)

## Overview

RAG is an optional chain type on the AI service. On a matching request the executor:

1. Embeds the user query
2. Searches a vector store for similar documents (`k` + optional score threshold)
3. Injects those documents as context into a prompt
4. Calls the configured LLM (`AI_MODEL_PROVIDER`)

Persistent vectors live in **self-hosted Chroma**, not in Mongo. The `ai` Mongo database stays conversation history and prompt templates only. An in-memory store is available for tests.

Default Compose always starts Chroma (`vbar-chromadb`).

## When RAG runs

Chain selection (in `ProcessMessageUseCase` → `LangChainExecutor.executeTask`):

1. **Explicit `taskType` wins.** gRPC `ProcessMessageRequest.taskType` or env `AI_TASK_TYPE` (`simple` / `rag` / `custom`).
2. If that value is **unset**, `RAG_ENABLED=true` selects the RAG chain.
3. `.env.example` sets `AI_TASK_TYPE=simple`, so `RAG_ENABLED=true` alone does **not** engage RAG until you unset `AI_TASK_TYPE` or set it to `rag`.

The vector store is created only when `RAG_ENABLED=true`. To actually retrieve context you need both:

| Goal | Required |
|------|----------|
| Create Chroma / memory store at AI startup | `RAG_ENABLED=true` |
| Select the RAG chain | `AI_TASK_TYPE=rag`, or unset `AI_TASK_TYPE` while `RAG_ENABLED=true`, or gRPC `taskType=rag` |

If the RAG chain is selected but the store is missing or Chroma is down, the executor logs the error and **falls back to the simple chain**.

Viber does not set `taskType` today; the AI service env decides the chain.

## Request flow

```
Viber (AI step) --gRPC ProcessMessage--> AI
  ProcessMessageUseCase
    load conversation history from Mongo (ai.conversations)
    choose task type (see above)
    LangChainExecutor.executeTask
      executeRAGChain
        VectorStorePort.similaritySearch(query, retrieverK, similarityThreshold)
        build prompt with [Document N] blocks
        AIProviderPort.generateResponse
    save user + assistant messages to Mongo
```

`executeRAGChain` reads `getAIConfig().rag.retrieverK` and `.similarityThreshold` (defaults 4 / 0.7). Retrieved text is formatted as `[Document N]` blocks. The built-in fallback prompt tells the model to answer from context, stay under 700 characters, copy Google Maps URLs verbatim, and recommend only items that appear in the context (see [RAG prompt rules](#rag-prompt-rules-maps--recommendations)). An active managed RAG template in Mongo **replaces** that fallback.

An empty collection returns `[]`. The prompt still runs, with no context. Ingest files or URLs from Admin `/knowledge-base` (or the AI REST API) so retrieval has documents.

## Implementation

AI already uses Ports & Adapters for the LLM and the vector store. `VectorStorePort` stays because there are two real implementations: Chroma (persistent) and memory (tests).

| Piece | Path | Role |
|-------|------|------|
| Port | `services/ai/src/ports/out/VectorStorePort.ts` | `addDocuments`, `similaritySearch`, `deleteDocuments`, `clear`, `listSources` |
| Chroma adapter | `services/ai/src/adapters/out/langchain/rag/ChromaVectorStore.ts` | LangChain `Chroma` + `chromadb` client |
| Memory adapter | `services/ai/src/adapters/out/langchain/rag/MemoryVectorStore.ts` | Ephemeral; process-local |
| Embeddings | `services/ai/src/adapters/out/langchain/rag/EmbeddingProvider.ts` | `openai` or `ollama` (`local` throws) |
| Factory | `services/ai/src/adapters/out/langchain/rag/VectorStoreFactory.ts` | Returns `null` when `RAG_ENABLED=false` |
| Ingest use case | `services/ai/src/application/use-cases/IngestKnowledgeUseCase.ts` | Extract, chunk, embed, store; list / delete / clear |
| Document processor | `services/ai/src/adapters/out/ingest/DocumentProcessor.ts` | PDF / MD / TXT / HTML → text + char chunks; `.xlsx` → one chunk per data row |
| HTTP routes | `services/ai/src/adapters/in/routes/knowledgeBase.ts` | `/api/knowledge-base/*` + `X-Service-Token` |
| Chain | `services/ai/src/adapters/out/langchain/ChainExecutor.ts` | `executeRAGChain` |
| Config | `services/ai/src/config/aiConfig.ts` | Env via `ConfigHelper` (`ingest` + `serviceToken`) |
| Wiring | `services/ai/src/index.ts` | Shared `createVectorStore` for HTTP + gRPC |

Dependency direction: HTTP / gRPC adapters → factory → `VectorStorePort` → Chroma or memory. No Chroma helper in `@vbar/shared/infra` (that package is Mongo + RabbitMQ only).

Chroma `deleteDocuments` accepts a metadata `where` filter, not Mongo `deleteMany`. Empty filters throw; use `clear()` to wipe the collection. Connection refused logs `CHROMA_URL` and that the `chromadb` service must be running.

## Knowledge base ingest

Synchronous: the HTTP request waits until extraction, chunking, embedding, and store writes finish. A batch of 20 URLs can take 30–60 s. There is no job queue.

### Limits

| Limit | Value | Config |
|-------|--------|--------|
| Files per request | ≤10 | multer `files` |
| File size | ≤10 MB | `INGEST_MAX_FILE_SIZE_MB` |
| File types | `.pdf`, `.md`, `.txt`, `.xlsx` (or `application/pdf` / `text/*` / the OpenXML spreadsheet MIME type) | route filter |
| URLs per request | ≤20 | `INGEST_MAX_URLS` |
| URL schemes | `http` / `https` | use case validation |
| URL fetch timeout | 15 s | `INGEST_URL_TIMEOUT_MS` |

### Formats and chunking

| Format | Extraction | Chunking |
|---|---|---|
| .pdf / .md / .txt / URL | pdf-parse / utf-8 / cheerio | RecursiveCharacterTextSplitter (RAG_CHUNK_SIZE / RAG_CHUNK_OVERLAP) |
| .xlsx | exceljs, row by row | 1 row = 1 chunk, headers inlined (`Лист "{sheet}", ред {n} — Име: … \| Адрес: …`); rows with an address-like header (`адрес`/`address`/`локация`/`местоположение`/`location`) get a `https://www.google.com/maps/dir/?api=1&destination=<encodeURIComponent(име, адрес)>` line |

Free-text files and URLs still go through `RecursiveCharacterTextSplitter` (`@langchain/textsplitters`): `RAG_CHUNK_SIZE` (default 1000) and `RAG_CHUNK_OVERLAP` (default 200). **`.xlsx` bypasses the character splitter** — character chunking would merge unrelated table rows and cut cells mid-value. `IngestKnowledgeUseCase.ingestFiles` branches on the `.xlsx` extension and calls `DocumentProcessor.extractRowsFromXlsx` instead of `extractFromFile` + `chunk`.

Each resulting chunk (either kind) is embedded with the configured `RAG_EMBEDDING_PROVIDER` and written via `VectorStorePort.addDocuments`. For a spreadsheet, `chunks` in the ingest response equals the number of data rows (the header row is not a chunk).

#### Spreadsheet rows (`.xlsx`)

`extractRowsFromXlsx` loads the workbook with exceljs. On every worksheet the first non-empty row is the header; every later non-empty row becomes exactly one self-contained chunk with the sheet name, 1-based row number, and header labels inlined:

```text
Лист "Обекти", ред 3 — Име: Офис Пловдив | Адрес: бул. България 1, Пловдив | Телефон: 032123456
Google Maps посока: https://www.google.com/maps/dir/?api=1&destination=...
```

Empty cells are skipped. A header-only or empty workbook throws (`No extractable rows…`); the per-file catch in `ingestFiles` records `status: "error"` for that file and continues the batch.

**Locations / Maps enrichment.** If a header matches an address keyword (`адрес`, `address`, `местоположение`, `локация`, `location` — case-insensitive substring), the chunk gets a precomputed Google Maps directions URL: `https://www.google.com/maps/dir/?api=1&destination=<encodeURIComponent(destination)>`. When a name-like column also exists (`име`, `назв`, `name`, `обект` — not `продукт`), the destination is `"{name}, {address}"` so Google can match the place. Encoding is done at ingest (`encodeURIComponent`, Cyrillic-safe); the LLM must copy the URL verbatim and never build or alter it.

**Products table.** A sheet with no address-like header (names, descriptions, prices, …) produces the same `Лист/ред` row chunks **without** a Maps line. That is the expected products path, not an error. Recommendation answers compare at most `RAG_RETRIEVER_K` retrieved rows, not the whole catalog.

#### RAG prompt rules (Maps + recommendations)

The built-in RAG fallback wrapper in `LangChainExecutor.executeRAGChain` adds two rules on top of the 700-character cap:

- If the user asks where a place is, for an address, or how to get there, and the context contains a Google Maps URL for it, include that URL **verbatim on its own line**. Never construct or alter Maps URLs.
- If the user asks for a recommendation or comparison, suggest only items that appear in the context, using their exact names and a one-line reason. If nothing fits, say so — never invent products.

**Operational note:** an **active managed RAG prompt in Mongo overrides this fallback**. The same Maps / recommendation rules must be present on the active RAG template (admin Prompts UI) or the feature regresses silently even though ingest still writes the URLs into the chunks. Viber sends answers as `Message.Text`; clients auto-linkify `https://` URLs, so a copied Maps link is tappable with no Viber-service change.

### Chunk metadata

Stored on every vector. Sources are grouped by `sourceId` for list / delete.

```ts
{
  sourceId: string;
  source: string;          // filename or URL
  sourceType: "file" | "url";
  fileType: "pdf" | "md" | "txt" | "html" | "xlsx";
  chunkIndex: number;
  ingestedAt: string;      // ISO date
}
```

Pre-existing chunks without `sourceId` are skipped by `listSources` and per-source delete; "Clear all" removes them.

Duplicate ingest of the same file or URL creates a second source (no content dedupe). Delete the older source if you want a single copy.

### AI REST

All paths under `/api/knowledge-base` require `X-Service-Token` (`AI_SERVICE_TOKEN`). Responses are `ApiResponse<T>`. See [api.md](./api.md).

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/knowledge-base/files` | multipart `files` | `IngestResult` |
| `POST` | `/api/knowledge-base/urls` | `{ "urls": string[] }` | `IngestResult` |
| `GET` | `/api/knowledge-base/sources` | — | `KnowledgeSource[]` |
| `DELETE` | `/api/knowledge-base/sources/:sourceId` | — | `{ "deleted": true }` |
| `DELETE` | `/api/knowledge-base/sources` | — | `{ "cleared": true }` |

### Admin UI

`/knowledge-base` (JWT). Upload files (PDF, Markdown, plain text, or Excel `.xlsx` — spreadsheets are indexed row by row), paste up to 20 URLs (one per line), list ingested sources, delete one source, or clear the collection. Admin is a **thin proxy**: `app/api/knowledge-base/*` forwards to AI with `X-Service-Token`. Admin owns no knowledge-base data (vectors live in Chroma behind AI), so there is no admin repository or domain service.

`AI_SERVICE_TOKEN` must be identical on admin (outbound) and ai (inbound). Mismatch or an unset token on either side fails loudly (401 / 503), not silently.

## How to enable it

### Compose (recommended)

```bash
# Start the default stack (includes Chroma)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
```

In root `.env`:

```env
RAG_ENABLED=true
AI_TASK_TYPE=rag
RAG_VECTOR_STORE_TYPE=chroma
RAG_EMBEDDING_PROVIDER=openai
# OPENAI_API_KEY must be set for OpenAI embeddings
```

Compose hardcodes `CHROMA_URL=http://chromadb:8000` on the `ai` service. `ai` waits for `chromadb` to be healthy.

Heartbeat (pinned image `chromadb/chroma:0.6.3`): `http://localhost:8000/api/v1/heartbeat`.

### Host npm (`npm run dev:ai`)

Start Chroma first (`docker compose ... up -d chromadb`), then:

```env
CHROMA_URL=http://localhost:8000
RAG_ENABLED=true
AI_TASK_TYPE=rag
```

### Memory store (tests / ephemeral)

```env
RAG_ENABLED=true
RAG_VECTOR_STORE_TYPE=memory
```

No Chroma process. Data is lost when the AI process exits.

Trigger RAG from a Viber step with `isAi=true` after the env is set, or call gRPC `ProcessMessage` with `taskType=rag`.

## Environment

| Variable | Default | Notes |
|----------|---------|--------|
| `RAG_ENABLED` | `false` | Factory returns `null` when false |
| `AI_TASK_TYPE` | `simple` in `.env.example` | Explicit win over `RAG_ENABLED` |
| `RAG_VECTOR_STORE_TYPE` | `chroma` | `chroma` \| `memory`. `mongodb` is a validation error |
| `CHROMA_URL` | `http://localhost:8000` | Compose: `http://chromadb:8000` |
| `RAG_VECTOR_STORE_COLLECTION` | `embeddings` | Chroma collection name |
| `RAG_EMBEDDING_PROVIDER` | `openai` | `openai` \| `ollama` (`local` not implemented) |
| `RAG_OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | |
| `RAG_OLLAMA_EMBEDDING_MODEL` | `nomic-embed-text` | Needs `--profile local-llm` if using Ollama |
| `RAG_RETRIEVER_K` | `4` | Documents to retrieve |
| `RAG_SIMILARITY_THRESHOLD` | `0.7` | Score filter; Chroma score scale may differ from the old Atlas path |
| `RAG_CHUNK_SIZE` | `1000` | Characters per ingest chunk |
| `RAG_CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `INGEST_MAX_URLS` | `20` | URLs per ingest request |
| `INGEST_MAX_FILE_SIZE_MB` | `10` | Per-file upload limit |
| `INGEST_URL_TIMEOUT_MS` | `15000` | Per-URL fetch timeout |
| `AI_SERVICE_TOKEN` | — | Must match on admin (outbound) and ai (inbound) |

`ai` `depends_on` Chroma (`service_healthy`). Default `docker compose up` starts 6 containers including `chromadb`.

## What is not implemented

- Seeding or migrating embeddings (none existed on the removed Mongo Atlas path)
- `local` embedding provider
- Async ingest jobs (processing is synchronous on the request)
- URL-to-PDF ingest (non-HTML / non-text URLs fail per item)
- `.xls` (legacy binary) and `.csv` ingest (exceljs reads `.xlsx` only)
- gRPC contract changes (still `ProcessMessage` + optional `taskType`)

## Related documentation

- [Architecture](./architecture.md) — RAG vs `AI_TASK_TYPE` precedence; Admin→AI REST
- [Databases](./databases.md) — `ai` Mongo collections + Chroma chunk metadata
- [Setup](./setup.md) — local Compose / host npm and try ingest
- [Deployment](./deployment.md) — Compose topology and env
- [API](./api.md) — gRPC `ProcessMessage` and `/api/knowledge-base/*`
- [AI service](./ai.md) — AI architecture, chains, consumers, contracts
- [Viber service](./viber.md) — AI-step gating and gRPC request fields
- [AI service README](../services/ai/README.md)
