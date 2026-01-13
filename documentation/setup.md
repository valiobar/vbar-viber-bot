# Development Setup Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Setup](#repository-setup)
3. [Local Development Setup](#local-development-setup)
4. [Development Workflow](#development-workflow)
5. [Service-Specific Setup](#service-specific-setup)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

Before setting up the development environment, ensure you have the following software installed:

#### Node.js and Package Manager

- **Node.js**: Version 18.0.0 or higher
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **npm**: Version 9.0.0 or higher (comes with Node.js)
  - Verify installation: `npm --version`
- **Alternative**: Yarn can be used instead of npm
  - Install: `npm install -g yarn`
  - Verify: `yarn --version`

#### Docker and Docker Compose

- **Docker**: Version 20.10 or higher
  - Download from [docker.com](https://www.docker.com/get-started)
  - Verify installation: `docker --version`
- **Docker Compose**: Version 2.0 or higher (included with Docker Desktop)
  - Verify installation: `docker compose version`

#### Git

- **Git**: Version 2.30 or higher
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### System Requirements

- **Operating System**: macOS, Linux, or Windows (with WSL2 recommended for Windows)
- **RAM**: Minimum 8GB (16GB recommended for running all services)
- **Disk Space**: At least 10GB free space
- **CPU**: Multi-core processor recommended

### Optional Tools

- **MongoDB Compass**: GUI for MongoDB database management
- **RabbitMQ Management Plugin**: Web UI for RabbitMQ (accessible via Docker)
- **VS Code** or **Cursor**: Recommended IDE with TypeScript support
- **Postman** or **Insomnia**: For API testing

## Repository Setup

### Clone Repository

```bash
git clone <repository-url>
cd vbar-viber-bot
```

### Install Dependencies

The project uses npm workspaces for monorepo management. Install all dependencies from the root:

```bash
# Install all dependencies for all services and packages
npm install
```

This will install dependencies for:

- Root workspace
- All services (`services/admin`, `services/viber`, `services/ai`, `services/analytics`)
- Shared package (`packages/shared`)

### Environment Variables Configuration

Each service requires its own environment configuration. Copy the example environment files:

```bash
# Root level environment variables (if applicable)
cp .env.example .env

# Admin service
cp services/admin/.env.example services/admin/.env

# Viber service
cp services/viber/.env.example services/viber/.env

# AI service
cp services/ai/.env.example services/ai/.env

# Analytics service
cp services/analytics/.env.example services/analytics/.env
```

#### Environment Variables Overview

**Admin Service** (`.env` in `services/admin/`):

```env
# Database
# Format: mongodb://username:password@host:port/database
MONGODB_URI=mongodb://admin:admin123@localhost:27017/admin
MONGODB_DB_NAME=admin

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3000
NODE_ENV=development
PORT=3000

# Authentication
# JWT_SECRET: Secret key for signing JWT tokens (required, minimum 32 characters)
# Example: JWT_SECRET=your-super-secret-key-minimum-32-characters-long-for-security
JWT_SECRET=your-secret-key-here-min-32-chars

# JWT_EXPIRES_IN: Access token expiration time (default: "7d")
# Format: number followed by unit (s=seconds, m=minutes, h=hours, d=days)
# Examples: "1h", "24h", "7d", "30d"
JWT_EXPIRES_IN=7d

# JWT_REFRESH_EXPIRES_IN: Refresh token expiration time (default: "30d")
# Format: number followed by unit (s=seconds, m=minutes, h=hours, d=days)
# Examples: "7d", "30d", "90d"
JWT_REFRESH_EXPIRES_IN=30d

# Other services
VIBER_SERVICE_URL=http://localhost:3001
AI_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
```

**Viber Service** (`.env` in `services/viber/`):

```env
# Server
PORT=3001
NODE_ENV=development

# Database
# Format: mongodb://username:password@host:port/database
MONGODB_URI=mongodb://bot:bot123@localhost:27018/bot
MONGODB_DB_NAME=bot

# Message Queue
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=viber_events

# Viber API
VIBER_API_TOKEN=your-viber-api-token
VIBER_WEBHOOK_URL=https://your-domain.com/viber/webhook

# Other services
AI_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
```

**AI Service** (`.env` in `services/ai/`):

```env
# Server
PORT=3002
NODE_ENV=development

# Database
# Format: mongodb://username:password@host:port/database
MONGODB_URI=mongodb://ai:ai123@localhost:27019/ai
MONGODB_DB_NAME=ai

# Message Queue
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=ai_events

# AI Configuration
# Provider options: 'openai', 'anthropic', 'ollama', 'google'
AI_MODEL_PROVIDER=ollama
AI_MODEL_NAME=llama2

# Ollama Configuration (for self-hosted models)
OLLAMA_URL=http://localhost:11434

# External AI API Configuration (optional, for cloud providers)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_API_KEY=your-google-api-key
```

**Analytics Service** (`.env` in `services/analytics/`):

```env
# Server
PORT=3003
NODE_ENV=development

# Database
# Format: mongodb://username:password@host:port/database
MONGODB_URI=mongodb://analytics:analytics123@localhost:27020/analytics
MONGODB_DB_NAME=analytics

# Message Queue
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=analytics_events
```

**Important**: Update all placeholder values with your actual configuration values.

## Local Development Setup

### Option 1: Running Services Individually

This approach allows you to run services separately for development and debugging.

#### Start Infrastructure Services (MongoDB, RabbitMQ, and Ollama)

First, start the required infrastructure services using Docker Compose:

```bash
# Start MongoDB and RabbitMQ
docker compose -f infrastructure/docker-compose.infrastructure.yml up -d
```

This starts:

- MongoDB instances (one per service) on ports 27017-27020 with authentication enabled
  - Admin DB: `mongodb://admin:admin123@localhost:27017/admin`
  - Bot DB: `mongodb://bot:bot123@localhost:27018/bot`
  - AI DB: `mongodb://ai:ai123@localhost:27019/ai`
  - Analytics DB: `mongodb://analytics:analytics123@localhost:27020/analytics`
- RabbitMQ on port 5672 (management UI on port 15672)
  - Default credentials: `admin/admin`

**Note**: MongoDB authentication is enabled by default. You can customize credentials by setting environment variables:

- `MONGO_ADMIN_USER`, `MONGO_ADMIN_PASS`
- `MONGO_BOT_USER`, `MONGO_BOT_PASS`
- `MONGO_AI_USER`, `MONGO_AI_PASS`
- `MONGO_ANALYTICS_USER`, `MONGO_ANALYTICS_PASS`

**Important**: When starting MongoDB for the first time with authentication, the databases will be initialized with the root users. If you need to reset the databases (e.g., after changing credentials), you'll need to remove the volumes:

```bash
# Stop containers
docker compose -f infrastructure/docker-compose.infrastructure.yml down

# Remove volumes (WARNING: This deletes all data)
docker volume rm vbar-mongodb-admin-data vbar-mongodb-bot-data vbar-mongodb-ai-data vbar-mongodb-analytics-data

# Start again with new credentials
docker compose -f infrastructure/docker-compose.infrastructure.yml up -d
```

#### Run Services in Development Mode

Open separate terminal windows/tabs for each service:

**Terminal 1 - Admin Service**:

```bash
cd services/admin
npm run dev
# Service runs on http://localhost:3000
```

**Terminal 2 - Viber Service**:

```bash
cd services/viber
npm run dev
# Service runs on http://localhost:3001
```

**Terminal 3 - AI Service**:

```bash
cd services/ai
npm run dev
# Service runs on http://localhost:3002
# Note: In Docker Compose, this service is bound to localhost only (127.0.0.1:3002)
# for security - accessible from host machine but not from external networks
```

**Terminal 4 - Analytics Service**:

```bash
cd services/analytics
npm run dev
# Service runs on http://localhost:3003
# Note: In Docker Compose, this service is bound to localhost only (127.0.0.1:3003)
# for security - accessible from host machine but not from external networks
```

#### Using Root Scripts

Alternatively, you can use root-level scripts:

```bash
# Run all services in development mode (parallel)
npm run dev

# Run individual services
npm run admin:dev
npm run viber:dev
npm run ai:dev
npm run analytics:dev
```

### Option 2: Running with Docker Compose

For a complete containerized development environment:

```bash
# Build and start all services
docker compose -f infrastructure/docker-compose.yml up --build

# Run in detached mode
docker compose -f infrastructure/docker-compose.yml up -d

# View logs
docker compose -f infrastructure/docker-compose.yml logs -f

# Stop all services
docker compose -f infrastructure/docker-compose.yml down
```

#### Service Port Binding and Access

The Docker Compose configuration uses a security model that restricts internal services to localhost-only access:

- **Publicly Accessible Services**:

  - **Admin Service**: `http://localhost:3000` (publicly accessible for user access)
  - **Viber Service**: `http://localhost:3001` (publicly accessible - required for Viber webhook callbacks)

- **Localhost-Only Services** (internal services, not accessible from external networks):
  - **AI Service**: `http://localhost:3002` (localhost only - accessible from host machine)
  - **Analytics Service**: `http://localhost:3003` (localhost only - accessible from host machine)

**Service Communication Patterns**:

**When services run locally** (`pnpm dev`):

- Services connect via `http://localhost:3001/3002/3003`
- Works because ports are bound to localhost (AI, Analytics) or public (Admin, Viber)

**When services run in Docker**:

- Services communicate via Docker network hostnames: `http://viber:3001`, `http://ai:3002`, `http://analytics:3003`
- External access: Admin and Viber accessible, AI and Analytics blocked
- Services within Docker network can communicate using service names regardless of port binding

**Why Localhost-Only Binding for Internal Services?**:

- **Security**: AI and Analytics services don't need to be accessible from external networks
- **Local Development**: Services remain accessible from the host machine for local development and testing
- **Docker Network**: Services within Docker can still communicate using service names (e.g., `http://ai:3002`)

**Viber Service Must Remain Public**:
The Viber service must remain publicly accessible because Viber API sends webhook events from external networks. The service cannot receive webhooks if bound to localhost only.

### Database Setup and Migrations

#### MongoDB Setup

MongoDB instances are automatically created when using Docker Compose with authentication enabled. For manual setup:

```bash
# Start MongoDB container with authentication
docker run -d \
  --name mongodb-admin \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=admin \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  mongo:latest

# Repeat for other databases (bot, ai, analytics) on different ports
# Remember to use different usernames and passwords for each instance
```

**Connection String Format**: `mongodb://username:password@host:port/database`

**Note**: All services use **Mongoose ODM** for MongoDB connections. Mongoose provides:

- Schema-based data modeling
- Built-in validation
- Connection pooling and management
- Singleton pattern for connection reuse across requests
- Type-safe database operations

**MongoDB Compass Connection**:

- Connection String: `mongodb://admin:admin123@localhost:27017/admin`
- Or use the form:
  - Host: `localhost`
  - Port: `27017`
  - Username: `admin`
  - Password: `admin123`
  - Authentication Database: `admin`

#### Database Migrations

If your services include migration scripts:

```bash
# Admin service migrations
cd services/admin
npm run migrate

# Viber service migrations
cd services/viber
npm run migrate

# AI service migrations
cd services/ai
npm run migrate

# Analytics service migrations
cd services/analytics
npm run migrate
```

### Message Queue Setup

#### RabbitMQ Setup

RabbitMQ is automatically configured when using Docker Compose. For manual setup:

```bash
# Start RabbitMQ container
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

Access RabbitMQ Management UI at: `http://localhost:15672`

- Username: `admin`
- Password: `admin`

#### Queue Configuration

Queues are automatically created when services start. You can verify queues in the RabbitMQ Management UI or using the CLI:

```bash
# List queues (requires rabbitmqadmin tool)
docker exec rabbitmq rabbitmqadmin list queues
```

## Development Workflow

### Workspace Structure

The project follows a monorepo structure:

```
vbar-viber-bot/
├── services/           # All microservices
│   ├── admin/         # Next.js admin service
│   ├── viber/         # Viber bot service
│   ├── ai/            # AI processing service
│   └── analytics/     # Analytics service
├── packages/          # Shared packages
│   └── shared/        # Common utilities and types
├── infrastructure/    # Docker and Kubernetes configs
├── docs/              # Documentation
└── plans/             # Implementation plans
```

### Running Tests

```bash
# Run all tests across all services
npm run test

# Run tests for a specific service
cd services/admin
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Code Style and Linting

```bash
# Lint all services
npm run lint

# Lint a specific service
cd services/admin
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Type Checking

```bash
# Type check all services
npm run type-check

# Type check a specific service
cd services/admin
npm run type-check
```

### Building Services

```bash
# Build all services
npm run build

# Build a specific service
cd services/admin
npm run build
```

### Hot Reload Configuration

All services support hot reload in development mode:

- **Next.js (Admin)**: Automatic hot reload via Next.js dev server
- **Express Services**: Use `nodemon` or `ts-node-dev` for hot reload
  - Configured in `package.json` scripts
  - Watches for file changes and restarts automatically

## Service-Specific Setup

### Admin Service Setup (Next.js)

**Location**: `services/admin/`

**Technology Stack**:

- Next.js 14+ (App Router)
- TypeScript
- MongoDB
- Mongoose (ODM)

**Setup Steps**:

1. Navigate to service directory:

   ```bash
   cd services/admin
   ```

2. Install dependencies (if not done at root):

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

5. Access the application:
   - Frontend: `http://localhost:3000`
   - API Routes: `http://localhost:3000/api/*`

**Development Features**:

- Hot module replacement (HMR)
- Fast Refresh for React components
- TypeScript type checking
- ESLint integration

### Viber Service Setup

**Location**: `services/viber/`

**Technology Stack**:

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose (ODM)

**Setup Steps**:

1. Navigate to service directory:

   ```bash
   cd services/viber
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your Viber API token and configuration
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

5. Verify service is running:
   ```bash
   curl http://localhost:3001/health
   ```

**Note**: The Viber service must remain publicly accessible in Docker Compose configuration because Viber API sends webhook events from external networks. The service cannot receive webhooks if bound to localhost only.

**Development Features**:

- Hot reload with `nodemon` or `ts-node-dev`
- TypeScript compilation
- MongoDB connection management with Mongoose (singleton pattern with connection caching)
- RabbitMQ message queue integration

### AI Service Setup

**Location**: `services/ai/`

**Technology Stack**:

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose (ODM)
- **LangChain** (AI framework)
- Multi-provider AI support (Ollama, OpenAI, Anthropic, Google)

**Setup Steps**:

1. Navigate to service directory:

   ```bash
   cd services/ai
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   This installs LangChain and all required dependencies for AI processing.

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your AI configuration
   ```

4. **Configure AI Model Provider**:

   **Option A: Using Ollama (Self-Hosted - Recommended for Development)**:

   ```env
   AI_MODEL_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=qwen3:4b
   ```

   Ensure Ollama is running (via Docker Compose or local installation):

   ```bash
   # Pull a model if not already done
   ollama pull qwen3:4b
   # Or if using Docker
   docker exec -it ollama ollama pull qwen3:4b
   ```

   **Option B: Using External AI APIs**:

   **OpenAI**:

   ```env
   AI_MODEL_PROVIDER=openai
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-3.5-turbo
   ```

   **Anthropic**:

   ```env
   AI_MODEL_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your-anthropic-api-key
   ANTHROPIC_MODEL=claude-3-opus
   ```

   **Google AI**:

   ```env
   AI_MODEL_PROVIDER=google
   GOOGLE_AI_API_KEY=your-google-ai-api-key
   GOOGLE_AI_MODEL=gemini-pro
   ```

5. **Configure Conversation Memory** (Optional):

   ```env
   # Buffer memory stores full conversation history
   CONVERSATION_MEMORY_TYPE=buffer
   CONVERSATION_MAX_HISTORY=10

   # Or use summary memory to save tokens
   # CONVERSATION_MEMORY_TYPE=summary
   # CONVERSATION_MAX_HISTORY=20
   ```

6. **Configure Task Type** (Optional):

   ```env
   # Simple: Direct prompts to AI model
   AI_TASK_TYPE=simple

   # RAG: Retrieval Augmented Generation (requires RAG setup)
   # AI_TASK_TYPE=rag

   # Custom: Template-based chains
   # AI_TASK_TYPE=custom
   ```

7. **Configure RAG (Retrieval Augmented Generation)** (Optional):

   If you want to enable RAG for enhanced context retrieval:

   ```env
   RAG_ENABLED=true
   RAG_EMBEDDING_PROVIDER=openai
   RAG_OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   RAG_VECTOR_STORE_TYPE=mongodb
   RAG_VECTOR_STORE_COLLECTION=embeddings
   RAG_RETRIEVER_K=4
   RAG_SIMILARITY_THRESHOLD=0.7
   ```

   **MongoDB Atlas Vector Search Setup** (if using MongoDB vector store):

   1. Create a vector search index in MongoDB Atlas:

      ```json
      {
        "fields": [
          {
            "type": "vector",
            "path": "embedding",
            "numDimensions": 1536,
            "similarity": "cosine"
          }
        ]
      }
      ```

   2. Ensure your MongoDB connection string has access to the database with the vector search index.

   **Document Loading and Indexing**:

   - Documents need to be loaded and embedded before RAG can be used
   - Use embedding provider to generate vector embeddings
   - Store embeddings in MongoDB vector store collection
   - See LangChain documentation for document loading and indexing examples

8. **Configure Prompt Templates** (Optional):

   ```env
   PROMPT_TEMPLATES_ENABLED=true
   PROMPT_TEMPLATE_STORAGE=mongodb
   PROMPT_TEMPLATE_DEFAULT=default_template
   ```

   Prompt templates can be stored in MongoDB or as files. Templates support variable substitution for dynamic prompt generation.

9. **Configure LangSmith Observability** (Optional):

   LangSmith provides observability and debugging for LangChain operations:

   ```env
   LANGSMITH_TRACING=true
   LANGSMITH_API_KEY=your-langsmith-api-key
   LANGSMITH_PROJECT=your-project-name
   LANGSMITH_ENDPOINT=https://api.smith.langchain.com
   ```

   **LangSmith Setup**:

   1. Sign up for LangSmith at [smith.langchain.com](https://smith.langchain.com)
   2. Create an API key in your LangSmith dashboard
   3. Set `LANGSMITH_TRACING=true` and provide your API key
   4. Optionally set project name and custom endpoint

   LangSmith automatically traces all LangChain operations when enabled, providing:

   - Request/response logging
   - Token usage tracking
   - Latency metrics
   - Error tracking and debugging

10. Start development server:

    ```bash
    npm run dev
    ```

11. Verify service is running:

    ```bash
    curl http://localhost:3002/health
    ```

**Note**: In Docker Compose configuration, the AI service is bound to localhost only (`127.0.0.1:3002:3002`) for security. This means:

- ✅ Accessible from the host machine at `http://localhost:3002`
- ❌ **NOT** accessible from external networks (security)
- ✅ Accessible from other Docker containers using service name: `http://ai:3002`

12. Test AI processing:
    ```bash
    curl -X POST http://localhost:3002/api/ai/process \
      -H "Content-Type: application/json" \
      -d '{"message": "Hello, how are you?"}'
    ```

**Development Features**:

- Hot reload support
- **LangChain integration** for unified AI processing
- Multi-provider AI model integration (Ollama, OpenAI, Anthropic, Google)
- **Conversation memory management** (BufferMemory, ConversationSummaryMemory)
- **RAG (Retrieval Augmented Generation)** with vector stores
- **Prompt engineering** with template system
- **Flexible task system** (simple, RAG, custom chains)
- **LangSmith observability** for debugging and monitoring
- Automatic provider switching and fallback
- Message queue consumer for AI processing requests
- gRPC server for high-performance Viber Service integration

**LangChain Features**:

The AI Service uses LangChain for:

- **Unified Provider Interface**: Consistent interface across all AI providers
- **Chain Execution**: Simple, RAG, and custom chain types
- **Memory Management**: Automatic conversation history management
- **Vector Store Integration**: MongoDB Atlas Vector Search for RAG
- **Prompt Templates**: Dynamic prompt generation with variable substitution
- **Observability**: LangSmith integration for tracing and debugging

**AI Provider Switching**:

The AI Service supports dynamic provider switching. You can:

- Use Ollama for development and testing (no API costs)
- Use external APIs for production or specific use cases
- Configure fallback providers for reliability
- Switch providers via environment variables without code changes

**Local Development Requirements**:

- Node.js 20+
- MongoDB instance (for conversation history and optional vector store)
- (Optional) Ollama instance for self-hosted AI models
- (Optional) LangSmith account for observability

### Analytics Service Setup

**Location**: `services/analytics/`

**Technology Stack**:

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose (ODM)

**Setup Steps**:

1. Navigate to service directory:

   ```bash
   cd services/analytics
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start development server:

   ```bash
   npm run dev
   ```

5. Verify service is running:
   ```bash
   curl http://localhost:3003/health
   ```

**Note**: In Docker Compose configuration, the Analytics service is bound to localhost only (`127.0.0.1:3003:3003`) for security. This means:

- ✅ Accessible from the host machine at `http://localhost:3003`
- ❌ **NOT** accessible from external networks (security)
- ✅ Accessible from other Docker containers using service name: `http://analytics:3003`

**Development Features**:

- Hot reload support
- Event aggregation
- Message queue consumer for analytics events

## Troubleshooting

### Common Issues and Solutions

#### Port Conflicts

**Problem**: Port already in use error

**Solutions**:

```bash
# Find process using the port (macOS/Linux)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in .env file
PORT=3001
```

**Windows**:

```bash
# Find process using the port
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID> /F
```

#### Database Connection Issues

**Problem**: Cannot connect to MongoDB

**Solutions**:

1. Verify MongoDB is running:

   ```bash
   docker ps | grep mongo
   ```

2. Check MongoDB connection string in `.env` (must include credentials):

   ```env
   MONGODB_URI=mongodb://admin:admin123@localhost:27017/admin
   ```

3. Test connection:

   ```bash
   # Connect with authentication
   docker exec -it vbar-mongodb-admin mongosh -u admin -p admin123 --authenticationDatabase admin

   # Or test from host
   mongosh "mongodb://admin:admin123@localhost:27017/admin"
   ```

4. Check MongoDB logs:
   ```bash
   docker logs mongodb-admin
   ```

#### Environment Variable Problems

**Problem**: Environment variables not loading

**Solutions**:

1. Verify `.env` file exists in the service directory
2. Check `.env` file syntax (no spaces around `=`)
3. Restart the service after changing `.env`
4. For Next.js, ensure variables prefixed with `NEXT_PUBLIC_` for client-side access

#### RabbitMQ Connection Issues

**Problem**: Cannot connect to RabbitMQ

**Solutions**:

1. Verify RabbitMQ is running:

   ```bash
   docker ps | grep rabbitmq
   ```

2. Check RabbitMQ connection URL (includes credentials):

   ```env
   RABBITMQ_URL=amqp://admin:admin@localhost:5672
   ```

   Or use environment variables:

   ```env
   RABBITMQ_USER=admin
   RABBITMQ_PASS=admin
   ```

3. Access RabbitMQ Management UI to verify:

   - URL: `http://localhost:15672`
   - Default credentials: `admin/admin`

4. Check RabbitMQ logs:
   ```bash
   docker logs rabbitmq
   ```

#### Dependency Installation Issues

**Problem**: npm install fails

**Solutions**:

1. Clear npm cache:

   ```bash
   npm cache clean --force
   ```

2. Delete `node_modules` and reinstall:

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. For workspace issues, install from root:
   ```bash
   cd /path/to/vbar-viber-bot
   npm install
   ```

#### TypeScript Compilation Errors

**Problem**: TypeScript errors in development

**Solutions**:

1. Run type checking:

   ```bash
   npm run type-check
   ```

2. Ensure all dependencies are installed
3. Check `tsconfig.json` configuration
4. Verify shared package is built:
   ```bash
   cd packages/shared
   npm run build
   ```

#### Service Not Starting

**Problem**: Service fails to start

**Solutions**:

1. Check service logs:

   ```bash
   cd services/admin
   npm run dev
   # Check terminal output for errors
   ```

2. Verify all required environment variables are set
3. Check port availability
4. Verify database and message queue connections
5. Review service-specific README for additional requirements

### Getting Help

If you encounter issues not covered here:

1. Check service-specific README files in each service directory
2. Review the [Architecture Documentation](./architecture.md)
3. Check the [Deployment Guide](./deployment.md) for production-related issues
4. Review logs for detailed error messages
5. Check GitHub issues or project documentation

### Development Tips

1. **Use Docker Compose for Infrastructure**: Keep MongoDB and RabbitMQ in Docker for consistency
2. **Run Services Individually**: For active development, run services separately for better debugging
3. **Use TypeScript Strict Mode**: Catch errors early during development
4. **Enable Hot Reload**: All services support hot reload for faster development
5. **Monitor Logs**: Keep terminal windows open to monitor service logs
6. **Use Health Endpoints**: All services expose `/health` endpoints for quick status checks

## Next Steps

After completing the setup:

1. Review the [Architecture Documentation](./architecture.md) to understand the system design
2. Check the [API Documentation](./api.md) for available endpoints
3. Review the [Deployment Guide](./deployment.md) for production deployment
4. Explore service-specific documentation in each service's README
