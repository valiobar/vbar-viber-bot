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
│   ├── domain/                 # Domain layer (business logic)
│   ├── application/            # Application layer (use cases)
│   ├── ports/                  # Ports (interfaces)
│   │   ├── in/                 # Input ports
│   │   └── out/                # Output ports
│   ├── adapters/               # Adapters (infrastructure)
│   │   ├── in/                 # Input adapters
│   │   └── out/                # Output adapters (MongoDB repos, etc.)
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

The Admin Service follows Hexagonal Architecture principles:

- **Next.js App Router** serves as the input adapter (HTTP layer)
- **Domain Layer** contains business logic and entities
- **Application Layer** orchestrates use cases
- **Ports** define interfaces for input/output operations
- **Adapters** implement infrastructure concerns (MongoDB, external APIs)

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

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | MongoDB database name | `admin` |
| `VIBER_SERVICE_URL` | Viber service URL | `http://localhost:3001` |
| `AI_SERVICE_URL` | AI service URL | `http://localhost:3002` |
| `ANALYTICS_SERVICE_URL` | Analytics service URL | `http://localhost:3003` |
| `LOG_LEVEL` | Logging level | `info` |

## API Endpoints

### Health Check

- **GET** `/api/health`
- Returns service health status and database connection status

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

