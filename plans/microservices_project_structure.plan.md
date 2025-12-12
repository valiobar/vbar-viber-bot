---
name: Microservices Project Structure
overview: Create a comprehensive microservices project structure with 4 services (admin Next.js, viber Node.js, ai Node.js, analytics Node.js), Docker setup, Kubernetes preparation, shared code package, and complete documentation including architectural diagrams.
todos: []
---

# Microservices Project Structure and Initial Setup Plan

## Overview

This plan establishes a monorepo structure for a microservices architecture with 4 services, Docker containerization, Kubernetes deployment preparation, shared code package, and comprehensive documentation.

## Architecture Overview

The project will follow a microservices architecture with **Hexagonal Architecture (Ports and Adapters)** pattern for all services. This ensures separation of concerns, testability, and independence from external frameworks.

### Hexagonal Architecture Pattern

**All services (Admin, Viber, AI, Analytics) MUST follow Hexagonal Architecture** with the following structure:

#### Core Layers (Business Logic)

- **Domain Layer** (`src/domain/`):

  - Core business logic, entities, and domain rules (innermost layer)
  - Domain entities and value objects
  - Domain services
  - Business rules and validations

- **Application Layer** (`src/application/`):
  - Use cases and application services
  - Orchestration logic
  - DTOs (Data Transfer Objects)
  - Application-specific interfaces

#### Ports (Interfaces)

- **Input Ports** (`src/ports/in/`): Interfaces for incoming operations (use cases)
- **Output Ports** (`src/ports/out/`): Interfaces for outgoing operations (repositories, message publishers, external services)

#### Adapters (Infrastructure)

- **Input Adapters** (`src/adapters/in/`):

  - HTTP controllers (Express routes)
  - Message queue consumers
  - WebSocket handlers

- **Output Adapters** (`src/adapters/out/`):
  - Database repositories (MongoDB implementations)
  - Message queue publishers
  - External API clients
  - File system adapters

#### Infrastructure Layer

- **Configuration** (`src/config/`): Environment configuration, dependency injection setup
- **Shared Infrastructure**: Logging, error handling, middleware

### Services

- **Admin Service**: Next.js application with MongoDB (admin database) - Hexagonal Architecture adapted for Next.js
- **Viber Service**: Node.js Express service with MongoDB (bot database) - Full Hexagonal Architecture
- **AI Service**: Node.js Express service with MongoDB (ai database) - Full Hexagonal Architecture
- **Analytics Service**: Node.js Express service with MongoDB (analytics database) - Full Hexagonal Architecture
- **Shared Package**: Common utilities, types, and configurations
- **Infrastructure**: Docker Compose for local development, Kubernetes manifests for deployment

## Repository Structure

```
vbar-viber-bot/
├── services/
│   ├── admin/              # Next.js admin service
│   ├── viber/              # Node.js Express viber service
│   ├── ai/                 # Node.js Express AI service
│   └── analytics/          # Node.js Express analytics service
├── packages/
│   └── shared/             # Shared code package
├── infrastructure/
│   ├── docker/             # Dockerfiles for each service
│   ├── docker-compose.yml  # Local development setup
│   └── k8s/                # Kubernetes manifests
├── docs/                   # All documentation
│   ├── architecture.md     # Architecture documentation
│   ├── setup.md            # Setup instructions
│   ├── deployment.md       # Deployment guide
│   └── diagrams/           # Architecture diagrams
├── .gitignore
├── README.md
└── package.json            # Root package.json for workspace management
```

## Implementation Steps

### Step 1: Create Documentation Structure

**Files to Create**:

- `docs/architecture.md` - System architecture documentation
- `docs/setup.md` - Development setup guide
- `docs/deployment.md` - Docker and Kubernetes deployment guide
- `docs/api.md` - API documentation structure
- `docs/diagrams/architecture.mmd` - Mermaid architecture diagram
- `docs/diagrams/data-flow.mmd` - Data flow diagram
- `docs/diagrams/deployment.mmd` - Deployment architecture diagram

**Content**: Create comprehensive documentation including:

- System architecture overview
- Service descriptions and responsibilities
- Database schemas
- API contracts
- Communication patterns (REST + Message Queue)
- Docker setup instructions
- Kubernetes deployment strategy

### Step 2: Create Root Project Structure ✅

**Files to Create**:

- ✅ `.gitignore` - Comprehensive gitignore for Node.js, Docker, Kubernetes
- ✅ `package.json` - Root workspace configuration
- ✅ `.dockerignore` - Docker ignore patterns
- ✅ `.env.example` - Environment variables template

**Content**:

- ✅ Set up npm/yarn workspace configuration
- ✅ Add scripts for building, testing, and running all services
- ✅ Configure gitignore for all service types

### Step 3: Create Shared Package ✅

**Files to Create**:

- ✅ `packages/shared/package.json`
- ✅ `packages/shared/tsconfig.json`
- ✅ `packages/shared/src/index.ts`
- ✅ `packages/shared/src/types/` - Common TypeScript types
- ✅ `packages/shared/src/utils/` - Shared utilities
- ✅ `packages/shared/src/config/` - Shared configuration
- ✅ `packages/shared/README.md`

**Content**:

- ✅ Common TypeScript types and interfaces
- ✅ Shared utilities (logging, validation, etc.)
- ✅ Configuration helpers
- ✅ Message queue types
- ✅ API response types

### Step 4: Create Admin Service (Next.js) ✅

**Files to Create**:

- ✅ `services/admin/package.json`
- ✅ `services/admin/tsconfig.json`
- ✅ `services/admin/next.config.js`
- ✅ `services/admin/.env.example`
- ✅ `services/admin/Dockerfile`
- ✅ `services/admin/src/app/` - Next.js app directory structure
- ✅ `services/admin/src/lib/` - Library code
- ✅ `services/admin/src/types/` - Service-specific types
- ✅ `services/admin/README.md`

**Content**:

- ✅ Next.js 14+ with App Router
- ✅ TypeScript configuration
- ✅ MongoDB connection setup
- ✅ Basic project structure
- ✅ Environment variables for MongoDB connection

### Step 5: Create Viber Service (Node.js Express) ✅

**Files to Create**:

- ✅ `services/viber/package.json`
- ✅ `services/viber/tsconfig.json`
- ✅ `services/viber/.env.example` (blocked by globalignore, but documented in README)
- ✅ `services/viber/Dockerfile`
- ✅ `services/viber/src/index.ts` - Entry point
- ✅ `services/viber/src/adapters/in/routes/` - API routes (Hexagonal Architecture)
- ✅ `services/viber/src/config/` - Configuration (database, messageQueue, viber)
- ✅ `services/viber/src/domain/` - Domain layer structure
- ✅ `services/viber/src/application/` - Application layer structure
- ✅ `services/viber/src/ports/in/` - Input ports structure
- ✅ `services/viber/src/ports/out/` - Output ports structure
- ✅ `services/viber/src/adapters/out/` - Output adapters structure
- ✅ `services/viber/.gitignore`
- ✅ `services/viber/README.md`

**Content**:

- Express.js setup with TypeScript
- MongoDB connection and models
- Basic REST API structure
- Message queue integration setup
- Health check endpoint
- Install and configure `viber-bot` package (https://www.npmjs.com/package/viber-bot) for Viber bot functionality

### Step 6: Create AI Service (Node.js Express) ✅

**Files to Create**:

- ✅ `services/ai/package.json`
- ✅ `services/ai/tsconfig.json`
- ✅ `services/ai/.env.example` (documented in README, blocked by globalignore)
- ✅ `services/ai/Dockerfile`
- ✅ `services/ai/src/index.ts` - Entry point
- ✅ `services/ai/src/adapters/in/routes/` - API routes (Hexagonal Architecture)
- ✅ `services/ai/src/config/` - Configuration (database, messageQueue)
- ✅ `services/ai/src/domain/` - Domain layer structure
- ✅ `services/ai/src/application/` - Application layer structure
- ✅ `services/ai/src/ports/in/` - Input ports structure
- ✅ `services/ai/src/ports/out/` - Output ports structure
- ✅ `services/ai/src/adapters/out/` - Output adapters structure
- ✅ `services/ai/.gitignore`
- ✅ `services/ai/README.md`

**Content**:

- ✅ Express.js setup with TypeScript
- ✅ MongoDB connection and models
- ✅ Basic REST API structure
- ✅ Message queue integration setup
- ✅ Health check endpoint

### Step 7: Create Analytics Service (Node.js Express) ✅

**Files to Create**:

- ✅ `services/analytics/package.json`
- ✅ `services/analytics/tsconfig.json`
- ✅ `services/analytics/Dockerfile`
- ✅ `services/analytics/src/index.ts` - Entry point
- ✅ `services/analytics/src/adapters/in/routes/` - API routes (Hexagonal Architecture)
- ✅ `services/analytics/src/config/` - Configuration (database, messageQueue)
- ✅ `services/analytics/src/domain/` - Domain layer structure
- ✅ `services/analytics/src/application/` - Application layer structure
- ✅ `services/analytics/src/ports/in/` - Input ports structure
- ✅ `services/analytics/src/ports/out/` - Output ports structure
- ✅ `services/analytics/src/adapters/out/` - Output adapters structure
- ✅ `services/analytics/.gitignore`
- ✅ `services/analytics/README.md`

**Content**:

- ✅ Express.js setup with TypeScript
- ✅ MongoDB connection and models
- ✅ Basic REST API structure
- ✅ Message queue integration setup (consumer for analytics.events queue)
- ✅ Health check endpoint
- ✅ Hexagonal Architecture structure (consistent with AI and Viber services)

### Step 8: Create Docker Configuration ✅

**Files to Create**:

- ✅ `infrastructure/docker/Dockerfile.admin`
- ✅ `infrastructure/docker/Dockerfile.viber`
- ✅ `infrastructure/docker/Dockerfile.ai`
- ✅ `infrastructure/docker/Dockerfile.analytics`
- ✅ `infrastructure/docker-compose.yml`
- ✅ `infrastructure/docker-compose.override.yml.example`

**Content**:

- ✅ Multi-stage Dockerfiles for each service
- ✅ Docker Compose configuration with:
  - All 4 services
  - MongoDB instances (admin, bot, ai, analytics)
  - Message queue service (RabbitMQ)
  - Network configuration
  - Volume mounts for development
- ✅ Environment variable configuration

### Step 9: Create Kubernetes Manifests ✅

**Files to Create**:

- ✅ `infrastructure/k8s/namespace.yaml`
- ✅ `infrastructure/k8s/configmap.yaml`
- ✅ `infrastructure/k8s/secrets.yaml.example`
- ✅ `infrastructure/k8s/admin/` - Admin service manifests
  - ✅ `deployment.yaml`
  - ✅ `service.yaml`
- ✅ `infrastructure/k8s/viber/` - Viber service manifests
  - ✅ `deployment.yaml`
  - ✅ `service.yaml`
- ✅ `infrastructure/k8s/ai/` - AI service manifests
  - ✅ `deployment.yaml`
  - ✅ `service.yaml`
- ✅ `infrastructure/k8s/analytics/` - Analytics service manifests
  - ✅ `deployment.yaml`
  - ✅ `service.yaml`
- ✅ `infrastructure/k8s/mongodb/` - MongoDB statefulsets
  - ✅ `admin-statefulset.yaml`
  - ✅ `admin-service.yaml`
  - ✅ `bot-statefulset.yaml`
  - ✅ `bot-service.yaml`
  - ✅ `ai-statefulset.yaml`
  - ✅ `ai-service.yaml`
  - ✅ `analytics-statefulset.yaml`
  - ✅ `analytics-service.yaml`
- ✅ `infrastructure/k8s/rabbitmq/` - RabbitMQ manifests
  - ✅ `deployment.yaml`
  - ✅ `service.yaml`
  - ✅ `pvc.yaml`
- ✅ `infrastructure/k8s/ingress.yaml` - Ingress configuration

**Content**:

- ✅ Deployment manifests for each service
- ✅ Service definitions
- ✅ ConfigMaps for configuration
- ✅ Secrets templates
- ✅ Ingress rules
- ✅ MongoDB StatefulSets
- ✅ RabbitMQ deployment

### Step 10: Update Root README ✅

**File**: `README.md`

**Content**:

- ✅ Project overview
- ✅ Architecture diagram reference
- ✅ Quick start guide
- ✅ Links to detailed documentation
- ✅ Development workflow
- ✅ Contributing guidelines

## Files to Create

### Documentation

- `docs/architecture.md`
- `docs/setup.md`
- `docs/deployment.md`
- `docs/api.md`
- `docs/diagrams/architecture.mmd`
- `docs/diagrams/data-flow.mmd`
- `docs/diagrams/deployment.mmd`

### Root Level

- `.gitignore`
- `.dockerignore`
- `.env.example`
- `package.json`

### Shared Package

- ✅ `packages/shared/package.json`
- ✅ `packages/shared/tsconfig.json`
- ✅ `packages/shared/src/index.ts`
- ✅ `packages/shared/src/types/index.ts`
- ✅ `packages/shared/src/utils/index.ts`
- ✅ `packages/shared/src/config/index.ts`
- ✅ `packages/shared/README.md`

### Admin Service

- ✅ `services/admin/package.json`
- ✅ `services/admin/tsconfig.json`
- ✅ `services/admin/next.config.js`
- ✅ `services/admin/.env.example`
- ✅ `services/admin/Dockerfile`
- ✅ `services/admin/src/app/layout.tsx`
- ✅ `services/admin/src/app/page.tsx`
- ✅ `services/admin/src/app/globals.css`
- ✅ `services/admin/src/app/api/health/route.ts`
- ✅ `services/admin/src/lib/mongodb.ts`
- ✅ `services/admin/src/types/index.ts`
- ✅ `services/admin/README.md`
- ✅ `services/admin/.gitignore`

### Viber Service

- ✅ `services/viber/package.json`
- ✅ `services/viber/tsconfig.json`
- ✅ `services/viber/.env.example` (documented in README, blocked by globalignore)
- ✅ `services/viber/Dockerfile`
- ✅ `services/viber/src/index.ts`
- ✅ `services/viber/src/adapters/in/routes/index.ts`
- ✅ `services/viber/src/adapters/in/routes/health.ts`
- ✅ `services/viber/src/config/database.ts`
- ✅ `services/viber/src/config/messageQueue.ts`
- ✅ `services/viber/src/config/viber.ts`
- ✅ `services/viber/src/domain/` (Hexagonal Architecture structure)
- ✅ `services/viber/src/application/` (Hexagonal Architecture structure)
- ✅ `services/viber/src/ports/in/` (Hexagonal Architecture structure)
- ✅ `services/viber/src/ports/out/` (Hexagonal Architecture structure)
- ✅ `services/viber/src/adapters/out/` (Hexagonal Architecture structure)
- ✅ `services/viber/.gitignore`
- ✅ `services/viber/README.md`

### AI Service

- ✅ `services/ai/package.json`
- ✅ `services/ai/tsconfig.json`
- ✅ `services/ai/.env.example` (documented in README, blocked by globalignore)
- ✅ `services/ai/Dockerfile`
- ✅ `services/ai/src/index.ts`
- ✅ `services/ai/src/adapters/in/routes/index.ts`
- ✅ `services/ai/src/adapters/in/routes/health.ts`
- ✅ `services/ai/src/config/database.ts`
- ✅ `services/ai/src/config/messageQueue.ts`
- ✅ `services/ai/src/domain/` (Hexagonal Architecture structure)
- ✅ `services/ai/src/application/` (Hexagonal Architecture structure)
- ✅ `services/ai/src/ports/in/` (Hexagonal Architecture structure)
- ✅ `services/ai/src/ports/out/` (Hexagonal Architecture structure)
- ✅ `services/ai/src/adapters/out/` (Hexagonal Architecture structure)
- ✅ `services/ai/.gitignore`
- ✅ `services/ai/README.md`

### Analytics Service

- ✅ `services/analytics/package.json`
- ✅ `services/analytics/tsconfig.json`
- ✅ `services/analytics/Dockerfile`
- ✅ `services/analytics/src/index.ts`
- ✅ `services/analytics/src/adapters/in/routes/index.ts`
- ✅ `services/analytics/src/adapters/in/routes/health.ts`
- ✅ `services/analytics/src/config/database.ts`
- ✅ `services/analytics/src/config/messageQueue.ts`
- ✅ `services/analytics/src/domain/` (Hexagonal Architecture structure)
- ✅ `services/analytics/src/application/` (Hexagonal Architecture structure)
- ✅ `services/analytics/src/ports/in/` (Hexagonal Architecture structure)
- ✅ `services/analytics/src/ports/out/` (Hexagonal Architecture structure)
- ✅ `services/analytics/src/adapters/out/` (Hexagonal Architecture structure)
- ✅ `services/analytics/.gitignore`
- ✅ `services/analytics/README.md`

### Infrastructure

- ✅ `infrastructure/docker/Dockerfile.admin`
- ✅ `infrastructure/docker/Dockerfile.viber`
- ✅ `infrastructure/docker/Dockerfile.ai`
- ✅ `infrastructure/docker/Dockerfile.analytics`
- ✅ `infrastructure/docker-compose.yml`
- ✅ `infrastructure/docker-compose.override.yml.example`
- ✅ `infrastructure/k8s/namespace.yaml`
- ✅ `infrastructure/k8s/configmap.yaml`
- ✅ `infrastructure/k8s/secrets.yaml.example`
- ✅ `infrastructure/k8s/admin/deployment.yaml`
- ✅ `infrastructure/k8s/admin/service.yaml`
- ✅ `infrastructure/k8s/viber/deployment.yaml`
- ✅ `infrastructure/k8s/viber/service.yaml`
- ✅ `infrastructure/k8s/ai/deployment.yaml`
- ✅ `infrastructure/k8s/ai/service.yaml`
- ✅ `infrastructure/k8s/analytics/deployment.yaml`
- ✅ `infrastructure/k8s/analytics/service.yaml`
- ✅ `infrastructure/k8s/mongodb/admin-statefulset.yaml`
- ✅ `infrastructure/k8s/mongodb/admin-service.yaml`
- ✅ `infrastructure/k8s/mongodb/bot-statefulset.yaml`
- ✅ `infrastructure/k8s/mongodb/bot-service.yaml`
- ✅ `infrastructure/k8s/mongodb/ai-statefulset.yaml`
- ✅ `infrastructure/k8s/mongodb/ai-service.yaml`
- ✅ `infrastructure/k8s/mongodb/analytics-statefulset.yaml`
- ✅ `infrastructure/k8s/mongodb/analytics-service.yaml`
- ✅ `infrastructure/k8s/rabbitmq/deployment.yaml`
- ✅ `infrastructure/k8s/rabbitmq/service.yaml`
- ✅ `infrastructure/k8s/rabbitmq/pvc.yaml`
- ✅ `infrastructure/k8s/ingress.yaml`

## Implementation Order

1. Create documentation structure and initial docs
2. Create root project structure and configuration
3. Create shared package
4. Create all four services (can be done in parallel)
5. Create Docker configuration
6. Create Kubernetes manifests
7. Update root README

## Key Decisions

- **Monorepo Structure**: Using npm/yarn workspaces for managing multiple packages
- **TypeScript**: All services will use TypeScript
- **Database**: Each service has its own MongoDB database instance
- **Communication**: REST APIs for synchronous communication, Message Queue (RabbitMQ) for asynchronous
- **Containerization**: Multi-stage Dockerfiles for optimized production images
- **Orchestration**: Kubernetes manifests prepared for future deployment
- **Shared Code**: Common package for types, utilities, and configurations
