# API Documentation

## Table of Contents

1. [API Overview](#api-overview)
2. [Admin Service API](#admin-service-api)
3. [Viber Service API](#viber-service-api)
4. [AI Service API](#ai-service-api)
5. [Analytics Service API](#analytics-service-api)
6. [Web3 Service API](#web3-service-api)
7. [Message Queue API](#message-queue-api)
8. [gRPC API](#grpc-api)
9. [API Contracts](#api-contracts)

## API Overview

### API Architecture

The vbar-viber-bot project uses multiple communication protocols depending on the service interaction:

- **RESTful API**: For Admin Service interactions with other services
- **gRPC**: For high-performance communication between Viber Service ↔ AI Service, Viber Service ↔ Web3 Service, and AI Service ↔ Web3 Service
- **RabbitMQ**: For asynchronous communication from Viber Service to Analytics Service and Web3 Service to Analytics Service

All services follow consistent patterns for authentication, error handling, and response formatting.

**Communication Patterns**:

- **REST API**: Used for synchronous communication (Admin ↔ Analytics, Admin ↔ Viber, Admin ↔ AI, Admin ↔ Web3)
- **gRPC**: Used for high-performance communication:
  - **Viber Service ↔ AI Service**: Message processing, intent detection
  - **Viber Service ↔ Web3 Service**: All blockchain operations (wallet management, transactions, tokens, NFTs, smart contracts)
  - **AI Service ↔ Web3 Service**: All blockchain operations (wallet management, transactions, tokens, NFTs, smart contracts)
- **RabbitMQ**: Used for asynchronous data flow from Viber Service → Analytics Service, Web3 Service → Analytics Service

### Base URLs

**Development Environment**:

- Admin Service: `http://localhost:3000`
- Viber Service: `http://localhost:3001`
- AI Service: `http://localhost:3002`
- Analytics Service: `http://localhost:3003`
- Web3 Service: `http://localhost:3004`

**Production Environment**:

- Base URLs are configured via environment variables and Kubernetes Ingress
- Services are accessible through service names within the Kubernetes cluster
- External access is provided through Ingress controllers

### Authentication and Authorization

#### JWT Token Authentication

Most endpoints require JWT (JSON Web Token) authentication:

```http
Authorization: Bearer <jwt_token>
```

**Token Format**:

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user" | "viewer";
  iat: number;
  exp: number;
}
```

#### Service-to-Service Authentication

Services communicate using API keys or service tokens:

```http
X-Service-Token: <service_token>
X-Service-Name: <service_name>
```

### Error Handling

All APIs follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    path: string;
  };
}
```

**HTTP Status Codes**:

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required or invalid
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate entry)
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Response Formats

#### Success Response

```typescript
interface SuccessResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}
```

#### Pagination

Paginated responses include metadata:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Rate Limiting

Rate limiting is implemented to prevent abuse:

- **Default Rate Limit**: 100 requests per minute per IP
- **Authenticated Users**: 1000 requests per minute per user
- **Service-to-Service**: 5000 requests per minute per service

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Admin Service API

**Base URL**: `http://localhost:3000` (development)

The Admin Service provides endpoints for administrative operations, user management, and system configuration. The Admin Service retrieves analytics data from the Analytics Service via REST API calls (see Analytics Service API section).

### Authentication Endpoints

#### POST /api/auth/login

Authenticate user and receive JWT tokens.

**Request**:

```typescript
interface LoginRequest {
  username: string; // Username (lowercase letters, numbers, underscores only, 3-50 characters)
  password: string; // User password
}
```

**Response** (`200 OK`):

```typescript
interface LoginResponse {
  data: {
    accessToken: string; // JWT access token
    refreshToken: string; // JWT refresh token (stored in database)
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
      role: "admin" | "user" | "viewer";
      createdAt: string;
      updatedAt: string;
      lastLoginAt?: string;
    };
  };
}
```

**Error Codes**:

- `AUTH_001` - Invalid credentials, missing username/password, or validation error
- `AUTH_002` - Account locked (if implemented)
- `AUTH_003` - Account disabled (if implemented)

**Validation Rules**:

- Username: 3-50 characters, lowercase letters, numbers, and underscores only
- Password: Required, non-empty string

#### POST /api/auth/logout

Invalidate current session by deleting refresh token from database.

**Request**:

```typescript
interface LogoutRequest {
  refreshToken: string; // Refresh token to invalidate
}
```

**Note**: The refresh token can also be provided in the `Authorization` header as a fallback, but it's recommended to send it in the request body.

**Response** (`200 OK`):

```typescript
interface LogoutResponse {
  data: {
    message: string; // Success message (e.g., "Logged out successfully")
    success: boolean; // Always true on success
  };
}
```

**Error Codes**:

- `AUTH_001` - Missing or invalid refresh token

#### POST /api/auth/refresh

Refresh JWT access token using a valid refresh token. The refresh token is rotated (old one deleted, new one generated) for security.

**Request**:

```typescript
interface RefreshTokenRequest {
  refreshToken: string; // Refresh token to exchange for new access token
}
```

**Note**: The refresh token can also be provided in the `Authorization` header as a fallback, but it's recommended to send it in the request body.

**Response** (`200 OK`):

```typescript
interface RefreshTokenResponse {
  data: {
    accessToken: string; // New JWT access token
    refreshToken?: string; // New JWT refresh token (if token rotation is enabled)
  };
}
```

**Error Codes**:

- `AUTH_004` - Token expired
- `AUTH_005` - Token invalid or missing

### User Management Endpoints

#### GET /api/users

Get list of users with pagination.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page
- `role` (string, optional) - Filter by role
- `search` (string, optional) - Search by email or name

**Response** (`200 OK`):

```typescript
{
  data: User[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET /api/users/:id

Get user by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "user" | "viewer";
    createdAt: string;
    updatedAt: string;
  }
}
```

#### POST /api/users

Create new user.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user" | "viewer";
}
```

**Response** (`201 Created`):

```typescript
{
  data: User;
}
```

**Error Codes**:

- `USER_001` - Email already exists
- `USER_002` - Invalid email format
- `USER_003` - Password too weak

#### PUT /api/users/:id

Update user.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface UpdateUserRequest {
  name?: string;
  role?: "admin" | "user" | "viewer";
  password?: string;
}
```

**Response** (`200 OK`):

```typescript
{
  data: User;
}
```

#### DELETE /api/users/:id

Delete user.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Response** (`200 OK`):

```typescript
{
  data: {
    message: "User deleted successfully";
  }
}
```

### Configuration Endpoints

#### GET /api/config

Get system configuration.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    bot: {
      enabled: boolean;
      welcomeMessage: string;
      defaultLanguage: string;
    }
    ai: {
      model: string;
      temperature: number;
      maxTokens: number;
    }
    analytics: {
      retentionDays: number;
      aggregationInterval: string;
    }
  }
}
```

#### PUT /api/config

Update system configuration.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface UpdateConfigRequest {
  bot?: {
    enabled?: boolean;
    welcomeMessage?: string;
    defaultLanguage?: string;
  };
  ai?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  analytics?: {
    retentionDays?: number;
    aggregationInterval?: string;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: Config;
}
```

### Bot Settings Endpoints

Bot Settings follow a **singleton pattern** - only one settings document exists in the database. The endpoints manage global bot configuration including bot identity, default button styles, welcome step reference, and analytics configuration.

#### GET /api/bot-settings

Get bot settings (singleton).

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    avatarURL: string | null;
    botName: string;
    botViberName: string | null;
    status: "active" | "inactive" | "maintenance";
    buttonsBackground: string | null; // Hex color code (e.g., "#FFFFFF")
    buttonsTextColor: string | null; // Hex color code (e.g., "#000000")
    buttonsPrefix: string | null;
    welcomeStepId: string | null; // Step ID reference
    GAKey: string | null; // Google Analytics key
    createdAt: string; // ISO 8601 date string
    updatedAt: string; // ISO 8601 date string
  }
}
```

**Error Codes**:

- `BOT_SETTINGS_001` - Bot settings not found (404) or internal server error (500)

**Note**: If no settings exist, the endpoint returns a 404 error. The first update via PUT will create the initial settings document.

#### PUT /api/bot-settings

Update bot settings (singleton). Supports partial updates - only provided fields will be updated.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface UpdateBotSettingsRequest {
  avatarURL?: string | null; // Valid URL or null
  botName?: string; // Required if creating new settings, max 100 characters
  botViberName?: string | null; // Max 100 characters
  status?: "active" | "inactive" | "maintenance";
  buttonsBackground?: string | null; // Hex color code (e.g., "#FFFFFF" or "#FFFFFFFF")
  buttonsTextColor?: string | null; // Hex color code (e.g., "#000000" or "#000000FF")
  buttonsPrefix?: string | null; // Max 50 characters
  welcomeStepId?: string | null; // Valid Step ID or null
  GAKey?: string | null; // Max 100 characters
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    avatarURL: string | null;
    botName: string;
    botViberName: string | null;
    status: "active" | "inactive" | "maintenance";
    buttonsBackground: string | null;
    buttonsTextColor: string | null;
    buttonsPrefix: string | null;
    welcomeStepId: string | null;
    GAKey: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Validation Rules**:

- `avatarURL`: Must be a valid URL format or null
- `botName`: Required when creating new settings, must be non-empty, max 100 characters
- `botViberName`: Optional, max 100 characters
- `status`: Must be one of "active", "inactive", "maintenance"
- `buttonsBackground`: Must be a valid hex color code (6 or 8 digits) or null (e.g., "#FFFFFF" or "#FFFFFFFF")
- `buttonsTextColor`: Must be a valid hex color code (6 or 8 digits) or null
- `buttonsPrefix`: Optional, max 50 characters
- `welcomeStepId`: Must be a valid MongoDB ObjectId or null. If provided, the referenced Step must exist.
- `GAKey`: Optional, max 100 characters

**Error Codes**:

- `BOT_SETTINGS_001` - Bot settings not found (for GET if no settings exist)
- `BOT_SETTINGS_002` - Validation error (400) - Invalid field format or missing required field
- `BOT_SETTINGS_003` - Referenced Step not found (400) - welcomeStepId references a non-existent Step
- `BOT_SETTINGS_004` - Update failed (500) - Internal server error

**Singleton Pattern Behavior**:

- If no settings document exists, the first PUT request will create a new document with default values
- Default `buttonsPrefix` is automatically generated as a 14-character string (13 random alphanumeric characters + "-" at the end) when creating initial settings
- Default `status` is "active" if not provided
- All subsequent PUT requests update the same single document
- The repository ensures only one document exists using `findOneAndUpdate()` with upsert option

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
  }
}
```

## Viber Service API

**Base URL**: `http://localhost:3001` (development)

The Viber Service handles Viber bot webhooks, message processing, and bot configuration. The Viber Service communicates with the AI Service using **gRPC** for high-performance message processing and intent detection.

### Security Overview

The Viber Service implements comprehensive security measures:

- **Webhook Signature Verification**: All webhook requests must include valid HMAC-SHA256 signatures
- **Rate Limiting**: Different rate limits for different route types (general, health check, webhook, API)
- **Service-to-Service Authentication**: Service tokens for internal service communication (for future API routes)
- **Security Headers**: Rate limit information included in all responses

### Webhook Signature Verification

Viber webhook requests must include a valid signature in the `X-Viber-Content-Signature` header. The signature is verified using HMAC-SHA256 with the Viber bot token as the secret.

**Signature Calculation**:

- Algorithm: HMAC-SHA256
- Secret: Viber bot token (from `VIBER_BOT_TOKEN` environment variable)
- Payload: Raw request body (before JSON parsing, must be Buffer)

**Verification Process**:

1. Extract signature from `X-Viber-Content-Signature` header
2. Calculate expected signature using HMAC-SHA256 with bot token and raw body
3. Compare signatures using timing-safe comparison (prevents timing attacks)
4. Reject requests with invalid or missing signatures

**Error Responses**:

- `401 Unauthorized` (AUTH_001): Missing webhook signature
- `401 Unauthorized` (AUTH_002): Invalid webhook signature
- `500 Internal Server Error` (SVC_002): Server configuration error (raw body not available)

### Service-to-Service Authentication

For API routes (when implemented), the service supports service-to-service authentication using service tokens.

**Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging and identification

**Service Tokens**:
Service tokens are configured via environment variables:

- `SERVICE_TOKEN`: General service token
- `ADMIN_SERVICE_TOKEN`: Admin service specific token
- `AI_SERVICE_TOKEN`: AI service specific token
- `ANALYTICS_SERVICE_TOKEN`: Analytics service specific token

**Token Validation**:

- Tokens are validated using timing-safe comparison
- Invalid or missing tokens return `401 Unauthorized`
- Authentication attempts are logged for security monitoring

**Error Responses**:

- `401 Unauthorized` (AUTH_001): Missing service token
- `401 Unauthorized` (AUTH_002): Invalid service token
- `500 Internal Server Error` (SVC_002): Server configuration error (service tokens not configured)

### Rate Limiting

The service implements different rate limits for different route types:

| Route Type                 | Limit         | Window   | Identification |
| -------------------------- | ------------- | -------- | -------------- |
| General Routes (`/`)       | 100 requests  | 1 minute | IP address     |
| Health Check (`/health`)   | 10 requests   | 1 minute | IP address     |
| Webhook (`/webhook/viber`) | 1000 requests | 1 minute | IP address     |
| API Routes (`/api/*`)      | 5000 requests | 1 minute | Service token  |

**Rate Limit Headers**:

All responses include rate limit information:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `RateLimit-Limit`: Standard header (draft standard)
- `RateLimit-Remaining`: Standard header (draft standard)
- `RateLimit-Reset`: Standard header (draft standard)

**Rate Limit Exceeded Response**:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "SVC_003",
    "message": "Too many requests, please try again later"
  }
}
```

### Webhook Endpoints

#### POST /webhook/viber

Viber webhook endpoint for receiving events from Viber.

**Security Requirements**:

- **Signature Verification**: Required - Requests must include valid `X-Viber-Content-Signature` header
- **Rate Limiting**: 1000 requests per minute per IP
- **Authentication**: No service token required (public endpoint for Viber servers)

**Headers**:

- `X-Viber-Content-Signature` (required): HMAC-SHA256 signature of the request body
- `Content-Type`: `application/json`

**Request** (Viber Webhook Format):

```typescript
interface ViberWebhookEvent {
  event:
    | "message"
    | "delivered"
    | "seen"
    | "conversation_started"
    | "subscribed"
    | "unsubscribed";
  timestamp: number;
  message_token: number;
  user: {
    id: string;
    name: string;
    avatar?: string;
    language?: string;
    country?: string;
  };
  message?: {
    type:
      | "text"
      | "picture"
      | "video"
      | "file"
      | "location"
      | "contact"
      | "sticker"
      | "url";
    text?: string;
    media?: string;
    location?: {
      lat: number;
      lon: number;
    };
  };
}
```

**Response** (`200 OK`):

```typescript
{
  status: "ok";
}
```

**Note**: This endpoint is called by Viber's servers and requires proper webhook verification. The signature is verified using HMAC-SHA256 with the Viber bot token.

**Error Responses**:

- `401 Unauthorized`: Missing or invalid webhook signature
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server configuration error (e.g., raw body not available)

#### GET /webhook/viber

Webhook verification endpoint (Viber requirement).

**Security Requirements**:

- **Rate Limiting**: 1000 requests per minute per IP
- **Authentication**: No authentication required (public endpoint for Viber servers)
- **Signature Verification**: Not required for GET requests (only for POST)

**Query Parameters**:

- `event` - Event type
- `timestamp` - Timestamp
- `message_token` - Message token
- `user_id` - User ID

**Response** (`200 OK`):

```typescript
{
  status: "ok";
}
```

### Message Handling Endpoints

#### POST /api/messages/send

Send message to Viber user.

**Security Requirements**:

- **Authentication**: Required - `X-Service-Token` header with valid service token
- **Rate Limiting**: 5000 requests per minute per service token
- **Service Name**: Optional `X-Service-Name` header for logging

**Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging

**Request**:

```typescript
interface SendMessageRequest {
  userId: string;
  message: {
    type:
      | "text"
      | "picture"
      | "video"
      | "file"
      | "location"
      | "contact"
      | "sticker"
      | "url";
    text?: string;
    media?: string;
    location?: {
      lat: number;
      lon: number;
    };
    keyboard?: {
      Type: "keyboard";
      DefaultHeight: boolean;
      Buttons: Array<{
        ActionType: string;
        ActionBody: string;
        Text: string;
      }>;
    };
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    messageToken: number;
    status: "sent" | "failed";
    timestamp: string;
  }
}
```

**Error Codes**:

- `MSG_001` - Invalid user ID
- `MSG_002` - Message format invalid
- `MSG_003` - Viber API error

#### GET /api/messages

Get message history.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `userId` (string, optional) - Filter by user ID
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Items per page
- `startDate` (string, ISO 8601, optional) - Start date filter
- `endDate` (string, ISO 8601, optional) - End date filter

**Response** (`200 OK`):

```typescript
{
  data: Message[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### GET /api/messages/:id

Get message by ID.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    userId: string;
    type: string;
    content: Record<string, any>;
    direction: "incoming" | "outgoing";
    status: "sent" | "delivered" | "seen" | "failed";
    timestamp: string;
  }
}
```

### Bot Configuration Endpoints

#### GET /api/bot/config

Get bot configuration.

**Security Requirements**:

- **Authentication**: Required - `X-Service-Token` header with valid service token
- **Rate Limiting**: 5000 requests per minute per service token
- **Service Name**: Optional `X-Service-Name` header for logging

**Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging

**Response** (`200 OK`):

```typescript
{
  data: {
    enabled: boolean;
    welcomeMessage: string;
    defaultLanguage: string;
    autoReply: boolean;
    aiEnabled: boolean;
  }
}
```

#### PUT /api/bot/config

Update bot configuration.

**Security Requirements**:

- **Authentication**: Required - `X-Service-Token` header with valid service token
- **Rate Limiting**: 5000 requests per minute per service token
- **Service Name**: Optional `X-Service-Name` header for logging

**Headers**:

- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging

**Request**:

```typescript
interface UpdateBotConfigRequest {
  enabled?: boolean;
  welcomeMessage?: string;
  defaultLanguage?: string;
  autoReply?: boolean;
  aiEnabled?: boolean;
}
```

**Response** (`200 OK`):

```typescript
{
  data: BotConfig;
}
```

### Health Check

#### GET /health

Service health check.

**Security Requirements**:

- **Rate Limiting**: 10 requests per minute per IP (strict limit)
- **Authentication**: No authentication required (public endpoint for monitoring)
- **Information Disclosure**: Limited information in production mode (only status, timestamp, service name)

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
    viberApi: "connected" | "disconnected";
  }
}
```

**Production Response** (limited information):

```typescript
{
  status: "ok" | "error";
  timestamp: string;
  service: "viber";
}
```

## AI Service API

**Base URL**: `http://localhost:3002` (development)  
**gRPC Endpoint**: `localhost:50051` (development)  
**Ollama URL**: `http://localhost:11434` (when using self-hosted models)

The AI Service provides endpoints for AI processing, model configuration, and training operations. The Viber Service communicates with the AI Service using **gRPC** for high-performance message processing. The Admin Service accesses AI Service configuration and training endpoints via **REST API**.

**AI Model Providers**:

The AI Service supports multiple AI model providers:

- **Ollama** (Self-hosted): Local LLM models (Llama 2, Mistral, CodeLlama, etc.) - accessed via HTTP API
- **OpenAI**: GPT-4, GPT-3.5, and other OpenAI models - accessed via REST API
- **Anthropic**: Claude models - accessed via REST API
- **Google**: Gemini models - accessed via REST API
- **Other providers**: Extensible architecture supports additional providers

The provider is configured via the `AI_MODEL_PROVIDER` environment variable. The service can dynamically switch between providers and supports fallback mechanisms for reliability.

### AI Processing Endpoints

**Note**: The Viber Service uses **gRPC** to call AI processing methods (see [gRPC API](#grpc-api) section). The REST endpoints below are primarily for Admin Service access and testing purposes.

#### POST /api/ai/process

Process message with AI (REST endpoint - primarily for Admin Service and testing).

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Note**: For production use, Viber Service should use the gRPC `ProcessMessage` method.

**Request**:

```typescript
interface ProcessMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    userPreferences?: Record<string, any>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    response: string;
    intent?: {
      name: string;
      confidence: number;
    };
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    processingTime: number; // milliseconds
    model: string;
  };
}
```

**Error Codes**:

- `AI_001` - AI service unavailable
- `AI_002` - Invalid message format
- `AI_003` - Model not found
- `AI_004` - Rate limit exceeded

#### POST /api/ai/batch-process

Process multiple messages in batch.

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Request**:

```typescript
interface BatchProcessRequest {
  messages: Array<{
    message: string;
    userId: string;
    conversationId?: string;
  }>;
  options?: {
    model?: string;
    temperature?: number;
  };
}
```

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    response: string;
    intent?: {
      name: string;
      confidence: number;
    };
    processingTime: number;
  }>;
}
```

#### POST /api/ai/detect-intent

Detect intent from message (REST endpoint - primarily for Admin Service and testing).

**Headers**: `Authorization: Bearer <token>` or `X-Service-Token: <service_token>`

**Note**: For production use, Viber Service should use the gRPC `DetectIntent` method.

**Request**:

```typescript
interface DetectIntentRequest {
  message: string;
  userId?: string;
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    intent: {
      name: string;
      confidence: number;
      description?: string;
    };
    entities: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
  };
}
```

### Model Configuration Endpoints

#### GET /api/ai/models

Get available AI models.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    name: string;
    provider: string;
    description: string;
    capabilities: string[];
    status: "active" | "inactive" | "deprecated";
  }>;
}
```

#### GET /api/ai/models/:id

Get model details.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    name: string;
    provider: string;
    description: string;
    configuration: {
      temperature: number;
      maxTokens: number;
      topP: number;
      frequencyPenalty: number;
      presencePenalty: number;
    }
    status: "active" | "inactive" | "deprecated";
  }
}
```

#### PUT /api/ai/models/:id/config

Update model configuration.

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface UpdateModelConfigRequest {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}
```

**Response** (`200 OK`):

```typescript
{
  data: ModelConfig;
}
```

### Training Endpoints

#### POST /api/ai/train

Trigger model training (if applicable).

**Headers**: `Authorization: Bearer <token>` (requires admin role)

**Request**:

```typescript
interface TrainModelRequest {
  modelId: string;
  trainingData?: Array<{
    input: string;
    output: string;
  }>;
  parameters?: Record<string, any>;
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    trainingId: string;
    status: 'queued' | 'running';
    estimatedCompletion?: string;
  };
}
```

#### GET /api/ai/train/:trainingId

Get training status.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    trainingId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress?: number; // 0-100
    startedAt?: string;
    completedAt?: string;
    error?: string;
  };
}
```

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
    aiProvider: "connected" | "disconnected";
  }
}
```

## Analytics Service API

**Base URL**: `http://localhost:3003` (development)

The Analytics Service provides endpoints for querying analytics data, generating reports, and exporting data. The Admin Service accesses all analytics data through these REST API endpoints. The Analytics Service receives data asynchronously from the Viber Service via RabbitMQ message queue.

### Analytics Query Endpoints

#### GET /api/analytics/events

Get analytics events with filtering.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `type` (string, optional) - Event type filter
- `userId` (string, optional) - Filter by user ID
- `startDate` (string, ISO 8601, required) - Start date
- `endDate` (string, ISO 8601, required) - End date
- `page` (number, default: 1) - Page number
- `limit` (number, default: 100) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    type: string;
    userId?: string;
    properties: Record<string, any>;
    timestamp: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

#### GET /api/analytics/metrics

Get aggregated metrics.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `metric` (string, required) - Metric name (e.g., 'messages_sent', 'users_active')
- `startDate` (string, ISO 8601, required) - Start date
- `endDate` (string, ISO 8601, required) - End date
- `interval` (string, optional) - Aggregation interval ('hour', 'day', 'week', 'month')
- `groupBy` (string, optional) - Group by field (e.g., 'userId', 'type')

**Response** (`200 OK`):

```typescript
{
  data: {
    metric: string;
    interval: string;
    values: Array<{
      timestamp: string;
      value: number;
      group?: string;
    }>;
    summary: {
      total: number;
      average: number;
      min: number;
      max: number;
    }
  }
}
```

#### GET /api/analytics/dashboard

Get dashboard data (aggregated metrics for dashboard view).

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `period` (string, optional) - Time period ('today', 'week', 'month', 'year')
- `metrics` (string[], optional) - Specific metrics to include

**Response** (`200 OK`):

```typescript
{
  data: {
    period: string;
    metrics: Array<{
      name: string;
      value: number;
      change?: number; // percentage change from previous period
      trend: "up" | "down" | "stable";
    }>;
    charts: Array<{
      name: string;
      type: "line" | "bar" | "pie";
      data: Array<{
        label: string;
        value: number;
      }>;
    }>;
  }
}
```

### Reporting Endpoints

#### POST /api/analytics/reports

Generate a new report.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface GenerateReportRequest {
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  parameters: {
    startDate: string;
    endDate: string;
    metrics: string[];
    filters?: Record<string, any>;
  };
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    reportId: string;
    status: 'generating' | 'completed' | 'failed';
    estimatedCompletion?: string;
  };
}
```

#### GET /api/analytics/reports

Get list of reports.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:

- `type` (string, optional) - Filter by report type
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    name: string;
    type: string;
    status: "generating" | "completed" | "failed";
    generatedAt: string;
    generatedBy?: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

#### GET /api/analytics/reports/:id

Get report details and data.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    name: string;
    type: string;
    parameters: Record<string, any>;
    data: Record<string, any>;
    generatedAt: string;
    generatedBy?: string;
  };
}
```

#### DELETE /api/analytics/reports/:id

Delete a report.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    message: "Report deleted successfully";
  }
}
```

### Data Export Endpoints

#### POST /api/analytics/export

Export analytics data.

**Headers**: `Authorization: Bearer <token>`

**Request**:

```typescript
interface ExportDataRequest {
  format: "csv" | "json" | "xlsx";
  startDate: string;
  endDate: string;
  metrics: string[];
  filters?: Record<string, any>;
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    exportId: string;
    status: 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    expiresAt?: string;
  };
}
```

#### GET /api/analytics/export/:exportId

Get export status and download URL.

**Headers**: `Authorization: Bearer <token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    exportId: string;
    status: 'processing' | 'completed' | 'failed';
    format: string;
    downloadUrl?: string;
    expiresAt?: string;
    fileSize?: number;
  };
}
```

#### GET /api/analytics/export/:exportId/download

Download exported file.

**Headers**: `Authorization: Bearer <token>`

**Response**: File download (content-type depends on format)

### Health Check

#### GET /api/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
  }
}
```

## Web3 Service API

**Base URL**: `http://localhost:3004` (development)

The Web3 Service provides endpoints for blockchain wallet management, transaction operations, token transfers, NFT operations, and smart contract interactions. The Admin Service accesses Web3 functionality through these REST API endpoints. The Viber Service and AI Service communicate with the Web3 Service using **gRPC** for high-performance blockchain operations. The Web3 Service publishes analytics events to the Analytics Service via RabbitMQ message queue.

**Supported Networks**: Ethereum, Polygon, BSC (Binance Smart Chain), Arbitrum

### Authentication

All Web3 Service endpoints require service-to-service authentication:

**Headers**:
- `X-Service-Token` (required): Service token for authentication
- `X-Service-Name` (optional): Service name for logging and identification

**Service Tokens**:
Service tokens are configured via environment variables:
- `ADMIN_SERVICE_TOKEN`: Admin service specific token
- `VIBER_SERVICE_TOKEN`: Viber service specific token (for future REST API access)
- `AI_SERVICE_TOKEN`: AI service specific token (for future REST API access)

**Note**: For production use, **Viber Service and AI Service MUST use the gRPC API** (see [gRPC API - Web3 Service](#web3-service-1) section) for all blockchain operations. The REST API endpoints documented below are primarily for Admin Service access and testing purposes.

### Wallet Management Endpoints

#### POST /api/web3/wallets

Create a new wallet or import an existing wallet.

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface CreateWalletRequest {
  viberUserId: string; // Viber user ID associated with the wallet
  network: "ethereum" | "polygon" | "bsc" | "arbitrum"; // Blockchain network
  privateKey?: string; // Optional: Import existing wallet (if not provided, new wallet is created)
}
```

**Response** (`201 Created`):

```typescript
{
  data: {
    id: string; // Wallet ID
    viberUserId: string;
    address: string; // Blockchain address
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    createdAt: string; // ISO 8601 date string
    updatedAt: string; // ISO 8601 date string
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found (if querying non-existent wallet)
- `WEB3_002` - Invalid blockchain address (if importing with invalid private key)
- `WEB3_005` - Invalid network

#### GET /api/web3/wallets/:id

Get wallet by ID.

**Headers**: `X-Service-Token: <service_token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    viberUserId: string;
    address: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found

#### GET /api/web3/wallets

List wallets with pagination.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `viberUserId` (string, optional) - Filter by Viber user ID
- `network` (string, optional) - Filter by network ("ethereum", "polygon", "bsc", "arbitrum")
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    viberUserId: string;
    address: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    createdAt: string;
    updatedAt: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

#### GET /api/web3/wallets/:id/balance

Get wallet balance (native token balance).

**Headers**: `X-Service-Token: <service_token>`

**Response** (`200 OK`):

```typescript
{
  data: {
    walletId: string;
    address: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    balance: string; // Balance in wei/smallest unit (as string to avoid precision loss)
    balanceFormatted: string; // Human-readable balance (e.g., "1.5 ETH")
    lastUpdated: string; // ISO 8601 date string
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found
- `WEB3_007` - RPC provider unavailable

### Transaction Endpoints

#### POST /api/web3/transactions

Send a transaction (native token transfer).

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface SendTransactionRequest {
  walletId: string; // Wallet ID to send from
  to: string; // Recipient blockchain address
  value: string; // Amount in wei/smallest unit (as string)
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  gasLimit?: number; // Optional: Gas limit
  gasPrice?: string; // Optional: Gas price in wei (as string)
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    id: string; // Transaction ID (database ID)
    txHash: string; // Blockchain transaction hash
    walletId: string;
    from: string; // Sender address
    to: string; // Recipient address
    value: string; // Amount in wei
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    status: "pending" | "confirmed" | "failed";
    confirmations: number; // Number of confirmations
    createdAt: string; // ISO 8601 date string
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address (invalid 'to' address)
- `WEB3_003` - Transaction failed
- `WEB3_004` - Insufficient balance
- `WEB3_005` - Invalid network
- `WEB3_007` - RPC provider unavailable

#### GET /api/web3/transactions/:hash

Get transaction by hash.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `hash` (string, required) - Transaction hash

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    txHash: string;
    walletId: string;
    from: string;
    to: string;
    value: string; // Amount in wei
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number; // Block number when confirmed
    blockHash?: string; // Block hash when confirmed
    gasUsed?: number; // Gas used
    gasPrice?: string; // Gas price in wei
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Codes**:
- `WEB3_003` - Transaction failed (transaction not found or failed)

#### GET /api/web3/transactions

List transactions with pagination.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `walletId` (string, optional) - Filter by wallet ID
- `network` (string, optional) - Filter by network
- `status` (string, optional) - Filter by status ("pending", "confirmed", "failed")
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    id: string;
    txHash: string;
    walletId: string;
    from: string;
    to: string;
    value: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    createdAt: string;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

#### GET /api/web3/transactions/:hash/track

Track transaction status (poll for updates).

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `hash` (string, required) - Transaction hash

**Response** (`200 OK`):

```typescript
{
  data: {
    txHash: string;
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    blockNumber?: number;
    blockHash?: string;
    lastChecked: string; // ISO 8601 date string
  }
}
```

**Error Codes**:
- `WEB3_003` - Transaction failed (transaction not found)

### Token Operations Endpoints

#### GET /api/web3/tokens/:address/balance

Get ERC-20 token balance for a wallet.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `address` (string, required) - Token contract address
- `walletId` (string, required) - Wallet ID to check balance for
- `network` (string, required) - Network ("ethereum", "polygon", "bsc", "arbitrum")

**Response** (`200 OK`):

```typescript
{
  data: {
    walletId: string;
    walletAddress: string;
    tokenAddress: string;
    tokenSymbol: string; // e.g., "USDT", "USDC"
    tokenName: string; // e.g., "Tether USD"
    tokenDecimals: number; // Token decimals (e.g., 18)
    balance: string; // Balance in smallest unit (as string)
    balanceFormatted: string; // Human-readable balance (e.g., "100.5 USDT")
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    lastUpdated: string; // ISO 8601 date string
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address (invalid token address)
- `WEB3_005` - Invalid network
- `WEB3_007` - RPC provider unavailable

#### POST /api/web3/tokens/transfer

Transfer ERC-20 tokens.

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface TransferTokenRequest {
  walletId: string; // Wallet ID to send from
  tokenAddress: string; // ERC-20 token contract address
  to: string; // Recipient blockchain address
  amount: string; // Amount in smallest token unit (as string)
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  gasLimit?: number; // Optional: Gas limit
  gasPrice?: string; // Optional: Gas price in wei (as string)
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    id: string; // Transaction ID
    txHash: string; // Blockchain transaction hash
    walletId: string;
    tokenAddress: string;
    from: string;
    to: string;
    amount: string; // Amount in smallest token unit
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    createdAt: string;
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address
- `WEB3_003` - Transaction failed
- `WEB3_004` - Insufficient balance (token balance)
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

#### GET /api/web3/tokens/:address/info

Get token information (metadata).

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `address` (string, required) - Token contract address
- `network` (string, required) - Network ("ethereum", "polygon", "bsc", "arbitrum")

**Response** (`200 OK`):

```typescript
{
  data: {
    address: string; // Token contract address
    symbol: string; // Token symbol (e.g., "USDT")
    name: string; // Token name (e.g., "Tether USD")
    decimals: number; // Token decimals (e.g., 18)
    totalSupply?: string; // Total supply (if available)
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  }
}
```

**Error Codes**:
- `WEB3_002` - Invalid blockchain address
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

#### GET /api/web3/nfts/:address

Get NFTs owned by a wallet address.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `address` (string, required) - Wallet address to check NFTs for
- `network` (string, required) - Network ("ethereum", "polygon", "bsc", "arbitrum")
- `contractAddress` (string, optional) - Filter by NFT contract address
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20) - Items per page

**Response** (`200 OK`):

```typescript
{
  data: Array<{
    contractAddress: string; // NFT contract address
    tokenId: string; // NFT token ID
    owner: string; // Owner address
    tokenURI?: string; // Token metadata URI
    metadata?: Record<string, any>; // Parsed metadata (if available)
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Error Codes**:
- `WEB3_002` - Invalid blockchain address
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

### Smart Contract Endpoints

#### POST /api/web3/contracts/read

Read from a smart contract (call view/pure functions).

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface ReadContractRequest {
  contractAddress: string; // Contract address
  abi: Array<any>; // Contract ABI (or use stored ABI via contractId)
  functionName: string; // Function name to call
  args?: Array<any>; // Function arguments
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  contractId?: string; // Optional: Use stored contract ABI by ID
}
```

**Response** (`200 OK`):

```typescript
{
  data: {
    contractAddress: string;
    functionName: string;
    result: any; // Function return value
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  }
}
```

**Error Codes**:
- `WEB3_002` - Invalid blockchain address
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

#### POST /api/web3/contracts/write

Write to a smart contract (call state-changing functions).

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface WriteContractRequest {
  walletId: string; // Wallet ID to send transaction from
  contractAddress: string; // Contract address
  abi: Array<any>; // Contract ABI (or use stored ABI via contractId)
  functionName: string; // Function name to call
  args?: Array<any>; // Function arguments
  value?: string; // Optional: Native token value to send (in wei)
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  gasLimit?: number; // Optional: Gas limit
  gasPrice?: string; // Optional: Gas price in wei (as string)
  contractId?: string; // Optional: Use stored contract ABI by ID
}
```

**Response** (`202 Accepted`):

```typescript
{
  data: {
    id: string; // Transaction ID
    txHash: string; // Blockchain transaction hash
    walletId: string;
    contractAddress: string;
    functionName: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    status: "pending" | "confirmed" | "failed";
    confirmations: number;
    createdAt: string;
  }
}
```

**Error Codes**:
- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address
- `WEB3_003` - Transaction failed
- `WEB3_004` - Insufficient balance
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

#### POST /api/web3/contracts/abi

Store contract ABI for later use.

**Headers**: `X-Service-Token: <service_token>`

**Request**:

```typescript
interface StoreContractABIRequest {
  address: string; // Contract address
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  abi: Array<any>; // Contract ABI JSON
  name?: string; // Optional: Contract name for reference
}
```

**Response** (`201 Created`):

```typescript
{
  data: {
    id: string; // Contract ABI ID
    address: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    name?: string;
    abi: Array<any>; // Stored ABI
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Codes**:
- `WEB3_002` - Invalid blockchain address
- `WEB3_005` - Invalid network

#### GET /api/web3/contracts/:address/abi

Get stored contract ABI.

**Headers**: `X-Service-Token: <service_token>`

**Query Parameters**:
- `address` (string, required) - Contract address
- `network` (string, required) - Network ("ethereum", "polygon", "bsc", "arbitrum")

**Response** (`200 OK`):

```typescript
{
  data: {
    id: string;
    address: string;
    network: "ethereum" | "polygon" | "bsc" | "arbitrum";
    name?: string;
    abi: Array<any>; // Contract ABI
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Codes**:
- `WEB3_002` - Invalid blockchain address
- `WEB3_005` - Invalid network

### Health Check

#### GET /api/web3/health

Service health check.

**Response** (`200 OK`):

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    messageQueue: "connected" | "disconnected";
    rpcProviders: {
      ethereum: "connected" | "disconnected";
      polygon: "connected" | "disconnected";
      bsc: "connected" | "disconnected";
      arbitrum: "connected" | "disconnected";
    };
  }
}
```

## Message Queue API

The system uses **RabbitMQ** for asynchronous communication from the Viber Service to the Analytics Service and from the Web3 Service to the Analytics Service. This allows services to send analytics events without blocking, and the Analytics Service to process them asynchronously.

**Note**: All other service-to-service communication uses REST APIs or gRPC. The Admin Service retrieves analytics data from the Analytics Service via REST API endpoints.

### Queue Configuration

**RabbitMQ Connection**:

- Host: Configured via `RABBITMQ_HOST` environment variable
- Port: `5672` (default)
- Management UI: `http://localhost:15672` (development)

### Queue Names and Routing Keys

#### analytics.events

**Purpose**: Analytics events sent from Viber Service and Web3 Service to Analytics Service

**Queue Name**: `analytics.events`

**Publishers**: Viber Service, Web3 Service  
**Consumer**: Analytics Service

**Routing Keys**:

**Viber Service Events**:
- `analytics.event` - General analytics event
- `analytics.message.received` - Message received event
- `analytics.message.sent` - Message sent event
- `analytics.user.action` - User action event
- `analytics.bot.interaction` - Bot interaction event

**Web3 Service Events**:
- `web3.transaction.sent` - Transaction sent event
- `web3.transaction.confirmed` - Transaction confirmed event
- `web3.wallet.created` - Wallet created event
- `web3.token.transferred` - Token transfer event

**Message Format**:

**Viber Service Events**:

```typescript
interface AnalyticsEvent {
  event:
    | "analytics.event"
    | "analytics.message.received"
    | "analytics.message.sent"
    | "analytics.user.action"
    | "analytics.bot.interaction";
  timestamp: string;
  type: string;
  userId?: string;
  messageId?: string;
  properties: Record<string, any>;
  metadata?: {
    source: "viber";
    sessionId?: string;
    conversationId?: string;
  };
}
```

**Web3 Service Events**:

```typescript
interface Web3TransactionSentEvent {
  event: "web3.transaction.sent";
  timestamp: string;
  type: "transaction";
  walletId: string;
  viberUserId: string;
  txHash: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  from: string;
  to: string;
  value: string; // Amount in wei
  properties: {
    gasLimit?: number;
    gasPrice?: string;
    nonce?: number;
  };
  metadata?: {
    source: "web3";
    transactionType: "native" | "token" | "contract";
  };
}

interface Web3TransactionConfirmedEvent {
  event: "web3.transaction.confirmed";
  timestamp: string;
  type: "transaction";
  walletId: string;
  viberUserId: string;
  txHash: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  from: string;
  to: string;
  value: string; // Amount in wei
  confirmations: number;
  blockNumber: number;
  blockHash: string;
  properties: {
    gasUsed?: number;
    gasPrice?: string;
    status: "success" | "failed";
  };
  metadata?: {
    source: "web3";
    transactionType: "native" | "token" | "contract";
  };
}

interface Web3WalletCreatedEvent {
  event: "web3.wallet.created";
  timestamp: string;
  type: "wallet";
  walletId: string;
  viberUserId: string;
  address: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  properties: {
    isImported: boolean; // true if wallet was imported, false if newly created
  };
  metadata?: {
    source: "web3";
  };
}

interface Web3TokenTransferredEvent {
  event: "web3.token.transferred";
  timestamp: string;
  type: "token";
  walletId: string;
  viberUserId: string;
  txHash: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  tokenAddress: string;
  from: string;
  to: string;
  value: string; // Token amount (as string to avoid precision loss)
  properties: {
    tokenSymbol?: string;
    tokenName?: string;
    decimals?: number;
    gasUsed?: number;
  };
  metadata?: {
    source: "web3";
    tokenType: "ERC20" | "ERC721" | "ERC1155";
  };
}
```

**Example Messages**:

**Viber Service Event**:

```typescript
{
  event: "analytics.message.received",
  timestamp: "2024-01-15T10:30:00.000Z",
  type: "message",
  userId: "user123",
  messageId: "msg456",
  properties: {
    messageType: "text",
    messageLength: 25,
    language: "en"
  },
  metadata: {
    source: "viber",
    sessionId: "session789",
    conversationId: "conv123"
  }
}
```

**Web3 Service Events**:

```typescript
// Transaction Sent Event
{
  event: "web3.transaction.sent",
  timestamp: "2024-01-15T10:30:00.000Z",
  type: "transaction",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0x1234567890abcdef...",
  network: "ethereum",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000", // 1 ETH in wei
  properties: {
    gasLimit: 21000,
    gasPrice: "20000000000", // 20 gwei
    nonce: 5
  },
  metadata: {
    source: "web3",
    transactionType: "native"
  }
}

// Transaction Confirmed Event
{
  event: "web3.transaction.confirmed",
  timestamp: "2024-01-15T10:31:15.000Z",
  type: "transaction",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0x1234567890abcdef...",
  network: "ethereum",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000",
  confirmations: 12,
  blockNumber: 18500000,
  blockHash: "0x9876543210fedcba...",
  properties: {
    gasUsed: 21000,
    gasPrice: "20000000000",
    status: "success"
  },
  metadata: {
    source: "web3",
    transactionType: "native"
  }
}

// Wallet Created Event
{
  event: "web3.wallet.created",
  timestamp: "2024-01-15T10:25:00.000Z",
  type: "wallet",
  walletId: "wallet123",
  viberUserId: "user123",
  address: "0xabcdef1234567890...",
  network: "ethereum",
  properties: {
    isImported: false
  },
  metadata: {
    source: "web3"
  }
}

// Token Transfer Event
{
  event: "web3.token.transferred",
  timestamp: "2024-01-15T10:32:00.000Z",
  type: "token",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0xabcdef1234567890...",
  network: "ethereum",
  tokenAddress: "0x1234567890abcdef...",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000", // 1 token (18 decimals)
  properties: {
    tokenSymbol: "USDT",
    tokenName: "Tether USD",
    decimals: 18,
    gasUsed: 65000
  },
  metadata: {
    source: "web3",
    tokenType: "ERC20"
  }
}
```

### Publishing Patterns

#### Publishing from Viber Service

The Viber Service publishes analytics events to RabbitMQ when events occur:

```typescript
// Example: Publishing an analytics event from Viber Service
await messageQueue.publish("analytics.events", "analytics.message.received", {
  event: "analytics.message.received",
  timestamp: new Date().toISOString(),
  type: "message",
  userId: "user123",
  messageId: "msg456",
  properties: {
    messageType: "text",
    messageLength: 25,
    language: "en",
  },
  metadata: {
    source: "viber",
    sessionId: "session789",
    conversationId: "conv123",
  },
});
```

#### Publishing from Web3 Service

The Web3 Service publishes analytics events to RabbitMQ when blockchain events occur:

```typescript
// Example: Publishing a transaction sent event from Web3 Service
await messageQueue.publish("analytics.events", "web3.transaction.sent", {
  event: "web3.transaction.sent",
  timestamp: new Date().toISOString(),
  type: "transaction",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0x1234567890abcdef...",
  network: "ethereum",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000",
  properties: {
    gasLimit: 21000,
    gasPrice: "20000000000",
    nonce: 5,
  },
  metadata: {
    source: "web3",
    transactionType: "native",
  },
});

// Example: Publishing a wallet created event
await messageQueue.publish("analytics.events", "web3.wallet.created", {
  event: "web3.wallet.created",
  timestamp: new Date().toISOString(),
  type: "wallet",
  walletId: "wallet123",
  viberUserId: "user123",
  address: "0xabcdef1234567890...",
  network: "ethereum",
  properties: {
    isImported: false,
  },
  metadata: {
    source: "web3",
  },
});

// Example: Publishing a transaction confirmed event
await messageQueue.publish("analytics.events", "web3.transaction.confirmed", {
  event: "web3.transaction.confirmed",
  timestamp: new Date().toISOString(),
  type: "transaction",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0x1234567890abcdef...",
  network: "ethereum",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000",
  confirmations: 12,
  blockNumber: 18500000,
  blockHash: "0x9876543210fedcba...",
  properties: {
    gasUsed: 21000,
    gasPrice: "20000000000",
    status: "success",
  },
  metadata: {
    source: "web3",
    transactionType: "native",
  },
});

// Example: Publishing a token transfer event
await messageQueue.publish("analytics.events", "web3.token.transferred", {
  event: "web3.token.transferred",
  timestamp: new Date().toISOString(),
  type: "token",
  walletId: "wallet123",
  viberUserId: "user123",
  txHash: "0xabcdef1234567890...",
  network: "ethereum",
  tokenAddress: "0x1234567890abcdef...",
  from: "0xabcdef1234567890...",
  to: "0xfedcba0987654321...",
  value: "1000000000000000000",
  properties: {
    tokenSymbol: "USDT",
    tokenName: "Tether USD",
    decimals: 18,
    gasUsed: 65000,
  },
  metadata: {
    source: "web3",
    tokenType: "ERC20",
  },
});
```

#### Publishing with Exchange

```typescript
// Using topic exchange for routing
await channel.publish(
  "analytics",
  "analytics.message.received",
  Buffer.from(JSON.stringify(event))
);
```

### Consuming Patterns

#### Consuming in Analytics Service

The Analytics Service consumes messages from the queue and processes them:

```typescript
// Example: Consuming analytics events in Analytics Service
await messageQueue.consume("analytics.events", async (message) => {
  const event = JSON.parse(message.content.toString());

  // Process the analytics event
  await processAnalyticsEvent(event);

  // Acknowledge the message
  channel.ack(message);
});
```

#### Error Handling

```typescript
// Handle processing errors
try {
  await processAnalyticsEvent(message);
  channel.ack(message);
} catch (error) {
  // Log error and reject (don't requeue to avoid infinite loops)
  console.error("Failed to process analytics event:", error);
  channel.nack(message, false, false);

  // Optionally send to dead letter queue for later analysis
  await channel.publish("analytics.errors", "analytics.event.failed", message);
}
```

### Communication Flow

```
Viber Service → RabbitMQ (analytics.events queue) → Analytics Service
Web3 Service  → RabbitMQ (analytics.events queue) → Analytics Service
                                                          ↓
                                              Store in MongoDB
                                                          ↓
Admin Service ← REST API (GET /api/analytics/...) ← Analytics Service
```

### Event Types Summary

| Event Type                   | Queue              | Routing Key                  | Publisher     | Consumer          |
| ---------------------------- | ------------------ | ---------------------------- | ------------- | ----------------- |
| `analytics.event`            | `analytics.events` | `analytics.event`            | Viber Service | Analytics Service |
| `analytics.message.received` | `analytics.events` | `analytics.message.received` | Viber Service | Analytics Service |
| `analytics.message.sent`     | `analytics.events` | `analytics.message.sent`     | Viber Service | Analytics Service |
| `analytics.user.action`      | `analytics.events` | `analytics.user.action`      | Viber Service | Analytics Service |
| `analytics.bot.interaction`  | `analytics.events` | `analytics.bot.interaction`  | Viber Service | Analytics Service |
| `web3.transaction.sent`      | `analytics.events` | `web3.transaction.sent`      | Web3 Service  | Analytics Service |
| `web3.transaction.confirmed` | `analytics.events` | `web3.transaction.confirmed` | Web3 Service  | Analytics Service |
| `web3.wallet.created`        | `analytics.events` | `web3.wallet.created`        | Web3 Service  | Analytics Service |
| `web3.token.transferred`     | `analytics.events` | `web3.token.transferred`     | Web3 Service  | Analytics Service |

## gRPC API

The Viber Service and AI Service communicate with each other and with the Web3 Service using **gRPC** for high-performance, low-latency operations. gRPC provides efficient binary serialization and HTTP/2 multiplexing, making it ideal for real-time AI processing requests and blockchain operations.

**Communication Patterns**:

- **Viber Service ↔ AI Service**: gRPC for message processing and intent detection
- **Viber Service ↔ Web3 Service**: gRPC for blockchain operations (wallet management, transactions, tokens, NFTs, smart contracts)
- **AI Service ↔ Web3 Service**: gRPC for blockchain operations (wallet management, transactions, tokens, NFTs, smart contracts)

**Note**: The AI Service uses **LangChain** for all AI processing operations. All gRPC requests are processed through LangChain chains (simple, RAG, or custom) based on configuration. LangSmith tracing is automatically enabled when configured via environment variables.

### gRPC Configuration

**AI Service gRPC Endpoint**:

- **Development**: `localhost:50051`
- **Production**: Configured via environment variables

**Web3 Service gRPC Endpoint**:

- **Development**: `localhost:50052`
- **Production**: Configured via environment variables

**Protocol**: Protocol Buffers (protobuf) over HTTP/2

**LangChain Integration**:

- All AI processing uses LangChain framework
- Conversation memory is automatically managed (BufferMemory or ConversationSummaryMemory)
- Token usage tracking is available when provided by the AI provider
- Processing time is tracked and included in responses

### gRPC Service Definition

#### AI Processing Service

**Service Name**: `ai.AIProcessingService`

**Methods**:

##### ProcessMessage

Process a single message with AI.

**Request** (`ProcessMessageRequest`):

```protobuf
message ProcessMessageRequest {
  string message = 1;
  string userId = 2;
  string conversationId = 3;
  MessageContext context = 4;
  ProcessingOptions options = 5;
}

message MessageContext {
  repeated Message previousMessages = 1;
  map<string, string> userPreferences = 2;
}

message Message {
  string role = 1; // "user" or "assistant"
  string content = 2;
}

message ProcessingOptions {
  string model = 1;
  double temperature = 2;
  int32 maxTokens = 3;
}
```

**Response** (`ProcessMessageResponse`):

```protobuf
message ProcessMessageResponse {
  string response = 1;
  Intent intent = 2;
  repeated Entity entities = 3;
  int64 processingTimeMs = 4;
  string model = 5;
}

message Intent {
  string name = 1;
  double confidence = 2;
}

message Entity {
  string type = 1;
  string value = 2;
  double confidence = 3;
}
```

**TypeScript Interface**:

```typescript
interface ProcessMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    userPreferences?: Record<string, string>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface ProcessMessageResponse {
  response: string;
  intent?: {
    name: string;
    confidence: number;
  };
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  processingTimeMs: number;
  model: string;
}
```

##### DetectIntent

Detect intent from a message without full processing.

**Request** (`DetectIntentRequest`):

```protobuf
message DetectIntentRequest {
  string message = 1;
  string userId = 2;
}
```

**Response** (`DetectIntentResponse`):

```protobuf
message DetectIntentResponse {
  Intent intent = 1;
  repeated Entity entities = 2;
}
```

**TypeScript Interface**:

```typescript
interface DetectIntentRequest {
  message: string;
  userId?: string;
}

interface DetectIntentResponse {
  intent: {
    name: string;
    confidence: number;
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}
```

##### BatchProcessMessages

Process multiple messages in a single batch request.

**Request** (`BatchProcessRequest`):

```protobuf
message BatchProcessRequest {
  repeated BatchMessage messages = 1;
  ProcessingOptions options = 2;
}

message BatchMessage {
  string message = 1;
  string userId = 2;
  string conversationId = 3;
}
```

**Response** (`BatchProcessResponse`):

```protobuf
message BatchProcessResponse {
  repeated ProcessMessageResponse results = 1;
}
```

**TypeScript Interface**:

```typescript
interface BatchProcessRequest {
  messages: Array<{
    message: string;
    userId: string;
    conversationId?: string;
  }>;
  options?: {
    model?: string;
    temperature?: number;
  };
}

interface BatchProcessResponse {
  results: Array<ProcessMessageResponse>;
}
```

### gRPC Error Handling

gRPC uses standard status codes:

- `OK` (0) - Success
- `INVALID_ARGUMENT` (3) - Invalid request parameters
- `NOT_FOUND` (5) - Resource not found
- `UNAVAILABLE` (14) - Service unavailable
- `INTERNAL` (13) - Internal server error
- `DEADLINE_EXCEEDED` (4) - Request timeout

**Error Response Format**:

```typescript
interface GRPCError {
  code: number;
  message: string;
  details?: any[];
}
```

#### Web3 Service gRPC Error Handling

The Web3 Service uses standard gRPC status codes and includes Web3-specific error codes in error details:

**gRPC Status Code Mapping**:

- `OK` (0) - Success
- `INVALID_ARGUMENT` (3) - Invalid request parameters (e.g., invalid address, invalid network)
- `NOT_FOUND` (5) - Resource not found (e.g., wallet not found, transaction not found)
- `FAILED_PRECONDITION` (9) - Operation failed due to precondition (e.g., insufficient balance, transaction failed)
- `UNAVAILABLE` (14) - Service unavailable (e.g., RPC provider unavailable)
- `INTERNAL` (13) - Internal server error
- `DEADLINE_EXCEEDED` (4) - Request timeout

**Web3-Specific Error Codes** (included in error details):

- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address
- `WEB3_003` - Transaction failed
- `WEB3_004` - Insufficient balance
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

**Error Response Format with Web3 Details**:

```typescript
interface Web3GRPCError {
  code: number; // gRPC status code
  message: string; // Human-readable error message
  details?: Array<{
    type: string;
    value: string; // JSON string with error details
  }>;
}

// Example error details value:
{
  "errorCode": "WEB3_001",
  "message": "Wallet not found",
  "walletId": "wallet123",
  "network": "ethereum"
}
```

**Error Handling Examples**:

```typescript
// Example: Handling wallet not found error
try {
  const response = await client.getWallet(request);
} catch (error: any) {
  if (error.code === grpc.status.NOT_FOUND) {
    const errorDetails = JSON.parse(error.details[0].value);
    if (errorDetails.errorCode === "WEB3_001") {
      console.error("Wallet not found:", errorDetails.walletId);
      // Handle wallet not found
    }
  }
}

// Example: Handling insufficient balance error
try {
  const response = await client.sendTransaction(request);
} catch (error: any) {
  if (error.code === grpc.status.FAILED_PRECONDITION) {
    const errorDetails = JSON.parse(error.details[0].value);
    if (errorDetails.errorCode === "WEB3_004") {
      console.error("Insufficient balance:", errorDetails);
      // Handle insufficient balance
    }
  }
}

// Example: Handling RPC provider unavailable
try {
  const response = await client.getBalance(request);
} catch (error: any) {
  if (error.code === grpc.status.UNAVAILABLE) {
    const errorDetails = JSON.parse(error.details[0].value);
    if (errorDetails.errorCode === "WEB3_007") {
      console.error("RPC provider unavailable:", errorDetails.network);
      // Handle RPC provider unavailable - retry or use fallback
    }
  }
}
```

### gRPC Client Usage (Viber Service)

**Example: Calling AI Service from Viber Service**

```typescript
import { AIProcessingServiceClient } from "./generated/ai_grpc_pb";
import {
  ProcessMessageRequest,
  ProcessMessageResponse,
} from "./generated/ai_pb";

// Create gRPC client
const client = new AIProcessingServiceClient(
  "localhost:50051",
  credentials.createInsecure()
);

// Process message
async function processMessage(message: string, userId: string) {
  const request = new ProcessMessageRequest();
  request.setMessage(message);
  request.setUserId(userId);

  try {
    const response: ProcessMessageResponse = await new Promise(
      (resolve, reject) => {
        client.processMessage(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      response: response.getResponse(),
      intent: response.getIntent()
        ? {
            name: response.getIntent()!.getName(),
            confidence: response.getIntent()!.getConfidence(),
          }
        : undefined,
      entities: response.getEntitiesList().map((e) => ({
        type: e.getType(),
        value: e.getValue(),
        confidence: e.getConfidence(),
      })),
    };
  } catch (error) {
    console.error("gRPC error:", error);
    throw error;
  }
}
```

**Example: Calling Web3 Service from Viber Service**

```typescript
import { Web3ServiceClient } from "./generated/web3_grpc_pb";
import {
  CreateWalletRequest,
  CreateWalletResponse,
  GetWalletBalanceRequest,
  GetWalletBalanceResponse,
  SendTransactionRequest,
  SendTransactionResponse,
} from "./generated/web3_pb";
import * as grpc from "@grpc/grpc-js";

// Create gRPC client
const web3Client = new Web3ServiceClient(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

// Create wallet for a Viber user
async function createWallet(viberUserId: string, network: string) {
  const request = new CreateWalletRequest();
  request.setViberUserId(viberUserId);
  request.setNetwork(network);

  try {
    const response: CreateWalletResponse = await new Promise(
      (resolve, reject) => {
        web3Client.createWallet(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      id: response.getId(),
      viberUserId: response.getViberUserId(),
      address: response.getAddress(),
      network: response.getNetwork(),
      createdAt: response.getCreatedAt(),
      updatedAt: response.getUpdatedAt(),
    };
  } catch (error: any) {
    if (error.code === grpc.status.NOT_FOUND) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_001") {
        throw new Error(`Wallet not found: ${errorDetails.walletId}`);
      }
    }
    console.error("gRPC error creating wallet:", error);
    throw error;
  }
}

// Get wallet balance
async function getWalletBalance(walletId: string) {
  const request = new GetWalletBalanceRequest();
  request.setWalletId(walletId);

  try {
    const response: GetWalletBalanceResponse = await new Promise(
      (resolve, reject) => {
        web3Client.getWalletBalance(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      walletId: response.getWalletId(),
      address: response.getAddress(),
      network: response.getNetwork(),
      balance: response.getBalance(),
      balanceFormatted: response.getBalanceFormatted(),
      lastUpdated: response.getLastUpdated(),
    };
  } catch (error: any) {
    if (error.code === grpc.status.NOT_FOUND) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_001") {
        throw new Error(`Wallet not found: ${walletId}`);
      }
    }
    console.error("gRPC error getting balance:", error);
    throw error;
  }
}

// Send transaction
async function sendTransaction(
  walletId: string,
  to: string,
  value: string,
  network: string
) {
  const request = new SendTransactionRequest();
  request.setWalletId(walletId);
  request.setTo(to);
  request.setValue(value);
  request.setNetwork(network);

  try {
    const response: SendTransactionResponse = await new Promise(
      (resolve, reject) => {
        web3Client.sendTransaction(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      id: response.getId(),
      txHash: response.getTxHash(),
      walletId: response.getWalletId(),
      from: response.getFrom(),
      to: response.getTo(),
      value: response.getValue(),
      network: response.getNetwork(),
      status: response.getStatus(),
      confirmations: response.getConfirmations(),
      createdAt: response.getCreatedAt(),
    };
  } catch (error: any) {
    if (error.code === grpc.status.FAILED_PRECONDITION) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_004") {
        throw new Error("Insufficient balance for transaction");
      } else if (errorDetails.errorCode === "WEB3_003") {
        throw new Error("Transaction failed: " + errorDetails.message);
      }
    } else if (error.code === grpc.status.INVALID_ARGUMENT) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_002") {
        throw new Error("Invalid blockchain address: " + errorDetails.address);
      }
    }
    console.error("gRPC error sending transaction:", error);
    throw error;
  }
}
```

**Example: Calling Web3 Service from AI Service**

```typescript
import { Web3ServiceClient } from "./generated/web3_grpc_pb";
import {
  GetTokenBalanceRequest,
  GetTokenBalanceResponse,
  ReadContractRequest,
  ReadContractResponse,
} from "./generated/web3_pb";
import * as grpc from "@grpc/grpc-js";

// Create gRPC client
const web3Client = new Web3ServiceClient(
  "localhost:50052",
  grpc.credentials.createInsecure()
);

// Get token balance (for AI to check user's token holdings)
async function getTokenBalance(
  walletId: string,
  tokenAddress: string,
  network: string
) {
  const request = new GetTokenBalanceRequest();
  request.setWalletId(walletId);
  request.setTokenAddress(tokenAddress);
  request.setNetwork(network);

  try {
    const response: GetTokenBalanceResponse = await new Promise(
      (resolve, reject) => {
        web3Client.getTokenBalance(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      walletId: response.getWalletId(),
      walletAddress: response.getWalletAddress(),
      tokenAddress: response.getTokenAddress(),
      tokenSymbol: response.getTokenSymbol(),
      tokenName: response.getTokenName(),
      tokenDecimals: response.getTokenDecimals(),
      balance: response.getBalance(),
      balanceFormatted: response.getBalanceFormatted(),
      network: response.getNetwork(),
      lastUpdated: response.getLastUpdated(),
    };
  } catch (error: any) {
    if (error.code === grpc.status.NOT_FOUND) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_001") {
        throw new Error(`Wallet not found: ${walletId}`);
      }
    } else if (error.code === grpc.status.UNAVAILABLE) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_007") {
        throw new Error(
          `RPC provider unavailable for network: ${network}. Please try again later.`
        );
      }
    }
    console.error("gRPC error getting token balance:", error);
    throw error;
  }
}

// Read from smart contract (for AI to query contract state)
async function readContract(
  contractAddress: string,
  abi: string,
  functionName: string,
  args: string[],
  network: string
) {
  const request = new ReadContractRequest();
  request.setContractAddress(contractAddress);
  request.setAbi(abi);
  request.setFunctionName(functionName);
  request.setArgsList(args);
  request.setNetwork(network);

  try {
    const response: ReadContractResponse = await new Promise(
      (resolve, reject) => {
        web3Client.readContract(request, (error, response) => {
          if (error) reject(error);
          else resolve(response);
        });
      }
    );

    return {
      contractAddress: response.getContractAddress(),
      functionName: response.getFunctionName(),
      result: JSON.parse(response.getResult()),
      network: response.getNetwork(),
    };
  } catch (error: any) {
    if (error.code === grpc.status.INVALID_ARGUMENT) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_002") {
        throw new Error("Invalid contract address: " + contractAddress);
      } else if (errorDetails.errorCode === "WEB3_005") {
        throw new Error("Invalid network: " + network);
      }
    } else if (error.code === grpc.status.FAILED_PRECONDITION) {
      const errorDetails = JSON.parse(error.details[0].value);
      if (errorDetails.errorCode === "WEB3_006") {
        throw new Error(
          "Contract interaction failed: " + errorDetails.message
        );
      }
    }
    console.error("gRPC error reading contract:", error);
    throw error;
  }
}
```

#### Web3 Service {#web3-service-1}

**Service Name**: `web3.Web3Service`

**Methods**:

##### CreateWallet

Create a new wallet or import an existing wallet.

**Request** (`CreateWalletRequest`):

```protobuf
message CreateWalletRequest {
  string viberUserId = 1; // Viber user ID associated with the wallet
  string network = 2; // "ethereum", "polygon", "bsc", "arbitrum"
  string privateKey = 3; // Optional: Import existing wallet (if empty, new wallet is created)
}
```

**Response** (`CreateWalletResponse`):

```protobuf
message CreateWalletResponse {
  string id = 1; // Wallet ID
  string viberUserId = 2;
  string address = 3; // Blockchain address
  string network = 4; // "ethereum", "polygon", "bsc", "arbitrum"
  string createdAt = 5; // ISO 8601 date string
  string updatedAt = 6; // ISO 8601 date string
}
```

**TypeScript Interface**:

```typescript
interface CreateWalletRequest {
  viberUserId: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  privateKey?: string;
}

interface CreateWalletResponse {
  id: string;
  viberUserId: string;
  address: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  createdAt: string;
  updatedAt: string;
}
```

##### GetWallet

Get wallet by ID.

**Request** (`GetWalletRequest`):

```protobuf
message GetWalletRequest {
  string walletId = 1;
}
```

**Response** (`GetWalletResponse`):

```protobuf
message GetWalletResponse {
  string id = 1;
  string viberUserId = 2;
  string address = 3;
  string network = 4;
  string createdAt = 5;
  string updatedAt = 6;
}
```

##### ListWallets

List wallets with pagination.

**Request** (`ListWalletsRequest`):

```protobuf
message ListWalletsRequest {
  string viberUserId = 1; // Optional: Filter by Viber user ID
  string network = 2; // Optional: Filter by network
  int32 page = 3; // Default: 1
  int32 limit = 4; // Default: 20
}
```

**Response** (`ListWalletsResponse`):

```protobuf
message ListWalletsResponse {
  repeated Wallet wallets = 1;
  PaginationMeta meta = 2;
}

message Wallet {
  string id = 1;
  string viberUserId = 2;
  string address = 3;
  string network = 4;
  string createdAt = 5;
  string updatedAt = 6;
}

message PaginationMeta {
  int32 page = 1;
  int32 limit = 2;
  int32 total = 3;
  int32 totalPages = 4;
  bool hasNext = 5;
  bool hasPrev = 6;
}
```

##### GetWalletBalance

Get wallet balance (native token balance).

**Request** (`GetWalletBalanceRequest`):

```protobuf
message GetWalletBalanceRequest {
  string walletId = 1;
}
```

**Response** (`GetWalletBalanceResponse`):

```protobuf
message GetWalletBalanceResponse {
  string walletId = 1;
  string address = 2;
  string network = 3;
  string balance = 4; // Balance in wei/smallest unit (as string)
  string balanceFormatted = 5; // Human-readable balance (e.g., "1.5 ETH")
  string lastUpdated = 6; // ISO 8601 date string
}
```

##### SendTransaction

Send a transaction (native token transfer).

**Request** (`SendTransactionRequest`):

```protobuf
message SendTransactionRequest {
  string walletId = 1; // Wallet ID to send from
  string to = 2; // Recipient blockchain address
  string value = 3; // Amount in wei/smallest unit (as string)
  string network = 4; // "ethereum", "polygon", "bsc", "arbitrum"
  int64 gasLimit = 5; // Optional: Gas limit
  string gasPrice = 6; // Optional: Gas price in wei (as string)
}
```

**Response** (`SendTransactionResponse`):

```protobuf
message SendTransactionResponse {
  string id = 1; // Transaction ID (database ID)
  string txHash = 2; // Blockchain transaction hash
  string walletId = 3;
  string from = 4; // Sender address
  string to = 5; // Recipient address
  string value = 6; // Amount in wei
  string network = 7;
  string status = 8; // "pending", "confirmed", "failed"
  int32 confirmations = 9; // Number of confirmations
  string createdAt = 10; // ISO 8601 date string
}
```

##### GetTransaction

Get transaction by hash.

**Request** (`GetTransactionRequest`):

```protobuf
message GetTransactionRequest {
  string txHash = 1;
}
```

**Response** (`GetTransactionResponse`):

```protobuf
message GetTransactionResponse {
  string id = 1;
  string txHash = 2;
  string walletId = 3;
  string from = 4;
  string to = 5;
  string value = 6; // Amount in wei
  string network = 7;
  string status = 8; // "pending", "confirmed", "failed"
  int32 confirmations = 9;
  int64 blockNumber = 10; // Block number when confirmed (optional)
  string blockHash = 11; // Block hash when confirmed (optional)
  int64 gasUsed = 12; // Gas used (optional)
  string gasPrice = 13; // Gas price in wei (optional)
  string createdAt = 14;
  string updatedAt = 15;
}
```

##### ListTransactions

List transactions with pagination.

**Request** (`ListTransactionsRequest`):

```protobuf
message ListTransactionsRequest {
  string walletId = 1; // Optional: Filter by wallet ID
  string network = 2; // Optional: Filter by network
  string status = 3; // Optional: Filter by status ("pending", "confirmed", "failed")
  int32 page = 4; // Default: 1
  int32 limit = 5; // Default: 20
}
```

**Response** (`ListTransactionsResponse`):

```protobuf
message ListTransactionsResponse {
  repeated Transaction transactions = 1;
  PaginationMeta meta = 2;
}

message Transaction {
  string id = 1;
  string txHash = 2;
  string walletId = 3;
  string from = 4;
  string to = 5;
  string value = 6;
  string network = 7;
  string status = 8;
  int32 confirmations = 9;
  string createdAt = 10;
}
```

##### TrackTransaction

Track transaction status (poll for updates).

**Request** (`TrackTransactionRequest`):

```protobuf
message TrackTransactionRequest {
  string txHash = 1;
}
```

**Response** (`TrackTransactionResponse`):

```protobuf
message TrackTransactionResponse {
  string txHash = 1;
  string status = 2; // "pending", "confirmed", "failed"
  int32 confirmations = 3;
  int64 blockNumber = 4; // Optional
  string blockHash = 5; // Optional
  string lastChecked = 6; // ISO 8601 date string
}
```

##### GetTokenBalance

Get ERC-20 token balance for a wallet.

**Request** (`GetTokenBalanceRequest`):

```protobuf
message GetTokenBalanceRequest {
  string walletId = 1; // Wallet ID to check balance for
  string tokenAddress = 2; // Token contract address
  string network = 3; // "ethereum", "polygon", "bsc", "arbitrum"
}
```

**Response** (`GetTokenBalanceResponse`):

```protobuf
message GetTokenBalanceResponse {
  string walletId = 1;
  string walletAddress = 2;
  string tokenAddress = 3;
  string tokenSymbol = 4; // e.g., "USDT", "USDC"
  string tokenName = 5; // e.g., "Tether USD"
  int32 tokenDecimals = 6; // Token decimals (e.g., 18)
  string balance = 7; // Balance in smallest unit (as string)
  string balanceFormatted = 8; // Human-readable balance (e.g., "100.5 USDT")
  string network = 9;
  string lastUpdated = 10; // ISO 8601 date string
}
```

##### TransferToken

Transfer ERC-20 tokens.

**Request** (`TransferTokenRequest`):

```protobuf
message TransferTokenRequest {
  string walletId = 1; // Wallet ID to send from
  string tokenAddress = 2; // ERC-20 token contract address
  string to = 3; // Recipient blockchain address
  string amount = 4; // Amount in smallest token unit (as string)
  string network = 5; // "ethereum", "polygon", "bsc", "arbitrum"
  int64 gasLimit = 6; // Optional: Gas limit
  string gasPrice = 7; // Optional: Gas price in wei (as string)
}
```

**Response** (`TransferTokenResponse`):

```protobuf
message TransferTokenResponse {
  string id = 1; // Transaction ID
  string txHash = 2; // Blockchain transaction hash
  string walletId = 3;
  string tokenAddress = 4;
  string from = 5;
  string to = 6;
  string amount = 7; // Amount in smallest token unit
  string network = 8;
  string status = 9; // "pending", "confirmed", "failed"
  int32 confirmations = 10;
  string createdAt = 11;
}
```

##### GetTokenInfo

Get token information (metadata).

**Request** (`GetTokenInfoRequest`):

```protobuf
message GetTokenInfoRequest {
  string tokenAddress = 1; // Token contract address
  string network = 2; // "ethereum", "polygon", "bsc", "arbitrum"
}
```

**Response** (`GetTokenInfoResponse`):

```protobuf
message GetTokenInfoResponse {
  string address = 1; // Token contract address
  string symbol = 2; // Token symbol (e.g., "USDT")
  string name = 3; // Token name (e.g., "Tether USD")
  int32 decimals = 4; // Token decimals (e.g., 18)
  string totalSupply = 5; // Total supply (if available, as string)
  string network = 6;
}
```

##### GetNFTs

Get NFTs owned by a wallet address.

**Request** (`GetNFTsRequest`):

```protobuf
message GetNFTsRequest {
  string walletAddress = 1; // Wallet address to check NFTs for
  string network = 2; // "ethereum", "polygon", "bsc", "arbitrum"
  string contractAddress = 3; // Optional: Filter by NFT contract address
  int32 page = 4; // Default: 1
  int32 limit = 5; // Default: 20
}
```

**Response** (`GetNFTsResponse`):

```protobuf
message GetNFTsResponse {
  repeated NFT nfts = 1;
  PaginationMeta meta = 2;
}

message NFT {
  string contractAddress = 1; // NFT contract address
  string tokenId = 2; // NFT token ID
  string owner = 3; // Owner address
  string tokenURI = 4; // Token metadata URI (optional)
  string metadata = 5; // Parsed metadata as JSON string (if available)
  string network = 6;
}
```

##### TransferNFT

Transfer an NFT from one address to another.

**Request** (`TransferNFTRequest`):

```protobuf
message TransferNFTRequest {
  string walletId = 1; // Wallet ID to send from
  string contractAddress = 2; // NFT contract address
  string to = 3; // Recipient blockchain address
  string tokenId = 4; // NFT token ID to transfer
  string network = 5; // "ethereum", "polygon", "bsc", "arbitrum"
  int64 gasLimit = 6; // Optional: Gas limit
  string gasPrice = 7; // Optional: Gas price in wei (as string)
}
```

**Response** (`TransferNFTResponse`):

```protobuf
message TransferNFTResponse {
  string id = 1; // Transaction ID
  string txHash = 2; // Blockchain transaction hash
  string walletId = 3;
  string contractAddress = 4;
  string from = 5; // Sender address
  string to = 6; // Recipient address
  string tokenId = 7; // NFT token ID
  string network = 8;
  string status = 9; // "pending", "confirmed", "failed"
  int32 confirmations = 10;
  string createdAt = 11;
}
```

**TypeScript Interface**:

```typescript
interface TransferNFTRequest {
  walletId: string;
  contractAddress: string;
  to: string;
  tokenId: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  gasLimit?: number;
  gasPrice?: string;
}

interface TransferNFTResponse {
  id: string;
  txHash: string;
  walletId: string;
  contractAddress: string;
  from: string;
  to: string;
  tokenId: string;
  network: "ethereum" | "polygon" | "bsc" | "arbitrum";
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  createdAt: string;
}
```

##### ReadContract

Read from a smart contract (call view/pure functions).

**Request** (`ReadContractRequest`):

```protobuf
message ReadContractRequest {
  string contractAddress = 1; // Contract address
  string abi = 2; // Contract ABI as JSON string (or use stored ABI via contractId)
  string functionName = 3; // Function name to call
  repeated string args = 4; // Function arguments (as JSON strings)
  string network = 5; // "ethereum", "polygon", "bsc", "arbitrum"
  string contractId = 6; // Optional: Use stored contract ABI by ID
}
```

**Response** (`ReadContractResponse`):

```protobuf
message ReadContractResponse {
  string contractAddress = 1;
  string functionName = 2;
  string result = 3; // Function return value as JSON string
  string network = 4;
}
```

##### WriteContract

Write to a smart contract (call state-changing functions).

**Request** (`WriteContractRequest`):

```protobuf
message WriteContractRequest {
  string walletId = 1; // Wallet ID to send transaction from
  string contractAddress = 2; // Contract address
  string abi = 3; // Contract ABI as JSON string (or use stored ABI via contractId)
  string functionName = 4; // Function name to call
  repeated string args = 5; // Function arguments (as JSON strings)
  string value = 6; // Optional: Native token value to send (in wei, as string)
  string network = 7; // "ethereum", "polygon", "bsc", "arbitrum"
  int64 gasLimit = 8; // Optional: Gas limit
  string gasPrice = 9; // Optional: Gas price in wei (as string)
  string contractId = 10; // Optional: Use stored contract ABI by ID
}
```

**Response** (`WriteContractResponse`):

```protobuf
message WriteContractResponse {
  string id = 1; // Transaction ID
  string txHash = 2; // Blockchain transaction hash
  string walletId = 3;
  string contractAddress = 4;
  string functionName = 5;
  string network = 6;
  string status = 7; // "pending", "confirmed", "failed"
  int32 confirmations = 8;
  string createdAt = 9;
}
```

##### StoreContractABI

Store contract ABI for later use.

**Request** (`StoreContractABIRequest`):

```protobuf
message StoreContractABIRequest {
  string address = 1; // Contract address
  string network = 2; // "ethereum", "polygon", "bsc", "arbitrum"
  string abi = 3; // Contract ABI as JSON string
  string name = 4; // Optional: Contract name for reference
}
```

**Response** (`StoreContractABIResponse`):

```protobuf
message StoreContractABIResponse {
  string id = 1; // Contract ABI ID
  string address = 2;
  string network = 3;
  string name = 4; // Optional
  string abi = 5; // Stored ABI as JSON string
  string createdAt = 6;
  string updatedAt = 7;
}
```

##### GetContractABI

Get stored contract ABI.

**Request** (`GetContractABIRequest`):

```protobuf
message GetContractABIRequest {
  string address = 1; // Contract address
  string network = 2; // "ethereum", "polygon", "bsc", "arbitrum"
}
```

**Response** (`GetContractABIResponse`):

```protobuf
message GetContractABIResponse {
  string id = 1;
  string address = 2;
  string network = 3;
  string name = 4; // Optional
  string abi = 5; // Contract ABI as JSON string
  string createdAt = 6;
  string updatedAt = 7;
}
```

### Communication Flow

**Viber Service ↔ AI Service**:

```
Viber Service → gRPC Call → AI Service
     ↓                              ↓
  Request                    Process Message
     ↓                              ↓
  Response ← gRPC Response ← Return Result
```

**Viber Service ↔ Web3 Service**:

```
Viber Service → gRPC Call → Web3 Service
     ↓                              ↓
  Request                    Blockchain Operation
     ↓                              ↓
  Response ← gRPC Response ← Return Result
```

**AI Service ↔ Web3 Service**:

```
AI Service → gRPC Call → Web3 Service
     ↓                              ↓
  Request                    Blockchain Operation
     ↓                              ↓
  Response ← gRPC Response ← Return Result
```

### gRPC vs REST for Service Communication

**Why gRPC for Viber ↔ AI and Web3 Operations**:

- **Performance**: Binary serialization is faster than JSON
- **Low Latency**: HTTP/2 multiplexing reduces connection overhead
- **Type Safety**: Protocol Buffers provide strong typing
- **Streaming**: Supports bidirectional streaming for real-time processing
- **Efficiency**: Better for high-frequency, low-latency requests
- **Blockchain Operations**: gRPC is ideal for time-sensitive blockchain transactions

**REST API is still used for**:

- Admin Service → AI Service (configuration, training)
- Admin Service → Web3 Service (management operations)
- External integrations
- Webhook endpoints

## API Contracts

### TypeScript Interfaces

#### Common Types

```typescript
// Base entity interface
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// User interface
interface User extends BaseEntity {
  email: string;
  name: string;
  role: "admin" | "user" | "viewer";
  lastLoginAt?: string;
}

// Message interface
interface Message extends BaseEntity {
  userId: string;
  conversationId?: string;
  type: string;
  content: Record<string, any>;
  direction: "incoming" | "outgoing";
  status: "sent" | "delivered" | "seen" | "failed";
  timestamp: string;
}

// Configuration interface
interface Config {
  bot: {
    enabled: boolean;
    welcomeMessage: string;
    defaultLanguage: string;
    autoReply: boolean;
    aiEnabled: boolean;
  };
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  analytics: {
    retentionDays: number;
    aggregationInterval: "hour" | "day" | "week" | "month";
  };
}
```

### Request Validation Rules

#### Email Validation

- Must be a valid email format
- Maximum length: 255 characters
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

#### Password Validation

- Minimum length: 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must contain at least one special character

#### Date Validation

- Must be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2024-01-15T10:30:00.000Z`

#### Pagination Validation

- `page`: Must be a positive integer, minimum: 1
- `limit`: Must be a positive integer, minimum: 1, maximum: 100

#### UUID Validation

- Must be a valid UUID v4 format
- Regex: `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`

### Response Schema Examples

#### Success Response Schema

```json
{
  "data": {
    // Response data object
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Error Response Schema

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error details"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/endpoint"
  }
}
```

#### Paginated Response Schema

```json
{
  "data": [
    // Array of items
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Code Reference

#### Authentication Errors

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Account locked
- `AUTH_003` - Account disabled
- `AUTH_004` - Token expired
- `AUTH_005` - Token invalid
- `AUTH_006` - Insufficient permissions

#### User Errors

- `USER_001` - Email already exists
- `USER_002` - Invalid email format
- `USER_003` - Password too weak
- `USER_004` - User not found
- `USER_005` - User already exists

#### Message Errors

- `MSG_001` - Invalid user ID
- `MSG_002` - Message format invalid
- `MSG_003` - Viber API error
- `MSG_004` - Message not found
- `MSG_005` - Message sending failed

#### AI Errors

- `AI_001` - AI service unavailable
- `AI_002` - Invalid message format
- `AI_003` - Model not found
- `AI_004` - Rate limit exceeded
- `AI_005` - Processing timeout
- `AI_006` - Training failed

#### Analytics Errors

- `ANALYTICS_001` - Invalid date range
- `ANALYTICS_002` - Metric not found
- `ANALYTICS_003` - Report generation failed
- `ANALYTICS_004` - Export failed
- `ANALYTICS_005` - Invalid query parameters

#### Bot Settings Errors

- `BOT_SETTINGS_001` - Bot settings not found or internal server error
- `BOT_SETTINGS_002` - Validation error (invalid field format or missing required field)
- `BOT_SETTINGS_003` - Referenced Step not found (invalid welcomeStepId)
- `BOT_SETTINGS_004` - Update failed (internal server error)

#### Web3 Errors

- `WEB3_001` - Wallet not found
- `WEB3_002` - Invalid blockchain address
- `WEB3_003` - Transaction failed
- `WEB3_004` - Insufficient balance
- `WEB3_005` - Invalid network
- `WEB3_006` - Contract interaction failed
- `WEB3_007` - RPC provider unavailable

#### General Errors

- `GEN_001` - Validation error
- `GEN_002` - Internal server error
- `GEN_003` - Service unavailable
- `GEN_004` - Rate limit exceeded
- `GEN_005` - Request timeout

### API Versioning

Currently, the API does not use versioning in the URL path. Future versions may implement versioning:

- URL-based: `/api/v1/...`, `/api/v2/...`
- Header-based: `Accept: application/vnd.api+json;version=1`
- Query parameter: `?version=1`

### Rate Limiting Details

#### Rate Limit Tiers

1. **Anonymous/Public**: 100 requests/minute
2. **Authenticated Users**: 1000 requests/minute
3. **Service-to-Service**: 5000 requests/minute
4. **Admin Users**: 10000 requests/minute

#### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

#### Rate Limit Exceeded Response

When rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "GEN_004",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "resetAt": "2024-01-15T10:31:00.000Z"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/endpoint"
  }
}
```

### Content Types

- **Request Content-Type**: `application/json`
- **Response Content-Type**: `application/json`
- **File Uploads**: `multipart/form-data`
- **File Downloads**: Varies by file type (e.g., `application/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

### CORS Configuration

CORS is configured for cross-origin requests:

- **Allowed Origins**: Configured via environment variables
- **Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`
- **Allowed Headers**: `Content-Type`, `Authorization`, `X-Service-Token`, `X-Service-Name`
- **Credentials**: Supported for authenticated requests

---

## Additional Resources

- [Architecture Documentation](./architecture.md) - System architecture details
- [Setup Guide](./setup.md) - Development setup instructions
- [Deployment Guide](./deployment.md) - Deployment procedures

For questions or issues, please refer to the project documentation or contact the development team.
