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
│   ├── domains/             # Domains layer (organized by domain)
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

# Admin Service Configuration
# Base URL for the admin service (used to fetch bot settings)
# Default: http://localhost:3000
ADMIN_SERVICE_URL=http://localhost:3000

# Security Configuration
# Service tokens for service-to-service authentication
# Used for API routes (when implemented) to authenticate requests from other services
#
# How to generate service tokens:
# Service tokens are simple secret strings. Generate them using one of these methods:
#
# Using OpenSSL (recommended):
#   openssl rand -hex 32
#
# Using Node.js:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# Using Python:
#   python3 -c "import secrets; print(secrets.token_hex(32))"
#
# Best practices:
# - Use at least 32 bytes (64 hex characters) for security
# - Use different tokens for each service
# - Store tokens securely (never commit to version control)
# - Rotate tokens periodically
#
SERVICE_TOKEN=your_service_token_here
ADMIN_SERVICE_TOKEN=your_admin_service_token_here
AI_SERVICE_TOKEN=your_ai_service_token_here
ANALYTICS_SERVICE_TOKEN=your_analytics_service_token_here

# Rate Limiting Configuration
# Time window for rate limiting in milliseconds (default: 60000 = 1 minute)
RATE_LIMIT_WINDOW_MS=60000
# Maximum requests per window for general routes (default: 100)
RATE_LIMIT_MAX_REQUESTS=100
# Maximum requests per window for health check routes (default: 10)
RATE_LIMIT_HEALTH_MAX=10
# Maximum requests per window for webhook routes (default: 1000)
RATE_LIMIT_WEBHOOK_MAX=1000
# Maximum requests per window for service-to-service API routes (default: 5000)
RATE_LIMIT_SERVICE_MAX=5000

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

**Security Requirements**:

- **Rate Limiting**: 10 requests per minute per IP (strict limit)
- **Authentication**: No authentication required (public endpoint for monitoring)
- **Information Disclosure**: Limited information in production mode (only status, timestamp, service name)

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

**Production Response** (limited information):

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "viber"
}
```

### Webhook Endpoint

```
POST /webhook/viber
GET /webhook/viber
```

Viber webhook endpoint for receiving events from Viber.

**Security Requirements**:

- **Signature Verification**: Required for POST requests (HMAC-SHA256 with bot token)
- **Rate Limiting**: 1000 requests per minute per IP
- **Authentication**: No service token required (public endpoint for Viber servers)
- **Headers**: `X-Viber-Content-Signature` (required for POST)

See [Security](#security) section for detailed webhook signature verification process.

## Security

The Viber Service implements comprehensive security measures to protect against unauthorized access, abuse, and attacks while maintaining public accessibility for Viber webhook callbacks.

### Webhook Signature Verification

All webhook requests from Viber must include a valid signature in the `X-Viber-Content-Signature` header. The signature is verified using HMAC-SHA256 with the Viber bot token as the secret.

**Signature Verification Process**:

1. Extract signature from `X-Viber-Content-Signature` header
2. Calculate expected signature using HMAC-SHA256:
   - Algorithm: HMAC-SHA256
   - Secret: Viber bot token (from `VIBER_BOT_TOKEN` environment variable)
   - Payload: Raw request body (before JSON parsing)
3. Compare signatures using timing-safe comparison to prevent timing attacks
4. Reject requests with invalid or missing signatures (returns 401 Unauthorized)

**Error Responses**:

- `401 Unauthorized`: Missing or invalid webhook signature
- `500 Internal Server Error`: Server configuration error (raw body not available)

### Rate Limiting

The service implements different rate limits for different route types to prevent abuse:

- **General Routes** (`/`): 100 requests per minute per IP
- **Health Check** (`/health`): 10 requests per minute per IP (strict)
- **Webhook** (`/webhook/viber`): 1000 requests per minute per IP (Viber can send many events)
- **API Routes** (`/api/*`): 5000 requests per minute per service token (when implemented)

**Rate Limit Headers**:

All responses include rate limit information:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `RateLimit-Limit`: Standard header (draft standard)
- `RateLimit-Remaining`: Standard header (draft standard)
- `RateLimit-Reset`: Standard header (draft standard)

**Rate Limit Exceeded Response**:

When rate limit is exceeded, the service returns:

- HTTP Status: `429 Too Many Requests`
- Error Code: `SVC_003`
- Message: "Too many requests, please try again later"

### Service-to-Service Authentication

For future API routes, the service supports service-to-service authentication using service tokens. This middleware is available and ready for use when API routes are implemented.

**Authentication Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging and identification

**Service Tokens**:

Service tokens are configured via environment variables:

- `SERVICE_TOKEN`: General service token
- `ADMIN_SERVICE_TOKEN`: Admin service specific token
- `AI_SERVICE_TOKEN`: AI service specific token
- `ANALYTICS_SERVICE_TOKEN`: Analytics service specific token

**Token Validation**:

- Tokens are validated using timing-safe comparison to prevent timing attacks
- Invalid or missing tokens return `401 Unauthorized`
- Authentication attempts are logged for security monitoring

**Error Responses**:

- `401 Unauthorized`: Missing or invalid service token
- `500 Internal Server Error`: Server configuration error (service tokens not configured)

### Security Middleware Order

The security middleware is applied in the following order:

1. **Raw Body Preservation**: Store raw body for webhook signature verification
2. **JSON/URL Parsing**: Parse request bodies
3. **Request Logging**: Log all requests for audit
4. **General Rate Limiting**: Base rate limit for all routes
5. **Route-Specific Middleware**: Webhook verification, service auth, specific rate limits
6. **Route Handlers**: Actual route logic
7. **Error Handling**: Catch and format errors

### Security Configuration

All security settings are configurable via environment variables (see [Environment Variables](#environment-variables) section):

- Service tokens: `SERVICE_TOKEN`, `ADMIN_SERVICE_TOKEN`, `AI_SERVICE_TOKEN`, `ANALYTICS_SERVICE_TOKEN`
- Rate limit window: `RATE_LIMIT_WINDOW_MS` (default: 60000ms = 1 minute)
- Rate limit values: `RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_HEALTH_MAX`, `RATE_LIMIT_WEBHOOK_MAX`, `RATE_LIMIT_SERVICE_MAX`

### Security Best Practices

- **Webhook Security**: Always verify webhook signatures to prevent unauthorized webhook calls
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Service Authentication**: Use service tokens for internal service communication
- **Token Rotation**: Service tokens should be rotated periodically
- **Error Messages**: Don't leak sensitive information in error responses
- **Logging**: All security events (failed auth, rate limit exceeded) are logged for monitoring

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
