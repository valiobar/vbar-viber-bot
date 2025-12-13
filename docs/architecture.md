# System Architecture Documentation

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Service Descriptions](#service-descriptions)
3. [Database Schemas](#database-schemas)
4. [Communication Patterns](#communication-patterns)
5. [Hexagonal Architecture Details](#hexagonal-architecture-details)
6. [Shared Package](#shared-package)
7. [Infrastructure Components](#infrastructure-components)

## System Architecture Overview

The vbar-viber-bot project follows a **microservices architecture** pattern, consisting of four independent services that communicate through REST APIs and message queues. Each service is designed using the **Hexagonal Architecture (Ports and Adapters)** pattern to ensure separation of concerns, testability, and independence from external frameworks.

### Architecture Principles

- **Service Independence**: Each service has its own database and can be developed, deployed, and scaled independently
- **Hexagonal Architecture**: All services follow the Ports and Adapters pattern for clean separation of business logic from infrastructure
- **Event-Driven Communication**: Asynchronous communication via RabbitMQ message queue for decoupled service interactions
- **Synchronous Communication**: REST APIs for direct service-to-service communication when needed
- **Database per Service**: Each service maintains its own MongoDB database instance

### High-Level Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │     │   Viber     │     │     AI      │     │  Analytics  │
│  Service    │     │  Service    │     │  Service    │     │   Service   │
│ (Next.js)   │     │ (Express)   │     │ (Express)   │     │  (Express)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │                   │                   │                   │
┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│   MongoDB   │     │   MongoDB   │     │   MongoDB   │     │   MongoDB   │
│   (admin)   │     │    (bot)    │     │    (ai)     │     │ (analytics) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                   │
       └───────────────────┴───────────────────┴───────────────────┘
                           │
                  ┌────────▼────────┐
                  │   RabbitMQ      │
                  │  Message Queue  │
                  └─────────────────┘
```

## Service Descriptions

### Admin Service

**Technology Stack**: Next.js 14+ (App Router), TypeScript, MongoDB

**Purpose and Responsibilities**:

- Administrative dashboard and user interface
- User management and authentication
- System configuration and settings
- Service monitoring and health checks
- Content management for bot responses

**Database**: `admin` MongoDB database

**Database Schema Overview**:

- **Users**: User accounts, roles, and permissions
- **Configurations**: System-wide settings and bot configurations
- **Sessions**: User authentication sessions
- **Audit Logs**: Administrative actions and system events

**Hexagonal Architecture Adaptation**:

- Next.js App Router serves as the input adapter (HTTP layer)
- Domain and Application layers contain business logic
- MongoDB repository adapters implement output ports
- API routes act as input adapters for REST endpoints

### Viber Service

**Technology Stack**: Node.js, Express.js, TypeScript, MongoDB

**Purpose and Responsibilities**:

- Viber bot webhook handling
- Message processing and routing
- User interaction management
- Bot state management
- Integration with Viber API

**Database**: `bot` MongoDB database

**Database Schema Overview**:

- **Conversations**: User conversation threads and history
- **Messages**: Incoming and outgoing messages
- **Users**: Viber user profiles and metadata
- **Bot State**: Current bot state and context for each user
- **Webhooks**: Webhook event logs and processing status

**Hexagonal Architecture Structure**:

- Express routes as input adapters
- Domain layer contains bot logic and business rules
- Application layer orchestrates use cases
- MongoDB repositories as output adapters
- Message queue publishers for async communication

### AI Service

**Technology Stack**: Node.js, Express.js, TypeScript, MongoDB

**Purpose and Responsibilities**:

- AI model integration and processing
- Natural language processing (NLP)
- Message analysis and intent detection
- Response generation
- AI model training and fine-tuning (if applicable)

**Database**: `ai` MongoDB database

**Database Schema Overview**:

- **Models**: AI model configurations and metadata
- **Training Data**: Datasets for model training
- **Processing Logs**: AI processing history and results
- **Configurations**: AI service settings and parameters
- **Analytics**: AI performance metrics and statistics

**Hexagonal Architecture Structure**:

- Express routes as input adapters for API endpoints
- Domain layer contains AI business logic
- Application layer handles AI processing use cases
- MongoDB repositories for data persistence
- External AI service clients as output adapters

### Analytics Service

**Technology Stack**: Node.js, Express.js, TypeScript, MongoDB

**Purpose and Responsibilities**:

- Data aggregation and analysis
- Reporting and dashboards
- User behavior analytics
- Performance metrics collection
- Business intelligence queries

**Database**: `analytics` MongoDB database

**Database Schema Overview**:

- **Events**: User events and interactions
- **Metrics**: Aggregated performance metrics
- **Reports**: Generated reports and analytics
- **Dashboards**: Dashboard configurations
- **Aggregations**: Pre-computed analytics data

**Hexagonal Architecture Structure**:

- Express routes as input adapters
- Domain layer contains analytics business logic
- Application layer handles analytics use cases
- MongoDB repositories for data storage
- Message queue consumers for event processing

## Database Schemas

### Admin Database Schema

```typescript
// User Collection
interface User {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  role: "admin" | "operator" | "viewer";
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Configuration Collection
interface Configuration {
  _id: ObjectId;
  key: string;
  value: any;
  description?: string;
  updatedBy: ObjectId; // User ID
  updatedAt: Date;
}

// Session Collection
interface Session {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

// Audit Log Collection
interface AuditLog {
  _id: ObjectId;
  userId: ObjectId;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: Date;
}
```

### Bot Database Schema

```typescript
// Conversation Collection
interface Conversation {
  _id: ObjectId;
  viberUserId: string;
  status: "active" | "paused" | "ended";
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

// Message Collection
interface Message {
  _id: ObjectId;
  conversationId: ObjectId;
  viberUserId: string;
  type: "incoming" | "outgoing";
  content: string;
  timestamp: Date;
  processed: boolean;
  metadata?: Record<string, any>;
}

// Viber User Collection
interface ViberUser {
  _id: ObjectId;
  viberUserId: string;
  name: string;
  avatar?: string;
  language?: string;
  country?: string;
  subscribed: boolean;
  subscribedAt?: Date;
  metadata?: Record<string, any>;
}

// Bot State Collection
interface BotState {
  _id: ObjectId;
  viberUserId: string;
  currentFlow: string;
  context: Record<string, any>;
  variables: Record<string, any>;
  updatedAt: Date;
}
```

### AI Database Schema

```typescript
// AI Model Collection
interface AIModel {
  _id: ObjectId;
  name: string;
  type: "nlp" | "generative" | "classification";
  version: string;
  configuration: Record<string, any>;
  status: "active" | "training" | "inactive";
  performance: {
    accuracy?: number;
    latency?: number;
    lastEvaluated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Processing Log Collection
interface ProcessingLog {
  _id: ObjectId;
  requestId: string;
  modelId: ObjectId;
  input: string;
  output: string;
  confidence?: number;
  processingTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Training Data Collection
interface TrainingData {
  _id: ObjectId;
  modelId: ObjectId;
  input: string;
  expectedOutput: string;
  tags: string[];
  createdAt: Date;
}
```

### Analytics Database Schema

```typescript
// Event Collection
interface Event {
  _id: ObjectId;
  type: string;
  userId: string;
  service: "admin" | "viber" | "ai" | "analytics";
  properties: Record<string, any>;
  timestamp: Date;
}

// Metric Collection
interface Metric {
  _id: ObjectId;
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: Date;
  aggregation?: {
    period: "hour" | "day" | "week" | "month";
    value: number;
  };
}

// Report Collection
interface Report {
  _id: ObjectId;
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  parameters: Record<string, any>;
  data: Record<string, any>;
  generatedAt: Date;
  generatedBy?: ObjectId; // User ID if manual
}
```

### Database Relationships

- **No Direct Foreign Keys**: Services maintain loose coupling through identifiers
- **Event-Based Synchronization**: Services communicate user/entity IDs through events
- **Shared Identifiers**: Common identifiers (e.g., `viberUserId`) used across services for correlation

## Communication Patterns

### REST API Communication (Synchronous)

Services communicate synchronously through REST APIs when immediate responses are required:

- **Admin Service → Viber Service**: Configuration updates, bot control commands
- **Admin Service → AI Service**: Model configuration, training triggers
- **Admin Service → Analytics Service**: Report generation, dashboard data
- **Viber Service → AI Service**: Message processing requests, intent detection
- **Viber Service → Analytics Service**: Event logging (optional synchronous)

**Communication Flow**:

```
Client → Service A → REST API → Service B → Response → Service A → Client
```

### Message Queue Communication (Asynchronous)

RabbitMQ is used for asynchronous, event-driven communication:

**Queue Names and Routing Keys**:

- `viber.messages` - Message events from Viber service
- `ai.processed` - AI processing results
- `analytics.events` - Analytics events
- `admin.config` - Configuration change events

**Event Types**:

- `message.received` - New message from user
- `message.processed` - Message processed by AI
- `user.created` - New user registered
- `config.updated` - Configuration changed
- `analytics.event` - Analytics event occurred

**Communication Flow**:

```
Service A → Publisher → RabbitMQ → Queue → Consumer → Service B
```

### Service-to-Service Communication Patterns

1. **Request-Response Pattern**: REST API calls for immediate responses
2. **Publish-Subscribe Pattern**: RabbitMQ for event broadcasting
3. **Point-to-Point Pattern**: RabbitMQ queues for direct service communication
4. **Event Sourcing**: Services publish events for state changes

### Event-Driven Architecture Overview

The system follows an event-driven architecture where:

- Services publish events for significant state changes
- Other services subscribe to relevant events
- Events are processed asynchronously
- Services maintain eventual consistency
- Event replay is possible for recovery

## Hexagonal Architecture Details

All services follow the **Hexagonal Architecture (Ports and Adapters)** pattern to ensure clean separation of concerns and testability.

### Architecture Layers

#### Domain Layer (`src/domains/`)

**Purpose**: Core business logic, entities, and domain rules (innermost layer)

**Structure**: Organized by domain with subfolders for each domain (e.g., `user/`, `auth/`, `config/`)

**Contents**:

- Domain entities (business objects)
- Value objects (immutable data structures)
- Domain services (business logic that doesn't belong to a single entity)
- Business rules and validations
- Domain events

**Organization**:

Each domain has its own folder structure:

```
domains/
├── user/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   └── events/
├── auth/
│   ├── entities/
│   ├── value-objects/
│   └── services/
└── [other-domains]/
```

**Rules**:

- **MUST NOT** depend on external frameworks
- **MUST NOT** depend on infrastructure
- Contains pure business logic
- Framework-agnostic
- Each domain should be self-contained with minimal coupling to other domains

#### Application Layer (`src/application/`)

**Purpose**: Use cases and application services

**Contents**:

- Use case implementations
- Application services (orchestration logic)
- DTOs (Data Transfer Objects)
- Application-specific interfaces
- Command and Query handlers

**Rules**:

- **MUST NOT** depend on infrastructure adapters
- **CAN** depend on domain layer
- Orchestrates domain logic
- Defines application workflows

#### Ports (Interfaces)

**Input Ports** (`src/ports/in/`):

- Interfaces for incoming operations (use cases)
- Define what the application can do
- Examples: `CreateUserUseCase`, `ProcessMessageUseCase`

**Output Ports** (`src/ports/out/`):

- Interfaces for outgoing operations
- Define what the application needs from outside
- Examples: `UserRepository`, `MessagePublisher`, `AIServiceClient`

**Rules**:

- Define contracts, not implementations
- Framework-agnostic
- Used by application layer

#### Adapters (Infrastructure)

**Input Adapters** (`src/adapters/in/`):

- HTTP controllers (Express routes, Next.js API routes)
- Message queue consumers
- WebSocket handlers
- CLI interfaces

**Output Adapters** (`src/adapters/out/`):

- Database repositories (MongoDB implementations)
- Message queue publishers (RabbitMQ)
- External API clients (Viber API, AI services)
- File system adapters
- Email services

**Rules**:

- Implement ports/interfaces
- **CAN** depend on frameworks (Express, MongoDB drivers, etc.)
- Translate between external world and application

### Dependency Direction

```
┌─────────────────────────────────────┐
│      Infrastructure Adapters        │
│  (Express, MongoDB, RabbitMQ)       │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│           Ports (Interfaces)         │
│  (Input Ports, Output Ports)        │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│        Application Layer             │
│    (Use Cases, Services, DTOs)       │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│          Domain Layer                │
│  (Entities, Value Objects, Rules)   │
└──────────────────────────────────────┘
```

**Key Rules**:

- Dependencies point **inward** (toward domain)
- Domain has **no dependencies**
- Application depends only on **Domain**
- Adapters depend on **Ports** and **Application**

### Service-Specific Hexagonal Structure

#### Node.js Express Services (Viber, AI, Analytics)

```
service/
├── src/
│   ├── domains/             # Domain layer (organized by domain)
│   │   ├── user/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── services/
│   │   │   └── events/
│   │   ├── auth/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── services/
│   │   └── [other-domains]/
│   ├── application/         # Application layer
│   │   ├── use-cases/
│   │   ├── services/
│   │   └── dto/
│   ├── ports/
│   │   ├── in/              # Input ports (use case interfaces)
│   │   └── out/              # Output ports (repository, publisher interfaces)
│   ├── adapters/
│   │   ├── in/               # Input adapters (HTTP controllers, consumers)
│   │   └── out/              # Output adapters (MongoDB repos, publishers)
│   └── config/              # Configuration and DI setup
```

#### Next.js Admin Service

```
admin/
├── src/
│   ├── app/                  # Next.js App Router (acts as input adapter)
│   │   ├── api/              # API routes (input adapters)
│   │   └── (pages)/          # Pages
│   ├── domains/              # Domain layer (organized by domain)
│   │   ├── user/
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── services/
│   │   ├── auth/
│   │   │   ├── entities/
│   │   │   └── services/
│   │   └── [other-domains]/
│   ├── application/          # Application layer
│   ├── ports/
│   │   ├── in/
│   │   └── out/
│   ├── adapters/
│   │   ├── in/               # Additional input adapters if needed
│   │   └── out/              # MongoDB repos, external services
│   └── lib/                  # Shared utilities
```

## Shared Package

**Location**: `packages/shared/`

**Purpose**: Common utilities, types, and configurations shared across all services

### Contents

#### Common TypeScript Types

- API request/response types
- Message queue event types
- Database entity types (for reference)
- Service configuration types
- Error types

#### Shared Utilities

- Logging utilities
- Validation helpers
- Date/time utilities
- String manipulation
- Error handling utilities

#### Configuration Helpers

- Environment variable validation
- Configuration loading
- Service discovery helpers
- Connection string builders

#### Message Queue Types

- Event type definitions
- Message schemas
- Queue name constants
- Routing key definitions

### Usage Pattern

Services import from the shared package:

```typescript
import { ApiResponse, MessageEvent, validateConfig } from "@vbar/shared";
```

### Benefits

- **Consistency**: Shared types ensure consistency across services
- **DRY Principle**: Common utilities avoid duplication
- **Type Safety**: Shared types provide compile-time safety
- **Maintainability**: Single source of truth for common code

## Infrastructure Components

### MongoDB Instances

Each service has its own MongoDB database instance:

- **Admin MongoDB**: Stores admin service data
- **Bot MongoDB**: Stores viber service data
- **AI MongoDB**: Stores AI service data
- **Analytics MongoDB**: Stores analytics service data

**Configuration**:

- Each service connects to its own database
- Connection strings configured via environment variables
- Database names: `admin`, `bot`, `ai`, `analytics`

### RabbitMQ Message Queue

**Purpose**: Asynchronous communication between services

**Configuration**:

- Single RabbitMQ instance for all services
- Multiple queues for different event types
- Exchange-based routing for pub/sub patterns
- Connection configured via environment variables

**Queue Management**:

- Durable queues for reliability
- Message acknowledgments for guaranteed delivery
- Dead letter queues for failed messages

### Docker Containerization

**Structure**:

- Multi-stage Dockerfiles for each service
- Optimized production images
- Development-friendly configurations
- Volume mounts for local development

**Services Containerized**:

- Admin service (Next.js)
- Viber service (Node.js)
- AI service (Node.js)
- Analytics service (Node.js)
- MongoDB instances (one per service)
- RabbitMQ

### Kubernetes Orchestration

**Deployment Strategy**:

- Namespace-based isolation
- Deployment manifests for each service
- StatefulSets for MongoDB instances
- ConfigMaps for configuration
- Secrets for sensitive data
- Ingress for external access

**Scaling**:

- Horizontal pod autoscaling
- Resource limits and requests
- Health checks and probes
- Rolling update strategies

## Diagrams

For visual representations of the architecture, see:

- [Architecture Diagram](./diagrams/architecture.mmd) - High-level system architecture
- [Data Flow Diagram](./diagrams/data-flow.mmd) - Data flow between services
- [Deployment Diagram](./diagrams/deployment.mmd) - Deployment architecture

## Related Documentation

- [Setup Guide](./setup.md) - Development environment setup
- [Deployment Guide](./deployment.md) - Docker and Kubernetes deployment
- [API Documentation](./api.md) - API contracts and endpoints
