# Analytics Service

Analytics Service for Viber Bot - Node.js Express service with Hexagonal Architecture.

## Overview

The Analytics Service provides data aggregation, analysis, and reporting capabilities for the Viber bot, including:

- Data aggregation and analysis
- Reporting and dashboards
- User behavior analytics
- Performance metrics collection
- Business intelligence queries
- Event processing from RabbitMQ

## Architecture

This service follows **Hexagonal Architecture (Ports and Adapters)** pattern:

- **Domains Layer** (`src/domains/`): Core business logic, entities, and domain rules organized by domain
- **Application Layer** (`src/application/`): Use cases and application services
- **Ports** (`src/ports/`): Interfaces for input/output operations
- **Adapters** (`src/adapters/`): HTTP controllers, database repositories, message queue consumers

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (analytics database)
- **Message Queue**: RabbitMQ (consumes analytics events)

## Environment Variables

### Required Variables

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017`)
- `MONGODB_DB_NAME`: Database name (default: `analytics`)
- `RABBITMQ_URI`: RabbitMQ connection string (default: `amqp://localhost:5672`)

### Optional Variables

- `PORT`: Server port (default: `3003`)

### Example `.env` file

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=analytics

# RabbitMQ Configuration
RABBITMQ_URI=amqp://localhost:5672

# Server Configuration
PORT=3003
NODE_ENV=development
```

## Development

### Prerequisites

- Node.js 20+
- MongoDB instance
- RabbitMQ instance

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables (create .env file manually)
# See Environment Variables section above
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

### Analytics (Future Endpoints)

- `GET /api/analytics/events` - Get analytics events
- `GET /api/analytics/metrics` - Get aggregated metrics
- `GET /api/analytics/reports` - Get generated reports
- `POST /api/analytics/reports` - Generate new report
- `GET /api/analytics/dashboards` - Get dashboard data

**Note**: These endpoints will be implemented as the service evolves. Currently, the service focuses on consuming events from RabbitMQ and storing them in MongoDB.

## Message Queue

The Analytics Service consumes messages from RabbitMQ queue `analytics.events` for asynchronous event processing.

### Queue Configuration

- **Queue Name**: `analytics.events`
- **Exchange**: `viber-bot` (topic exchange)
- **Routing Keys**:
  - `analytics.event` - General analytics event
  - `analytics.message.received` - Message received event
  - `analytics.message.sent` - Message sent event
  - `analytics.user.action` - User action event
  - `analytics.bot.interaction` - Bot interaction event

### Event Flow

1. Viber Service publishes analytics events to RabbitMQ
2. Analytics Service consumes events from the queue
3. Events are processed and stored in MongoDB
4. Admin Service queries analytics data via REST API

## Database Schema

The Analytics Service uses MongoDB with the following collections:

- **Events**: User events and interactions
- **Metrics**: Aggregated performance metrics
- **Reports**: Generated reports and analytics
- **Dashboards**: Dashboard configurations
- **Aggregations**: Pre-computed analytics data

See [Architecture Documentation](../../documentation/architecture.md#analytics-database-schema) for detailed schema definitions.

## Docker

### Build

```bash
docker build -t analytics-service .
```

### Run

```bash
docker run -p 3003:3003 --env-file .env analytics-service
```

## Project Structure

```
services/analytics/
├── src/
│   ├── adapters/
│   │   ├── in/              # Input adapters (HTTP routes, message queue consumers)
│   │   │   └── routes/      # Express routes
│   │   └── out/             # Output adapters (MongoDB repos, message publishers)
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

