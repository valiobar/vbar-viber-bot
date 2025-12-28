# vbar-viber-bot

A microservices-based Viber bot platform with AI-powered message processing, analytics, and administrative dashboard. Built with Node.js, Next.js, TypeScript, MongoDB (Mongoose ODM), and RabbitMQ, following Hexagonal Architecture (Ports and Adapters) principles.

## 🏗️ Architecture Overview

This project follows a **microservices architecture** with four independent services:

- **Admin Service** (Next.js): Administrative dashboard and user interface
- **Viber Service** (Node.js/Express): Viber bot webhook handling and message processing
- **AI Service** (Node.js/Express): AI model integration and natural language processing
- **Analytics Service** (Node.js/Express): Data aggregation, reporting, and analytics

### Architecture Diagram

For a detailed visual representation of the system architecture, see:

- [Architecture Diagram](./documentation/diagrams/architecture.mmd) - High-level system architecture
- [Data Flow Diagram](./documentation/diagrams/data-flow.mmd) - Request/response and event flows
- [Deployment Diagram](./documentation/diagrams/deployment.mmd) - Kubernetes deployment architecture

### Key Features

- **Hexagonal Architecture**: All services follow Ports and Adapters pattern for clean separation of concerns
- **Multi-Provider AI Support**: Supports both self-hosted (Ollama) and external AI APIs (OpenAI, Anthropic, Google)
- **Event-Driven Communication**: Asynchronous messaging via RabbitMQ for analytics events
- **High-Performance gRPC**: Viber ↔ AI communication using gRPC for low-latency message processing
- **Database per Service**: Each service maintains its own MongoDB database instance
- **Containerized**: Docker and Kubernetes ready for production deployment

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

3. **Configure environment variables**:

   ```bash
   # Copy example environment files
   cp .env.example .env
   cp services/admin/.env.example services/admin/.env
   cp services/viber/.env.example services/viber/.env
   cp services/ai/.env.example services/ai/.env
   cp services/analytics/.env.example services/analytics/.env

   # Edit each .env file with your configuration
   ```

4. **Start infrastructure services** (MongoDB, RabbitMQ, Ollama):

   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d
   ```

5. **Run services in development mode**:

   ```bash
   # Option 1: Run all services from root
   npm run dev

   # Option 2: Run services individually
   npm run admin:dev    # Admin service on http://localhost:3000
   npm run viber:dev    # Viber service on http://localhost:3001
   npm run ai:dev       # AI service on http://localhost:3002
   npm run analytics:dev # Analytics service on http://localhost:3003
   ```

### Verify Installation

Check service health:

```bash
curl http://localhost:3000/api/health  # Admin Service
curl http://localhost:3001/health      # Viber Service
curl http://localhost:3002/health      # AI Service
curl http://localhost:3003/health      # Analytics Service
```

## 📚 Documentation

Comprehensive documentation is available in the `documentation/` directory:

- **[Architecture Documentation](./documentation/architecture.md)** - System architecture, service descriptions, database schemas, communication patterns, and Hexagonal Architecture details
- **[Setup Guide](./documentation/setup.md)** - Detailed development environment setup, service-specific configuration, and troubleshooting
- **[API Documentation](./documentation/api.md)** - Complete API reference for all services, including REST APIs, gRPC APIs, and message queue contracts
- **[Deployment Guide](./documentation/deployment.md)** - Docker and Kubernetes deployment procedures, production configuration, and scaling strategies

### Architecture Diagrams

Visual representations of the system:

- [Architecture Diagram](./documentation/diagrams/architecture.mmd) - Service architecture with Hexagonal Architecture layers
- [Data Flow Diagram](./documentation/diagrams/data-flow.mmd) - Request/response flows and event processing
- [Deployment Diagram](./documentation/diagrams/deployment.mmd) - Kubernetes deployment architecture

## 🛠️ Development Workflow

### Project Structure

```
vbar-viber-bot/
├── services/              # Microservices
│   ├── admin/             # Next.js admin service
│   ├── viber/             # Viber bot service
│   ├── ai/                # AI processing service
│   └── analytics/         # Analytics service
├── packages/              # Shared packages
│   └── shared/            # Common types, utilities, and configurations
├── infrastructure/        # Infrastructure as Code
│   ├── docker/            # Dockerfiles
│   ├── docker-compose.yml # Docker Compose configuration
│   └── k8s/               # Kubernetes manifests
├── documentation/         # Project documentation
│   ├── architecture.md    # Architecture documentation
│   ├── setup.md           # Setup guide
│   ├── api.md             # API documentation
│   ├── deployment.md      # Deployment guide
│   └── diagrams/          # Architecture diagrams
└── plans/                 # Implementation plans
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

- `npm run admin:dev` - Run admin service
- `npm run viber:dev` - Run viber service
- `npm run ai:dev` - Run AI service
- `npm run analytics:dev` - Run analytics service

### Development Best Practices

1. **Follow Hexagonal Architecture**: All services must follow the Ports and Adapters pattern
2. **Use Shared Package**: Import types and utilities from `@shared` package
3. **TypeScript First**: All code must be TypeScript with strict type checking
4. **Write Tests**: Add tests for new features and maintain test coverage
5. **Document Changes**: Update relevant documentation when making changes
6. **Follow Git Workflow**: Use feature branches and descriptive commit messages

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with project-specific rules
- **Formatting**: Prettier for consistent code formatting
- **Imports**: Use absolute imports from `@shared` package

## 🐳 Docker Development

### Using Docker Compose

Start all services with Docker Compose:

```bash
# Start all services
docker compose -f infrastructure/docker-compose.yml up --build

# Start in detached mode
docker compose -f infrastructure/docker-compose.yml up -d

# View logs
docker compose -f infrastructure/docker-compose.yml logs -f

# Stop services
docker compose -f infrastructure/docker-compose.yml down
```

### Development vs Production

- **Development**: Services run individually with hot reload
- **Production**: Services containerized with Docker Compose or Kubernetes

## ☸️ Kubernetes Deployment

Kubernetes manifests are available in `infrastructure/k8s/`:

```bash
# Apply all Kubernetes resources
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/configmap.yaml
kubectl apply -f infrastructure/k8s/secrets.yaml
kubectl apply -f infrastructure/k8s/
```

See [Deployment Guide](./documentation/deployment.md) for detailed deployment procedures.

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
   - Follow Hexagonal Architecture principles
   - Use shared types from `@shared` package

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

- ✅ Project structure and documentation
- ✅ All four services with Hexagonal Architecture
- ✅ Docker and Kubernetes configurations
- ✅ Shared package with common types and utilities
- 🚧 Feature implementation (in progress)
- 🚧 Testing and CI/CD (in progress)

## 🔗 Related Resources

- [Architecture Documentation](./documentation/architecture.md)
- [Setup Guide](./documentation/setup.md)
- [API Documentation](./documentation/api.md)
- [Deployment Guide](./documentation/deployment.md)

## 📝 License

[Add your license information here]

## 👥 Team

[Add team information or contact details here]

---

**Note**: For detailed information about any aspect of the project, please refer to the comprehensive documentation in the `documentation/` directory.
