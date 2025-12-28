# @vbar/shared

Shared utilities, types, and configurations for Viber bot microservices.

## Overview

This package contains common code shared across all microservices:

- **Types**: Common TypeScript interfaces and types
- **Utilities**: Shared utility functions (logging, validation, date handling, etc.)
- **Configuration**: Configuration helpers and constants

## Installation

This package is part of the monorepo workspace. Install dependencies from the root:

```bash
npm install
```

## Usage

### Importing Types

```typescript
import { Message, User, ApiResponse } from "@vbar/shared";
```

### Using Utilities

```typescript
import { ConsoleLogger, ValidationUtils, DateUtils } from "@vbar/shared";

// Logger
const logger = new ConsoleLogger("my-service");
logger.info("Service started");

// Validation
const emailValid = ValidationUtils.isValidEmail("user@example.com");
const passwordCheck = ValidationUtils.isValidPassword("MyP@ssw0rd");

// Date utilities
const now = DateUtils.now();
```

### Using Configuration

```typescript
import { ConfigHelper, ServiceConfig, ErrorCodes } from "@vbar/shared";

// Environment variables
const port = ConfigHelper.getEnvNumber("PORT", 3000);
const mongoUri = ConfigHelper.getEnv("MONGO_URI");

// Service configuration
const viberPort = ServiceConfig.ports.viber;

// Error codes
const errorMessage = ErrorCodes.MSG_001;
```

## Structure

```
packages/shared/
├── src/
│   ├── types/          # Common TypeScript types
│   ├── utils/          # Shared utility functions
│   ├── config/         # Configuration helpers
│   └── index.ts        # Main export file
├── package.json
├── tsconfig.json
└── README.md
```

## Types

### Common Types

- `BaseEntity` - Base interface with id, createdAt, updatedAt
- `User` - User entity interface
- `Message` - Message entity interface
- `Config` - Configuration interface
- `ApiResponse<T>` - Standardized API response wrapper
- `PaginationParams` - Pagination parameters

### Message Queue Types

- `MessageQueueEvent<T>` - Message queue event structure
- `MessageQueueEventType` - Event type union
- `MessageQueueName` - Queue name union

### API Types

- `SendMessageRequest` - Send message request
- `SendMessageResponse` - Send message response
- `ProcessMessageRequest` - AI process message request
- `ProcessMessageResponse` - AI process message response
- `HealthCheckResponse` - Health check response

## Utilities

### Logger

Simple console logger with service name prefix:

```typescript
const logger = new ConsoleLogger("viber-service");
logger.info("Message received", { userId: "123" });
logger.error("Processing failed", error);
```

### Validation

Email and password validation:

```typescript
ValidationUtils.isValidEmail("user@example.com");
ValidationUtils.isValidPassword("password");
ValidationUtils.validateRequired(obj, ["field1", "field2"]);
```

### Date Utilities

ISO date handling:

```typescript
DateUtils.now();
DateUtils.parseISO("2024-01-01T00:00:00Z");
DateUtils.isWithinRange(date, start, end);
```

### Error Utilities

Standardized error responses:

```typescript
ErrorUtils.createErrorResponse("MSG_001", "Invalid user ID");
```

### String Utilities

String manipulation:

```typescript
StringUtils.randomString(32);
StringUtils.truncate("long string", 10);
StringUtils.slugify("Hello World");
```

## Configuration

### ConfigHelper

Environment variable helpers:

```typescript
ConfigHelper.getEnv("KEY", "default");
ConfigHelper.getEnvNumber("PORT", 3000);
ConfigHelper.getEnvBoolean("ENABLED", false);
ConfigHelper.validateRequired(["KEY1", "KEY2"]);
```

### ServiceConfig

Service configuration constants:

```typescript
ServiceConfig.ports.viber;
ServiceConfig.messageQueue.queues.viberMessages;
ServiceConfig.api.timeout;
```

### ErrorCodes

Standardized error codes:

```typescript
ErrorCodes.MSG_001;
getErrorMessage("MSG_001");
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Clean

```bash
npm run clean
```

## License

ISC



