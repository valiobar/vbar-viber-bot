# Web3 Service

Web3 Service for Viber Bot - Node.js Express service with Hexagonal Architecture and blockchain integration.

## Overview

The Web3 Service provides blockchain interaction capabilities for the Viber bot, including:

- **Wallet Management**: Create, import, and manage cryptocurrency wallets
- **Transaction Operations**: Send transactions, track status, and view history
- **Token Operations**: Get token balances, transfer tokens, and retrieve token information
- **NFT Operations**: Get NFTs owned by wallets and transfer NFTs
- **Smart Contract Interactions**: Read from and write to smart contracts, store and retrieve contract ABIs
- Multi-chain support (Ethereum, Polygon, BSC, Arbitrum)
- gRPC API for high-performance communication with Viber Service
- REST API for Admin Service configuration and management

## Architecture

This service follows **Hexagonal Architecture (Ports and Adapters)** pattern:

- **Domains Layer** (`src/domains/`): Core business logic, entities, and domain rules organized by domain (wallet, transaction, token, contract)
- **Application Layer** (`src/application/`): Use cases and application services
- **Ports** (`src/ports/`): Interfaces for input/output operations
- **Adapters** (`src/adapters/`): HTTP controllers, database repositories, blockchain providers

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (web3 database)
- **Message Queue**: RabbitMQ
- **Blockchain Library**: **Ethers.js v6** (unified blockchain interaction)
- **Blockchain Networks**: Ethereum, Polygon, BSC, Arbitrum

## Environment Variables

See `.env.example` for all available environment variables.

### Required Variables

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB_NAME`: Database name (default: `web3`)
- `RABBITMQ_URI` or `RABBITMQ_URL`: RabbitMQ connection string
- `WEB3_ENCRYPTION_KEY`: Encryption key for sensitive data (must be at least 32 characters)

### Optional Variables

- `PORT`: Server port (default: `3004`)
- `GRPC_PORT`: gRPC server port (default: `50052`)

**Service Token Configuration**:
- `SERVICE_TOKEN`: General service token
- `ADMIN_SERVICE_TOKEN`: Admin service specific token
- `VIBER_SERVICE_TOKEN`: Viber service specific token
- `AI_SERVICE_TOKEN`: AI service specific token
- `ANALYTICS_SERVICE_TOKEN`: Analytics service specific token
- `WEB3_SERVICE_TOKEN`: Web3 service specific token

**Feature Flags**:
- `WEB3_FEATURE_WALLET_CREATION`: Enable wallet creation (default: `true`)
- `WEB3_FEATURE_TRANSACTION_SIGNING`: Enable transaction signing (default: `true`)
- `WEB3_FEATURE_CONTRACT_INTERACTION`: Enable contract interaction (default: `true`)
- `WEB3_FEATURE_NFT_OPERATIONS`: Enable NFT operations (default: `true`)

**Rate Limiting**:
- `WEB3_RATE_LIMIT_PER_MINUTE`: Requests per minute (default: `60`)
- `WEB3_RATE_LIMIT_PER_HOUR`: Requests per hour (default: `1000`)

**Blockchain RPC Configuration**:
- `WEB3_RPC_ETHEREUM`: Ethereum RPC URL(s) - comma-separated for fallback (default: `https://eth.llamarpc.com`)
- `WEB3_RPC_POLYGON`: Polygon RPC URL(s) - comma-separated for fallback (default: `https://polygon.llamarpc.com`)
- `WEB3_RPC_BSC`: BSC RPC URL(s) - comma-separated for fallback (default: `https://bsc-dataseed1.binance.org`)
- `WEB3_RPC_ARBITRUM`: Arbitrum RPC URL(s) - comma-separated for fallback (default: `https://arb1.arbitrum.io/rpc`)

## Development

### Prerequisites

- Node.js 20+
- MongoDB instance
- RabbitMQ instance
- Access to blockchain RPC endpoints (or use default public endpoints)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
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

# Clean build artifacts
npm run clean
```

## API Endpoints

### Health Check

- `GET /api/web3/health` - Service health check

### Wallet Operations (REST API)

- `POST /api/web3/wallets` - Create a new wallet or import an existing wallet
- `GET /api/web3/wallets` - List wallets with optional filters (viberUserId, network, page, limit)
- `GET /api/web3/wallets/:id` - Get wallet information by ID
- `GET /api/web3/wallets/:id/balance` - Get wallet balance

### Transaction Operations (REST API)

- `POST /api/web3/transactions` - Send a transaction
- `GET /api/web3/transactions` - Get transaction history with optional filters (walletId, network, status, page, limit)
- `POST /api/web3/transactions/:id/track` - Track transaction status by transaction ID

### Token Operations (REST API)

- `GET /api/web3/tokens/:address/balance` - Get token balance for a wallet (requires walletId query param)
- `POST /api/web3/tokens/transfer` - Transfer tokens
- `GET /api/web3/tokens/:address/info` - Get token information (requires network query param)
- `GET /api/web3/nfts` - Get NFTs owned by a wallet (requires walletId query param)
- `POST /api/web3/nfts/transfer` - Transfer NFT

### Smart Contract Operations (REST API)

- `POST /api/web3/contracts/read` - Read from a smart contract
- `POST /api/web3/contracts/write` - Write to a smart contract
- `POST /api/web3/contracts` - Store contract ABI
- `GET /api/web3/contracts/:id` - Get contract ABI by ID

**Note**: For production use, the Viber Service communicates with Web3 Service via **gRPC** (port 50052) for high-performance blockchain operations. REST endpoints are primarily for Admin Service access and testing.

## gRPC API

The Web3 Service exposes a gRPC API on port `50052` (configurable via `GRPC_PORT`) for high-performance communication with the Viber Service.

### gRPC Methods

**Wallet Operations**:
- `CreateWallet` - Create a new wallet or import an existing wallet
- `GetBalance` - Get wallet balance
- `GetWalletInfo` - Get wallet information
- `ListWallets` - List wallets with optional filters

**Transaction Operations**:
- `SendTransaction` - Send a transaction
- `TrackTransaction` - Track transaction status
- `GetTransactionHistory` - Get transaction history

**Token Operations**:
- `GetTokenBalance` - Get token balance for a wallet
- `TransferToken` - Transfer tokens
- `GetTokenInfo` - Get token information
- `GetNFTs` - Get NFTs owned by a wallet
- `TransferNFT` - Transfer NFT

**Smart Contract Operations**:
- `ReadContract` - Read from a smart contract
- `WriteContract` - Write to a smart contract
- `StoreContractABI` - Store contract ABI
- `GetContractABI` - Get contract ABI

See [API Documentation](../../documentation/api.md#grpc-api) for detailed gRPC API specifications.

## Database Schema

The Web3 Service uses MongoDB with the following collections:

- **Wallets**: Wallet information, addresses, and encrypted private keys
- **Transactions**: Transaction history, status, and metadata
- **Contracts**: Stored contract ABIs and metadata
- **ProcessingLogs**: Web3 operation history and results

## Message Queue

The Web3 Service publishes events to RabbitMQ for asynchronous processing and integration with other services. Events include wallet creation, transaction status updates, and contract interactions.

## Ethers.js Integration

The Web3 Service uses **Ethers.js v6** as the core framework for blockchain interactions, providing:

### Unified Blockchain Provider Interface

- Ethers.js providers for all supported networks (Ethereum, Polygon, BSC, Arbitrum)
- Consistent interface via `JsonRpcProvider`
- Automatic network detection and configuration
- Fallback RPC endpoint support

### Wallet Management

- Secure wallet creation and import
- Private key encryption using AES-256
- Multi-network wallet support
- HD wallet derivation (when needed)

### Transaction Handling

- Transaction signing and broadcasting
- Gas estimation and price management
- Transaction status tracking
- Multi-network transaction support

### Smart Contract Interaction

- ABI-based contract interaction
- Read and write operations
- Contract ABI storage and retrieval
- Multi-network contract support

### Token and NFT Operations

- ERC-20 token operations (balance, transfer, info)
- ERC-721 NFT operations (get NFTs, transfer)
- Standard token interface support

## Blockchain Networks

The Web3 Service supports multiple blockchain networks:

### Ethereum

- **Chain ID**: 1
- **RPC URL**: Configured via `WEB3_RPC_ETHEREUM` (default: `https://eth.llamarpc.com`)
- **Features**: Full Ethereum mainnet support

### Polygon

- **Chain ID**: 137
- **RPC URL**: Configured via `WEB3_RPC_POLYGON` (default: `https://polygon.llamarpc.com`)
- **Features**: Polygon mainnet support with lower gas fees

### Binance Smart Chain (BSC)

- **Chain ID**: 56
- **RPC URL**: Configured via `WEB3_RPC_BSC` (default: `https://bsc-dataseed1.binance.org`)
- **Features**: BSC mainnet support

### Arbitrum

- **Chain ID**: 42161
- **RPC URL**: Configured via `WEB3_RPC_ARBITRUM` (default: `https://arb1.arbitrum.io/rpc`)
- **Features**: Arbitrum One L2 support

**RPC Fallback**: All networks support comma-separated RPC URLs for automatic fallback if the primary endpoint fails.

## Docker

### Build

```bash
docker build -t web3-service .
```

### Run

```bash
docker run -p 3004:3004 --env-file .env web3-service
```

## Project Structure

```
services/web3/
├── src/
│   ├── adapters/
│   │   ├── in/              # Input adapters (HTTP routes, gRPC server)
│   │   │   ├── routes/      # Express routes
│   │   │   │   ├── wallets.ts
│   │   │   │   ├── transactions.ts
│   │   │   │   ├── tokens.ts
│   │   │   │   ├── contracts.ts
│   │   │   │   └── health.ts
│   │   │   ├── grpc/        # gRPC server and handlers
│   │   │   │   ├── server.ts
│   │   │   │   └── handlers/
│   │   │   │       ├── WalletHandler.ts
│   │   │   │       ├── TransactionHandler.ts
│   │   │   │       ├── TokenHandler.ts
│   │   │   │       └── ContractHandler.ts
│   │   │   └── middleware/  # Authentication middleware
│   │   │       └── auth.ts
│   │   └── out/             # Output adapters
│   │       ├── blockchain/ # Blockchain providers
│   │       │   ├── BlockchainProviderFactory.ts
│   │       │   ├── EthersAdapter.ts
│   │       │   └── providers/
│   │       │       ├── EthereumProvider.ts
│   │       │       ├── PolygonProvider.ts
│   │       │       ├── BSCProvider.ts
│   │       │       └── ArbitrumProvider.ts
│   │       └── rabbitmq/    # Message queue publisher
│   │           └── EventPublisher.ts
│   ├── application/         # Application layer (use cases)
│   │   └── use-cases/        # (organized by domain)
│   ├── config/               # Configuration
│   │   ├── database.ts      # MongoDB configuration
│   │   ├── messageQueue.ts  # RabbitMQ configuration
│   │   ├── blockchain.ts    # Blockchain network configuration
│   │   ├── web3Config.ts    # Web3 service configuration
│   │   └── security.ts      # Security configuration
│   ├── domains/             # Domains layer (organized by domain)
│   │   ├── wallet/          # Wallet domain
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── services/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   ├── transaction/     # Transaction domain
│   │   ├── token/           # Token domain
│   │   ├── contract/        # Smart contract domain
│   │   └── shared/          # Shared domain value objects
│   ├── ports/
│   │   └── out/             # Output ports (interfaces)
│   │       ├── BlockchainProviderPort.ts
│   │       └── EventPublisher.ts
│   └── index.ts             # Entry point
├── .env.example
├── Dockerfile
├── package.json
├── README.md
└── tsconfig.json
```

## Usage Examples

### Create Wallet

```typescript
// Create a new wallet for a user
const response = await fetch("http://localhost:3004/api/web3/wallets", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <service-token>",
  },
  body: JSON.stringify({
    viberUserId: "user123",
    network: "ethereum",
  }),
});
```

### Send Transaction

```typescript
// Send a transaction
const response = await fetch("http://localhost:3004/api/web3/transactions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <service-token>",
  },
  body: JSON.stringify({
    walletId: "wallet123",
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "1000000000000000000", // 1 ETH in wei
    network: "ethereum",
  }),
});
```

### Read Smart Contract

```typescript
// Read from a smart contract
const response = await fetch("http://localhost:3004/api/web3/contracts/read", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer <service-token>",
  },
  body: JSON.stringify({
    contractAddress: "0x...",
    functionName: "balanceOf",
    args: ["0x..."],
    network: "ethereum",
    abi: [...], // Contract ABI
  }),
});
```

## Related Documentation

- [Architecture Documentation](../../documentation/architecture.md)
- [API Documentation](../../documentation/api.md)
- [Setup Guide](../../documentation/setup.md)
- [Deployment Guide](../../documentation/deployment.md)

## License

Private - Internal use only

