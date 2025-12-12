# Viber Service

Node.js Express service for handling Viber bot webhooks, message processing, and user interactions.

## Overview

The Viber Service is responsible for:
- Viber bot webhook handling
- Message processing and routing
- User interaction management
- Bot state management
- Integration with Viber API
- Publishing analytics events to RabbitMQ

## Architecture

This service follows **Hexagonal Architecture (Ports and Adapters)** pattern:

```
services/viber/
├── src/
│   ├── domain/              # Domain layer (business logic, entities)
│   ├── application/         # Application layer (use cases, services)
│   ├── ports/
│   │   ├── in/              # Input ports (use case interfaces)
│   │   └── out/             # Output ports (repository, publisher interfaces)
│   ├── adapters/
│   │   ├── in/              # Input adapters (Express routes, webhook handlers)
│   │   └── out/             # Output adapters (MongoDB repos, message publishers)
│   ├── config/              # Configuration (database, message queue, Viber)
│   └── index.ts             # Entry point
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (bot database)
- **Message Queue**: RabbitMQ
- **Viber Integration**: [viber-bot](https://www.npmjs.com/package/viber-bot) package

## Environment Variables

Create a `.env` file in the service root with the following variables:

```env
# Node Environment
NODE_ENV=development
PORT=3001

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=bot

# RabbitMQ Configuration
RABBITMQ_URI=amqp://localhost:5672

# Viber Bot Configuration
VIBER_BOT_TOKEN=your_viber_bot_token_here
VIBER_BOT_WEBHOOK_URL=https://your-domain.com/api/viber/webhook

# Logging
LOG_LEVEL=info

# AI Service (for gRPC communication)
AI_SERVICE_URL=http://localhost:3002
AI_SERVICE_GRPC_URL=localhost:50051
```

## Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status including database and message queue connectivity.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "viber",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "messageQueue": "connected"
  }
}
```

## Database Schema

The service uses MongoDB with the `bot` database. Key collections:

- **Conversations**: User conversation threads and history
- **Messages**: Incoming and outgoing messages
- **ViberUsers**: Viber user profiles and metadata
- **BotState**: Current bot state and context for each user
- **Webhooks**: Webhook event logs and processing status

See `documentation/architecture.md` for detailed schema definitions.

## Message Queue Integration

The service publishes analytics events to RabbitMQ:

- **Exchange**: `viber-bot`
- **Queue**: `analytics.events`
- **Routing Keys**: `analytics.*`

Events published:
- `analytics.message.received` - When a message is received
- `analytics.message.sent` - When a message is sent
- `analytics.user.action` - User action events
- `analytics.bot.interaction` - Bot interaction events

## Viber Bot Integration

The service uses the [viber-bot](https://www.npmjs.com/package/viber-bot) package for Viber API integration. The bot is configured with:

- **Token**: Viber bot authentication token
- **Webhook URL**: Public URL for receiving Viber webhooks

## Development

### Prerequisites

- Node.js 20+
- MongoDB (running locally or accessible)
- RabbitMQ (running locally or accessible)
- Viber bot token (from Viber Developer Portal)

### Running Locally

```bash
# Install dependencies
npm install

# Start MongoDB and RabbitMQ (using Docker Compose from root)
cd ../..
docker-compose up -d mongodb-bot rabbitmq

# Run in development mode with hot reload
npm run dev
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Run production build
npm start
```

## Docker

The service includes a multi-stage Dockerfile for optimized production images.

```bash
# Build Docker image
docker build -t vbar-viber:latest .

# Run container
docker run -p 3001:3001 --env-file .env vbar-viber:latest
```

## Communication Patterns

### REST API (Synchronous)

- **Admin Service → Viber Service**: Configuration updates, bot control commands

### gRPC (Synchronous, High-Performance)

- **Viber Service → AI Service**: Message processing requests, intent detection (via gRPC on port 50051)

### RabbitMQ (Asynchronous)

- **Viber Service → Analytics Service**: Analytics events (queue: `analytics.events`)

## Shared Package

The service uses the `@vbar/shared` package for:
- Common TypeScript types (`Message`, `ApiResponse`, etc.)
- Configuration helpers (`ConfigHelper`)
- Message queue types and constants
- Error codes

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Deployment Guide](../../documentation/deployment.md)
- [Setup Guide](../../documentation/setup.md)

## License

ISC

