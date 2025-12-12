---
name: Root Project Structure Implementation
overview: Create root-level configuration files for the microservices monorepo including workspace setup, gitignore, dockerignore, and environment variable templates.
todos: []
---

# Root Project Structure Implementation Plan

## Overview

This plan implements Step 2 from the Microservices Project Structure plan. It creates the foundational root-level configuration files needed for a monorepo workspace managing multiple microservices. This includes npm/yarn workspace configuration, comprehensive ignore patterns for Git and Docker, and environment variable templates.

## Current State Analysis

### ✅ Existing Components

- `plans/` directory exists
- `README.md` exists (minimal content)
- Project root directory structure is in place

### ❌ Missing Components

- `.gitignore` - No Git ignore patterns configured
- `package.json` - No root workspace configuration
- `.dockerignore` - No Docker ignore patterns
- `.env.example` - No environment variables template
- Workspace scripts for building, testing, and running services
- npm/yarn workspace configuration

## Implementation Steps

### Step 1: Create `.gitignore` File

**File**: `.gitignore`

**Location**: Root of the project

**Changes**:

- Create comprehensive `.gitignore` file covering:
  - Node.js patterns (node_modules, npm logs, etc.)
  - TypeScript build outputs
  - Environment files (.env, .env.local, etc.)
  - IDE/Editor files (VSCode, IntelliJ, etc.)
  - OS-specific files (macOS, Windows, Linux)
  - Docker-related files
  - Kubernetes secrets
  - Log files
  - Build artifacts
  - Test coverage reports
  - Temporary files

**Content Structure**:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Build outputs
dist/
build/
*.tsbuildinfo
.next/
out/

# Environment variables
.env
.env.local
.env.*.local
.env.production
.env.development

# IDE/Editor
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# OS
.DS_Store
Thumbs.db
desktop.ini

# Docker
docker-compose.override.yml

# Kubernetes
*.secret.yaml
secrets/

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Temporary
tmp/
temp/
*.tmp
```

### Step 2: Create Root `package.json` with Workspace Configuration

**File**: `package.json`

**Location**: Root of the project

**Changes**:

- Create root `package.json` with:
  - Workspace configuration (npm/yarn workspaces)
  - Project metadata (name, version, description)
  - Root-level scripts for:
    - Building all services
    - Testing all services
    - Running services in development mode
    - Installing dependencies
    - Linting
    - Type checking
  - Workspace paths configuration pointing to:
    - `services/*` - All service packages
    - `packages/*` - All shared packages

**Content Structure**:

```json
{
  "name": "vbar-viber-bot",
  "version": "1.0.0",
  "description": "Microservices monorepo for Viber bot with Admin, Viber, AI, and Analytics services",
  "private": true,
  "workspaces": ["services/*", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "type-check": "npm run type-check --workspaces",
    "dev": "npm run dev --workspaces",
    "clean": "npm run clean --workspaces && rm -rf node_modules",
    "install:all": "npm install",
    "admin:dev": "npm run dev --workspace=services/admin",
    "viber:dev": "npm run dev --workspace=services/viber",
    "ai:dev": "npm run dev --workspace=services/ai",
    "analytics:dev": "npm run dev --workspace=services/analytics"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**Code Location**: Create new file at root level

### Step 3: Create `.dockerignore` File

**File**: `.dockerignore`

**Location**: Root of the project

**Changes**:

- Create `.dockerignore` file with patterns to exclude from Docker builds:
  - Node modules (will be installed in container)
  - Git files
  - Documentation
  - Test files
  - IDE/Editor files
  - Environment files
  - Build artifacts
  - Logs
  - Docker-related files
  - Kubernetes manifests

**Content Structure**:

```dockerignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Git
.git/
.gitignore
.gitattributes

# Documentation
README.md
docs/
*.md
plans/

# Environment
.env
.env.*
.env.example

# IDE/Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/
*.test.ts
*.test.js
*.spec.ts
*.spec.js

# Build artifacts (will be built in container)
dist/
build/
.next/
out/
*.tsbuildinfo

# Logs
logs/
*.log

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Kubernetes
k8s/
infrastructure/k8s/

# Temporary
tmp/
temp/
*.tmp
```

### Step 4: Create `.env.example` File

**File**: `.env.example`

**Location**: Root of the project

**Changes**:

- Create `.env.example` template with:
  - Common environment variables for all services
  - MongoDB connection strings (placeholders for each service)
  - Message queue (RabbitMQ) configuration
  - Service ports
  - API keys placeholders
  - Environment type (development/production)
  - Comments explaining each variable
  - Section headers for organization

**Content Structure**:

```env
# ============================================
# Environment Configuration
# ============================================
NODE_ENV=development

# ============================================
# Service Ports
# ============================================
ADMIN_PORT=3000
VIBER_PORT=3001
AI_PORT=3002
ANALYTICS_PORT=3003

# ============================================
# MongoDB Configuration
# ============================================
# Admin Service Database
MONGODB_ADMIN_URI=mongodb://localhost:27017/admin_db

# Viber Service Database
MONGODB_VIBER_URI=mongodb://localhost:27017/viber_db

# AI Service Database
MONGODB_AI_URI=mongodb://localhost:27017/ai_db

# Analytics Service Database
MONGODB_ANALYTICS_URI=mongodb://localhost:27017/analytics_db

# ============================================
# Message Queue (RabbitMQ)
# ============================================
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/

# ============================================
# API Keys & Secrets
# ============================================
# Viber Bot API
VIBER_BOT_TOKEN=your_viber_bot_token_here

# AI Service API Key (if using external AI service)
AI_API_KEY=your_ai_api_key_here

# JWT Secret (for authentication)
JWT_SECRET=your_jwt_secret_here

# ============================================
# External Services
# ============================================
# Add any external service URLs or API keys here
```

**Code Location**: Create new file at root level

## Files to Create

- `.gitignore` - Comprehensive Git ignore patterns
- `package.json` - Root workspace configuration with scripts
- `.dockerignore` - Docker ignore patterns
- `.env.example` - Environment variables template

## Implementation Order

1. **Step 1**: Create `.gitignore` file

   - Foundation for version control
   - Prevents committing unwanted files

2. **Step 2**: Create root `package.json` with workspace configuration

   - Sets up monorepo structure
   - Defines workspace paths
   - Provides scripts for managing all services

3. **Step 3**: Create `.dockerignore` file

   - Optimizes Docker build context
   - Reduces image size

4. **Step 4**: Create `.env.example` file
   - Documents required environment variables
   - Provides template for developers

## Key Decisions

- **Package Manager**: Using npm workspaces (can be switched to yarn/pnpm if needed)
- **Node Version**: Requiring Node.js >= 18.0.0
- **Workspace Structure**: Flat structure with `services/*` and `packages/*` patterns
- **Scripts**: Root-level scripts that delegate to workspace scripts
- **Environment Variables**: Centralized template, but each service can have its own `.env.example`

## Verification Checklist

After implementation, verify:

- [ ] `.gitignore` excludes all necessary patterns
- [ ] `package.json` has correct workspace configuration
- [ ] Workspace paths match actual directory structure
- [ ] Scripts in `package.json` are functional
- [ ] `.dockerignore` excludes unnecessary files
- [ ] `.env.example` documents all required variables
- [ ] All files are created at the root level
- [ ] No syntax errors in JSON files
- [ ] Environment variable names follow conventions

## Notes

- The workspace configuration assumes services will be in `services/` and shared packages in `packages/`
- Scripts use `--workspaces` flag to run commands across all workspaces
- Individual service scripts allow running specific services in development
- Environment variables can be overridden per service with service-specific `.env` files
- The `.env.example` should be committed, but actual `.env` files should be in `.gitignore`
