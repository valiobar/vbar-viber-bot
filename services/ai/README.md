# AI Service

AI Service for Viber Bot - Node.js Express service with Hexagonal Architecture.

## Overview

The AI Service provides AI processing capabilities for the Viber bot, including:

- Natural language processing (NLP)
- Message analysis and intent detection
- Response generation
- Multi-provider AI model support (Ollama, OpenAI, Anthropic, Google)
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
- Provider-specific API keys (see `.env.example`)

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

## AI Model Providers

The AI Service supports multiple AI model providers:

### Ollama (Self-Hosted)

- **URL**: Configured via `OLLAMA_URL` (default: `http://localhost:11434`)
- **Model**: Configured via `OLLAMA_MODEL` (default: `llama2`)
- **Benefits**: Data privacy, cost control, offline capability

### OpenAI

- **API Key**: Configured via `OPENAI_API_KEY`
- **Model**: Configured via `OPENAI_MODEL` (default: `gpt-4`)
- **Benefits**: High-quality responses, extensive model selection

### Anthropic

- **API Key**: Configured via `ANTHROPIC_API_KEY`
- **Model**: Configured via `ANTHROPIC_MODEL`
- **Benefits**: Advanced reasoning capabilities

### Google AI

- **API Key**: Configured via `GOOGLE_AI_API_KEY`
- **Model**: Configured via `GOOGLE_AI_MODEL` (default: `gemini-pro`)
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
│   │   └── out/             # Output adapters (MongoDB repos, AI clients)
│   ├── application/         # Application layer (use cases)
│   ├── config/              # Configuration (database, messageQueue)
│   ├── domains/             # Domains layer (organized by domain)
│   ├── ports/
│   │   ├── in/              # Input ports (use case interfaces)
│   │   └── out/             # Output ports (repository interfaces)
│   └── index.ts             # Entry point
├── .env.example
├── Dockerfile
├── package.json
├── README.md
└── tsconfig.json
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Setup Guide](../../documentation/setup.md)
- [Deployment Guide](../../documentation/deployment.md)

## License

Private - Internal use only

