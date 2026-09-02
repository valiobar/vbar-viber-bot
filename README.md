# vbar-viber-bot

A microservices-based Viber bot platform with AI-powered message processing and an administrative dashboard. Built with Node.js, Next.js, TypeScript, MongoDB (Mongoose ODM), and RabbitMQ. Admin content CRUD is `route → service → repository`; the admin UI is Feature-Sliced Design.

## 🏗️ Architecture Overview

This project follows a **microservices architecture** with three core services:

- **Admin Service** (Next.js): Administrative dashboard and user interface
- **Viber Service** (Node.js/Express): Viber bot webhook handling and message processing
- **AI Service** (Node.js/Express): AI model integration and natural language processing

### Architecture Diagram

For a detailed visual representation of the system architecture, see:

- [Architecture Diagram](./documentation/diagrams/architecture.mmd) - High-level system architecture
- [Data Flow Diagram](./documentation/diagrams/data-flow.mmd) - Request/response and event flows
- [Deployment Diagram](./documentation/diagrams/deployment.mmd) - Compose-on-VPS deployment architecture

### Key Features

- **Clear layering**: admin server is `route → service → repository`; admin client is FSD (`app → views → widgets → features → entities → shared`)
- **Multi-Provider AI Support**: Supports both self-hosted (Ollama) and external AI APIs (OpenAI, Anthropic, Google)
- **Event-Driven Communication**: Asynchronous messaging via RabbitMQ for cache-refresh events
- **High-Performance gRPC**: Viber ↔ AI communication using gRPC for low-latency message processing
- **Shared MongoDB**: Single MongoDB instance with per-service databases (`admin_service`, `bot`, `ai`)
- **Containerized**: Docker Compose on a VPS; images built in CI and pushed to GHCR

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **Docker & Docker Compose**: Version 20.10+ (for infrastructure services)
- **npm** or **yarn**: Package manager

### Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd vbar-viber-bot
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables** (single file for the whole system):

   ```bash
   cp .env.example .env
   # Edit .env once — Compose, deploy.sh, and local npm all read it
   ```

4. **Start the Compose stack** (MongoDB, RabbitMQ + app services):

   ```bash
   npm run docker:up -- --build -d
   # or: docker compose --env-file .env -f infrastructure/docker-compose.yml up -d --build
   ```

5. **Or run services in development mode**:

   ```bash
   # Option 1: Run all services from root
   npm run dev

   # Option 2: Run services individually
   npm run dev:admin    # Admin service on http://localhost:3000
   npm run dev:viber    # Viber service on http://localhost:3001
   npm run dev:ai       # AI service on http://localhost:3002
   ```

### Verify Installation

Check service health:

```bash
curl http://localhost:3000/api/health  # Admin Service
curl http://localhost:3001/health      # Viber Service
curl http://localhost:3002/api/health  # AI Service
```

## 📚 Documentation

Comprehensive documentation is available in the `documentation/` directory:

- **[Architecture Documentation](./documentation/architecture.md)** - System architecture, service descriptions, communication patterns, and admin FSD layout
- **[Setup Guide](./documentation/setup.md)** - Detailed development environment setup, service-specific configuration, and troubleshooting
- **[API Documentation](./documentation/api.md)** - Complete API reference for all services, including REST APIs, gRPC APIs, and message queue contracts
- **[Deployment Guide](./documentation/deployment.md)** - Compose-on-VPS deployment, GHCR images, production configuration
- **[RAG](./documentation/rag.md)** - How RAG is implemented, configured, and used (Chroma + memory)

### Architecture Diagrams

Visual representations of the system:

- [Architecture Diagram](./documentation/diagrams/architecture.mmd) - Service architecture (5-container topology)
- [Data Flow Diagram](./documentation/diagrams/data-flow.mmd) - Request/response flows and event processing
- [Deployment Diagram](./documentation/diagrams/deployment.mmd) - Compose-on-VPS deployment architecture

## 🛠️ Development Workflow

### Project Structure

```
vbar-viber-bot/
├── services/              # Microservices (Dockerfiles live here)
│   ├── admin/             # Next.js admin service
│   ├── viber/             # Viber bot service
│   └── ai/                # AI processing service
├── packages/              # Shared packages
│   └── shared/            # Common types, utilities, and configurations
├── infrastructure/        # Docker Compose stack
│   ├── docker-compose.yml
│   └── docker-compose.override.yml.example
├── documentation/         # Project documentation
│   ├── architecture.md    # Architecture documentation
│   ├── setup.md           # Setup guide
│   ├── api.md             # API documentation
│   ├── deployment.md      # Deployment guide
│   └── diagrams/          # Architecture diagrams
└── .github/workflows/     # CI/CD (build → GHCR → VPS deploy)
```

### Available Scripts

**Root Level**:

- `npm install` - Install all dependencies for all services
- `npm run dev` - Run all services in development mode
- `npm run build` - Build all services
- `npm run test` - Run tests across all services
- `npm run lint` - Lint all services
- `npm run type-check` - Type check all services

**Service-Specific**:

- `npm run dev:admin` - Run admin service
- `npm run dev:viber` - Run viber service
- `npm run dev:ai` - Run AI service

### Development Best Practices

1. **Follow the documented layering**: `route → service → repository` on the server; FSD on the admin client
2. **Use Shared Package**: Import types and utilities from `@vbar/shared`
3. **TypeScript First**: All code must be TypeScript with strict type checking
4. **Write Tests**: Add tests for new features and maintain test coverage
5. **Document Changes**: Update relevant documentation when making changes
6. **Follow Git Workflow**: Use feature branches and descriptive commit messages

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with project-specific rules
- **Formatting**: Prettier for consistent code formatting
- **Imports**: Use `@vbar/shared` and `@vbar/shared/infra` (Mongo/RabbitMQ helpers)

## 🐳 Docker Development

### Using Docker Compose

Start all services with Docker Compose:

```bash
# Start all services (reads root .env)
docker compose --env-file .env -f infrastructure/docker-compose.yml up --build

# Start in detached mode
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d

# View logs
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f

# Stop services
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

### Development vs Production

- **Development**: `docker compose ... up --build` (or run services individually with hot reload)
- **Production**: GitHub Actions builds images → GHCR → VPS runs `deploy.sh` (`pull` + `up -d`, no build)

See [Deployment Guide](./documentation/deployment.md) for the full VPS + reverse-proxy setup.

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. **Fork the repository** and create a feature branch
2. **Read the documentation** to understand the architecture
3. **Follow the development workflow** and coding standards
4. **Write tests** for new features
5. **Update documentation** as needed

### Contribution Guidelines

1. **Code Quality**:

   - Follow TypeScript best practices
   - Maintain test coverage
   - Follow `route → service → repository` (server) and FSD (admin client)
   - Use shared types from `@vbar/shared`

2. **Documentation**:

   - Update relevant documentation files
   - Add comments for complex logic
   - Update API documentation for new endpoints

3. **Testing**:

   - Write unit tests for new features
   - Ensure all tests pass before submitting
   - Add integration tests for new services/endpoints

4. **Commit Messages**:

   - Use descriptive commit messages
   - Follow conventional commit format when possible
   - Reference issue numbers if applicable

5. **Pull Requests**:
   - Provide clear description of changes
   - Reference related issues
   - Ensure CI/CD checks pass
   - Request review from maintainers

### Development Setup

Before contributing, ensure you have:

- ✅ Completed the [Setup Guide](./documentation/setup.md)
- ✅ Read the [Architecture Documentation](./documentation/architecture.md)
- ✅ Reviewed the [API Documentation](./documentation/api.md)
- ✅ Set up your development environment

### Code Review Process

1. All pull requests require review
2. Maintainers will review code quality, architecture, and tests
3. Address feedback and update PR as needed
4. Once approved, maintainers will merge

## 📋 Project Status

This project is in active development. Current status:

- ✅ Three core services (admin, viber, ai) on a 5-container Compose stack
- ✅ Docker Compose stack (5 default containers) + GHCR deploy workflow
- ✅ Shared package with common types and utilities
- 🚧 Feature implementation (in progress)
- 🚧 Testing (in progress)

## 🔗 Related Resources

- [Architecture Documentation](./documentation/architecture.md)
- [Setup Guide](./documentation/setup.md)
- [API Documentation](./documentation/api.md)
- [Deployment Guide](./documentation/deployment.md)
- [RAG](./documentation/rag.md)

## 📝 License

[Add your license information here]

## 👥 Team

[Add team information or contact details here]

---

**Note**: For detailed information about any aspect of the project, please refer to the comprehensive documentation in the `documentation/` directory.
