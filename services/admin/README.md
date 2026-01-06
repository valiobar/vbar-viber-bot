# Admin Service

Next.js application for the Viber bot administrative dashboard.

## Overview

The Admin Service provides a web-based interface for managing the Viber bot system, including:

- User management and authentication
- System configuration and settings
- Service monitoring and health checks
- Content management for bot responses
- Analytics dashboard

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: MongoDB (admin database)
- **Architecture**: Hexagonal Architecture (adapted for Next.js)

## Project Structure

```
services/admin/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (input adapters)
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── domains/                # Domains layer (organized by domain)
│   │   └── user/               # User domain
│   │       ├── entities/      # Domain entities
│   │       ├── adapters/      # Domain adapters (in/out)
│   │       ├── application/   # Use cases
│   │       ├── ports/         # Ports (interfaces)
│   │       └── lib/           # Domain utilities (auth, jwt, password)
│   ├── lib/                    # Shared utilities
│   │   └── mongodb.ts          # MongoDB connection
│   └── types/                  # Service-specific types
├── package.json
├── tsconfig.json
├── next.config.js
├── .env.example
├── Dockerfile
└── README.md
```

## Hexagonal Architecture

The Admin Service follows Hexagonal Architecture principles organized by domain:

- **Next.js App Router** serves as the input adapter (HTTP layer)
- **Domains Layer** contains business logic, entities, use cases, ports, and adapters organized by domain (e.g., `user/`)
- Each domain contains:
  - **Entities**: Domain models and business logic
  - **Application**: Use cases and application services
  - **Ports**: Interfaces for input/output operations
  - **Adapters**: Infrastructure implementations (repositories, API routes)
  - **Lib**: Domain-specific utilities

## Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB instance running

### Installation

1. Install dependencies from the root:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   - `MONGODB_URI`: MongoDB connection string
   - `MONGODB_DB_NAME`: Database name (default: `admin`)

### Development

Run the development server:

```bash
npm run dev
# or from root:
npm run dev:admin
```

The application will be available at `http://localhost:3000`.

### Build

Build for production:

```bash
npm run build
# or from root:
npm run build:admin
```

### Start Production Server

```bash
npm start
```

## Environment Variables

| Variable                  | Description                                                                        | Default                             |
| ------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `NODE_ENV`                | Node environment                                                                   | `development`                       |
| `NEXT_PUBLIC_APP_URL`     | Public app URL                                                                     | `http://localhost:3000`             |
| `MONGODB_URI`             | MongoDB connection string                                                          | `mongodb://localhost:27017`         |
| `MONGODB_DB_NAME`         | MongoDB database name                                                              | `admin`                             |
| `VIBER_SERVICE_URL`       | Viber service URL                                                                  | `http://localhost:3001`             |
| `AI_SERVICE_URL`          | AI service URL                                                                     | `http://localhost:3002`             |
| `ANALYTICS_SERVICE_URL`   | Analytics service URL                                                              | `http://localhost:3003`             |
| `LOG_LEVEL`               | Logging level                                                                      | `info`                              |
| `SERVICE_TOKEN`           | General service token for service-to-service authentication                        | -                                   |
| `VIBER_SERVICE_TOKEN`     | Viber service specific token (should match `ADMIN_SERVICE_TOKEN` in viber service) | -                                   |
| `AI_SERVICE_TOKEN`        | AI service specific token                                                          | -                                   |
| `ANALYTICS_SERVICE_TOKEN` | Analytics service specific token                                                   | -                                   |
| `RABBITMQ_URI`            | RabbitMQ connection URI for refresh notifications                                  | `amqp://admin:admin@localhost:5672` |

### Service Token Authentication

The admin service supports service-to-service authentication using service tokens. API routes that accept JWT tokens (for admin UI users) also accept service tokens (for service-to-service communication).

**Service Token Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging and identification

**Service Token Configuration**:

- Service tokens are configured via environment variables
- Multiple tokens can be configured for different services
- Tokens should be long, random strings (recommended: 64 hex characters)
- Generate tokens using: `openssl rand -hex 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

**Routes Supporting Service Tokens**:

- `/api/bot-settings` (GET)
- `/api/steps` (GET)
- `/api/messages` (GET)
- `/api/keyboards` (GET)
- All other `/api/*` routes that require authentication

## API Endpoints

### Health Check

- **GET** `/api/health`
- Returns service health status and database connection status

## Bot Data Refresh Notification

The admin service automatically notifies all viber service instances when bot data changes. This ensures that all viber service instances (including multiple replicas in Kubernetes) stay synchronized.

### How It Works

When steps, messages, keyboards, or bot-settings are created, updated, or deleted:

1. The admin service publishes a refresh event to RabbitMQ
2. All viber service instances consume the event
3. Each instance refreshes its in-memory cache

### Configuration

**Environment Variables**:

- `RABBITMQ_URI` - RabbitMQ connection URI (default: `amqp://admin:admin@localhost:5672`)

### Dependencies

- RabbitMQ must be running and accessible
- Viber service instances must be running and connected to RabbitMQ

### Error Handling

- If RabbitMQ publish fails, the error is logged but doesn't affect the main operation
- Refresh notifications use fire-and-forget pattern (non-blocking)

## Database

The Admin Service uses MongoDB with the following collections:

- **Users**: User accounts, roles, and permissions
- **Configurations**: System-wide settings and bot configurations
- **Sessions**: User authentication sessions
- **Audit Logs**: Administrative actions and system events

## Shared Package

The service uses the `@vbar/shared` package for:

- Common TypeScript types (`User`, `Config`, `ApiResponse`, etc.)
- Configuration helpers (`ConfigHelper`)
- Shared utilities

Import from the shared package:

```typescript
import { User, Config, ApiResponse, ConfigHelper } from "@vbar/shared";
```

## Docker

The service includes a multi-stage Dockerfile for containerization.

Build the Docker image:

```bash
docker build -t vbar-admin -f services/admin/Dockerfile .
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Deployment Guide](../../documentation/deployment.md)
- [Setup Guide](../../documentation/setup.md)
