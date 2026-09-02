# AI Service

AI Service for the Viber bot — Express + gRPC, LangChain providers, Mongo-backed per-user history.

## Overview

- gRPC `ProcessMessage` for viber (primary API)
- LangChain chains: simple, RAG, custom
- Per-user conversation history in Mongo (no process-wide shared memory)
- Multi-provider models: Ollama, OpenAI, Anthropic, Google
- Optional LangSmith tracing
- HTTP `GET /api/health` and `/api/knowledge-base/*` ingest — no REST process endpoints, no RabbitMQ

## Architecture

- `ProcessMessageUseCase` builds an `AITask` and calls `ChainExecutor`
- Provider adapters implement `AIProviderPort` (real multi-implementation boundary)
- Mongo via `@vbar/shared/infra` (`createMongoConnection` / `getMongoDatabase`)

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (ai database)
- **AI Framework**: **LangChain** (unified AI processing)
- **AI Providers**: Ollama (self-hosted), OpenAI, Anthropic, Google AI

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name (default: `ai`)
- `AI_MODEL_PROVIDER`: AI provider to use (`ollama`, `openai`, `anthropic`, `google`)

### Optional Variables

- `PORT`: Server port (default: `3002`)
- `GRPC_PORT`: gRPC server port (default: `50051`)

**AI Provider Configuration**:
- `AI_TEMPERATURE`: Temperature for AI responses (default: `0.7`)
- `AI_MAX_TOKENS`: Maximum tokens for responses (optional)
- Provider-specific API keys and model names (see `.env.example`)

**Conversation history**:
- Loaded and saved per `userId` in Mongo. Chains receive `chat_history` for that request only.
- `CONVERSATION_MEMORY_TYPE` is unused by the adapter (history is Mongo-only).

**Task type vs RAG (precedence)**:
- An **explicit** `AI_TASK_TYPE` (`simple` / `rag` / `custom`) on the request or in the environment wins.
- If `AI_TASK_TYPE` is unset, `RAG_ENABLED=true` selects the RAG chain.
- `.env.example` sets `AI_TASK_TYPE=simple`, so `RAG_ENABLED=true` alone will not engage RAG until that var is unset or set to `rag`.
- RAG failures fall back to the simple chain.

**RAG Configuration** (full guide: [rag.md](../../documentation/rag.md)):
- `RAG_ENABLED`: Creates the vector store; also selects RAG when `AI_TASK_TYPE` is unset — Default: `false`
- `RAG_EMBEDDING_PROVIDER`: Embedding provider (`openai`, `ollama`; `local` throws) — Default: `openai`
- `RAG_VECTOR_STORE_TYPE`: `chroma` (persistent) or `memory` (tests) — Default: `chroma`
- `CHROMA_URL`: Host `http://localhost:8000`; Compose `http://chromadb:8000`
- `RAG_VECTOR_STORE_COLLECTION`: Chroma collection name — Default: `embeddings`
- `RAG_RETRIEVER_K`: Number of documents to retrieve — Default: `4`
- `RAG_SIMILARITY_THRESHOLD`: Similarity threshold (0.0-1.0) — Default: `0.7`
- `RAG_CHUNK_SIZE` / `RAG_CHUNK_OVERLAP`: Ingest chunking — Defaults: `1000` / `200`
- `INGEST_MAX_URLS` / `INGEST_MAX_FILE_SIZE_MB`: Ingest limits — Defaults: `20` / `10`
- `INGEST_URL_TIMEOUT_MS`: Per-URL fetch timeout — Default: `15000`
- `AI_SERVICE_TOKEN`: Required for ingest routes; **must match** the token on admin

**Prompt Template Configuration**:
- `PROMPT_TEMPLATES_ENABLED`: Enable prompt templates - Default: `true`
- `PROMPT_TEMPLATE_STORAGE`: Storage type (`mongodb` or `file`) - Default: `mongodb`
- `PROMPT_TEMPLATE_DEFAULT`: Default template name (optional)

**LangSmith Observability (Optional)**:
- `LANGSMITH_TRACING`: Enable LangSmith tracing - Default: `false`
- `LANGSMITH_API_KEY`: LangSmith API key (required if tracing enabled)
- `LANGSMITH_PROJECT`: LangSmith project name (optional)
- `LANGSMITH_ENDPOINT`: LangSmith endpoint URL (optional)

## Development

### Prerequisites

- Node.js 20+
- MongoDB instance
- (Optional) Ollama instance for self-hosted AI models

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
```

### Running

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Building

```bash
# Build TypeScript
npm run build

# Type check only
npm run type-check

# Lint code
npm run lint
```

## API Endpoints

### Health Check

- `GET /api/health` — Mongo + AI provider (no message-queue component). Public.

### Knowledge Base ingest

All `/api/knowledge-base/*` routes require `X-Service-Token` (`AI_SERVICE_TOKEN`). Responses are `ApiResponse<T>`. Processing is synchronous.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `POST` | `/api/knowledge-base/files` | multipart `files` (≤10 × ≤10 MB, `.pdf` / `.md` / `.txt`) | `IngestResult` |
| `POST` | `/api/knowledge-base/urls` | `{ "urls": string[] }` (≤20) | `IngestResult` |
| `GET` | `/api/knowledge-base/sources` | — | `KnowledgeSource[]` |
| `DELETE` | `/api/knowledge-base/sources/:sourceId` | — | `{ deleted: true }` |
| `DELETE` | `/api/knowledge-base/sources` | — | `{ cleared: true }` |

Error codes: `RAG_DISABLED` / `INGEST_NOT_CONFIGURED` (503), `UNAUTHORIZED` (401), `INGEST_VALIDATION` / `INVALID_URLS` / `NO_FILES` (400), `INGEST_FAILED` (500).

There are no REST process / intent / training endpoints. Viber calls **gRPC** on port 50051.

## gRPC API

`AIProcessingService.ProcessMessage` on port `50051` (`GRPC_PORT`). See [API Documentation](../../documentation/api.md#grpc).

## Database

MongoDB database `ai`: per-user conversation history and prompt templates only. RAG vectors live in Chroma when RAG is on (`--profile rag`). See [rag.md](../../documentation/rag.md).

## LangChain Integration

The AI Service uses **LangChain** as the core framework for AI processing, providing:

### Unified AI Provider Interface

- LangChain adapters for all providers (OpenAI, Anthropic, Google, Ollama)
- Consistent interface via `BaseChatModel`
- Automatic LangSmith tracing when enabled

### Conversation history

Mongo-loaded `chat_history` is the only conversation context. There is no LangChain `BufferMemory` / `ConversationSummaryMemory` at adapter scope.

### Flexible Task System

- **Simple Chains**: Direct prompts to AI models
- **RAG Chains**: Retrieval Augmented Generation with vector store retrieval
- **Custom Chains**: Template-based chains with variable substitution
- Task type configurable via `AI_TASK_TYPE` environment variable

### RAG (Retrieval Augmented Generation)

- Vector store: Chroma (persistent) or in-memory (tests). Atlas / Mongo vector search is removed.
- Embedding providers: OpenAI or Ollama (`local` is not implemented)
- Similarity search with `RAG_RETRIEVER_K` and `RAG_SIMILARITY_THRESHOLD`
- Retrieved documents are injected into the RAG prompt
- Ingest via `/api/knowledge-base/*` (Admin UI or REST + `X-Service-Token`)
- Details: [rag.md](../../documentation/rag.md)

### Prompt Engineering

- Template storage (MongoDB or file-based)
- Variable substitution and rendering
- Default template configuration
- Template management via repository pattern

### LangSmith Observability

- Optional tracing integration for debugging and monitoring
- Automatic trace collection for all LangChain operations
- Token usage tracking (when available from providers)
- Latency and error tracking

## AI Model Providers

The AI Service supports multiple AI model providers through LangChain:

### Ollama (Self-Hosted)

- **URL**: Configured via `OLLAMA_BASE_URL` (default: `http://localhost:11434`)
- **Model**: Configured via `OLLAMA_MODEL` (default: `qwen3:4b`)
- **LangChain Adapter**: `ChatOllama`
- **Benefits**: Data privacy, cost control, offline capability

### OpenAI

- **API Key**: Configured via `OPENAI_API_KEY`
- **Model**: Configured via `OPENAI_MODEL` (default: `gpt-3.5-turbo`)
- **LangChain Adapter**: `ChatOpenAI`
- **Benefits**: High-quality responses, extensive model selection

### Anthropic

- **API Key**: Configured via `ANTHROPIC_API_KEY`
- **Model**: Configured via `ANTHROPIC_MODEL` (required)
- **LangChain Adapter**: `ChatAnthropic`
- **Benefits**: Advanced reasoning capabilities

### Google AI

- **API Key**: Configured via `GOOGLE_AI_API_KEY`
- **Model**: Configured via `GOOGLE_AI_MODEL` (default: `gemini-pro`)
- **LangChain Adapter**: `ChatGoogleGenerativeAI`
- **Benefits**: Multimodal capabilities

## Docker

### Build

```bash
docker build -t ai-service .
```

### Run

```bash
docker run -p 3002:3002 --env-file .env ai-service
```

## Project Structure

```
services/ai/
├── src/
│   ├── adapters/
│   │   ├── in/              # Input adapters (HTTP routes, gRPC server)
│   │   │   └── routes/      # Express routes
│   │   └── out/             # Output adapters
│   │       └── langchain/   # LangChain adapters
│   │           ├── LangChainAdapter.ts      # Base adapter class
│   │           ├── OpenAIAdapter.ts         # OpenAI implementation
│   │           ├── OllamaAdapter.ts          # Ollama implementation
│   │           ├── AnthropicAdapter.ts       # Anthropic implementation
│   │           ├── GoogleAdapter.ts          # Google implementation
│   │           ├── ChainExecutor.ts          # Chain execution logic
│   │           ├── factory/                  # Provider factory
│   │           └── rag/                      # Chroma / memory vector stores
│   ├── application/         # Application layer (use cases)
│   │   └── use-cases/
│   │       └── ProcessMessageUseCase.ts
│   ├── config/              # Configuration
│   │   ├── aiConfig.ts      # AI configuration
│   │   └── langsmith.ts     # LangSmith tracing config
│   ├── domains/             # Domains layer (organized by domain)
│   │   └── ai/
│   │       ├── entities/    # Domain entities
│   │       ├── value-objects/ # Value objects
│   │       └── services/    # Domain services
│   ├── ports/
│   │   ├── in/              # Input ports (use case interfaces)
│   │   └── out/             # Output ports (repository interfaces)
│   │       ├── ChainExecutorPort.ts
│   │       ├── AIProviderPort.ts
│   │       └── VectorStorePort.ts
│   └── index.ts             # Entry point
├── .env.example
├── Dockerfile
├── package.json
├── README.md
└── tsconfig.json
```

## Usage Examples

### Simple Chain Execution

```typescript
// Direct prompt to AI model
const response = await chainExecutor.executeSimpleChain(
  "Hello, how are you?",
  conversationContext
);
```

### RAG Chain Execution

```typescript
// Retrieval Augmented Generation with vector store
const response = await chainExecutor.executeRAGChain(
  "What is the capital of France?",
  conversationContext
);
```

### Custom Chain Execution

```typescript
// Template-based chain with variables
const response = await chainExecutor.executeCustomChain(
  "customer_support_template",
  { userName: "John", issue: "Login problem" },
  conversationContext
);
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Setup Guide](../../documentation/setup.md)
- [Deployment Guide](../../documentation/deployment.md)
- [RAG](../../documentation/rag.md)

## License

Private - Internal use only

