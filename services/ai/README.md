# AI Service

AI Service for Viber Bot - Node.js Express service with Hexagonal Architecture and LangChain integration.

## Overview

The AI Service provides AI processing capabilities for the Viber bot, including:

- Natural language processing (NLP)
- Message analysis and intent detection
- Response generation
- **LangChain-based chain execution** (simple, RAG, custom chains)
- **Conversation memory management** (BufferMemory, ConversationSummaryMemory)
- **RAG (Retrieval Augmented Generation)** with vector stores
- **Prompt engineering** with template system
- Multi-provider AI model support (Ollama, OpenAI, Anthropic, Google)
- **LangSmith observability** integration
- gRPC API for high-performance communication with Viber Service
- REST API for Admin Service configuration and management

## Architecture

This service follows **Hexagonal Architecture (Ports and Adapters)** pattern:

- **Domains Layer** (`src/domains/`): Core business logic, entities, and domain rules organized by domain
- **Application Layer** (`src/application/`): Use cases and application services
- **Ports** (`src/ports/`): Interfaces for input/output operations
- **Adapters** (`src/adapters/`): HTTP controllers, database repositories, AI provider clients

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (ai database)
- **Message Queue**: RabbitMQ
- **AI Framework**: **LangChain** (unified AI processing)
- **AI Providers**: Ollama (self-hosted), OpenAI, Anthropic, Google AI

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name (default: `ai`)
- `RABBITMQ_URI`: RabbitMQ connection string
- `AI_MODEL_PROVIDER`: AI provider to use (`ollama`, `openai`, `anthropic`, `google`)

### Optional Variables

- `PORT`: Server port (default: `3002`)
- `GRPC_PORT`: gRPC server port (default: `50051`)

**AI Provider Configuration**:
- `AI_TEMPERATURE`: Temperature for AI responses (default: `0.7`)
- `AI_MAX_TOKENS`: Maximum tokens for responses (optional)
- Provider-specific API keys and model names (see `.env.example`)

**Conversation Memory Configuration**:
- `CONVERSATION_MEMORY_TYPE`: Memory type (`buffer` or `summary`) - Default: `buffer`
- `CONVERSATION_MAX_HISTORY`: Maximum conversation history messages - Default: `10`

**Task Type Configuration**:
- `AI_TASK_TYPE`: Task type (`simple`, `rag`, `custom`) - Default: `simple`

**RAG Configuration**:
- `RAG_ENABLED`: Enable RAG functionality - Default: `false`
- `RAG_EMBEDDING_PROVIDER`: Embedding provider (`openai`, `ollama`, `local`) - Default: `openai`
- `RAG_VECTOR_STORE_TYPE`: Vector store type (`mongodb` or `memory`) - Default: `mongodb`
- `RAG_RETRIEVER_K`: Number of documents to retrieve - Default: `4`
- `RAG_SIMILARITY_THRESHOLD`: Similarity threshold (0.0-1.0) - Default: `0.7`

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
- RabbitMQ instance
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

- `GET /api/health` - Service health check

### AI Processing (REST API)

- `POST /api/ai/process` - Process message with AI
- `POST /api/ai/detect-intent` - Detect intent from message
- `POST /api/ai/batch-process` - Process multiple messages

### Model Configuration

- `GET /api/ai/models` - Get available AI models
- `GET /api/ai/models/:id` - Get model details
- `PUT /api/ai/models/:id/config` - Update model configuration

### Training

- `POST /api/ai/train` - Trigger model training
- `GET /api/ai/train/:trainingId` - Get training status

**Note**: For production use, the Viber Service communicates with AI Service via **gRPC** (port 50051) for high-performance message processing. REST endpoints are primarily for Admin Service access and testing.

## gRPC API

The AI Service exposes a gRPC API on port `50051` (configurable via `GRPC_PORT`) for high-performance communication with the Viber Service.

### gRPC Methods

- `ProcessMessage` - Process a single message with AI
- `DetectIntent` - Detect intent from a message
- `BatchProcessMessages` - Process multiple messages in batch

See [API Documentation](../../documentation/api.md#grpc-api) for detailed gRPC API specifications.

## Database Schema

The AI Service uses MongoDB with the following collections:

- **Models**: AI model configurations and metadata
- **ProcessingLogs**: AI processing history and results
- **TrainingData**: Datasets for model training
- **Configurations**: AI service settings and parameters

## Message Queue

The AI Service can consume messages from RabbitMQ for asynchronous processing. Currently, the service is configured to publish processing results to the message queue.

## LangChain Integration

The AI Service uses **LangChain** as the core framework for AI processing, providing:

### Unified AI Provider Interface

- LangChain adapters for all providers (OpenAI, Anthropic, Google, Ollama)
- Consistent interface via `BaseChatModel`
- Automatic LangSmith tracing when enabled

### Conversation Memory Management

- **BufferMemory**: Stores full conversation history (configurable max history)
- **ConversationSummaryMemory**: Summarizes conversation history to save tokens
- Memory type configurable via `CONVERSATION_MEMORY_TYPE` environment variable

### Flexible Task System

- **Simple Chains**: Direct prompts to AI models
- **RAG Chains**: Retrieval Augmented Generation with vector store retrieval
- **Custom Chains**: Template-based chains with variable substitution
- Task type configurable via `AI_TASK_TYPE` environment variable

### RAG (Retrieval Augmented Generation)

- Vector store integration (MongoDB Atlas Vector Search or in-memory)
- Embedding providers (OpenAI, Ollama, or local)
- Similarity search with configurable K and threshold
- Automatic context injection into prompts

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
│   │           └── factory/                  # Provider factory
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

## License

Private - Internal use only

