/**
 * Token Handler for gRPC
 *
 * Handles gRPC requests for token operations.
 * Maps gRPC requests to use cases and responses.
 */

import * as grpc from "@grpc/grpc-js";
import type { Logger } from "@vbar/shared";
import { GetTokenBalanceUseCase } from "../../../../domains/token/application/use-cases/GetTokenBalanceUseCase";
import { TransferTokenUseCase } from "../../../../domains/token/application/use-cases/TransferTokenUseCase";
import { GetTokenInfoUseCase } from "../../../../domains/token/application/use-cases/GetTokenInfoUseCase";
import { GetNFTsUseCase } from "../../../../domains/token/application/use-cases/GetNFTsUseCase";
import { TransferNFTUseCase } from "../../../../domains/token/application/use-cases/TransferNFTUseCase";
import { BlockchainProviderFactory } from "../../../out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";

/**
 * Token Handler
 *
 * Handles all token-related gRPC operations.
 */
export class TokenHandler {
  private readonly logger: Logger;
  private readonly getTokenBalanceUseCase: GetTokenBalanceUseCase;
  private readonly transferTokenUseCase: TransferTokenUseCase;
  private readonly getTokenInfoUseCase: GetTokenInfoUseCase;
  private readonly getNFTsUseCase: GetNFTsUseCase;
  private readonly transferNFTUseCase: TransferNFTUseCase;

  constructor(logger: Logger) {
    this.logger = logger;

    // Initialize dependencies
    const walletRepository = new MongoWalletRepository();
    const transactionRepository = new MongoTransactionRepository();
    const blockchainProvider = BlockchainProviderFactory.createProvider(
      "ethereum",
      logger
    ); // Default provider, will be network-specific in use cases
    const eventPublisher = new RabbitMQEventPublisher(logger);

    // Initialize use cases
    this.getTokenBalanceUseCase = new GetTokenBalanceUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );

    this.transferTokenUseCase = new TransferTokenUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );

    this.getTokenInfoUseCase = new GetTokenInfoUseCase(
      blockchainProvider,
      logger
    );

    this.getNFTsUseCase = new GetNFTsUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );

    this.transferNFTUseCase = new TransferNFTUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );
  }

  /**
   * Get token balance handler
   */
  async getTokenBalance(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetTokenBalance request", {
        walletId: request.wallet_id,
        tokenAddress: request.token_address,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
        tokenAddress: request.token_address,
      };

      // Call use case
      const response = await this.getTokenBalanceUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        wallet_id: request.wallet_id,
        wallet_address: response.walletAddress,
        token_address: response.tokenAddress,
        token_symbol: response.symbol,
        token_name: response.name,
        token_decimals: response.decimals,
        balance: response.balance,
        balance_formatted: this.formatTokenBalance(
          response.balance,
          response.decimals,
          response.symbol
        ),
        network: response.network,
        last_updated: new Date().toISOString(),
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetTokenBalance");
    }
  }

  /**
   * Transfer token handler
   */
  async transferToken(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - TransferToken request", {
        walletId: request.wallet_id,
        tokenAddress: request.token_address,
        to: request.to,
        amount: request.amount,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
        tokenAddress: request.token_address,
        to: request.to,
        amount: request.amount,
        gasLimit: request.gas_limit?.toString(),
        gasPrice: request.gas_price,
      };

      // Call use case
      const response = await this.transferTokenUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.transaction.id,
        tx_hash: response.transaction.txHash,
        wallet_id: response.transaction.walletId,
        token_address: response.transaction.tokenAddress,
        from: response.transaction.from,
        to: response.transaction.to,
        amount: response.transaction.value,
        network: response.transaction.network,
        status: response.transaction.status,
        confirmations: response.transaction.confirmations,
        created_at: response.transaction.createdAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "TransferToken");
    }
  }

  /**
   * Get token info handler
   */
  async getTokenInfo(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetTokenInfo request", {
        tokenAddress: request.token_address,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        tokenAddress: request.token_address,
        network: request.network as any,
      };

      // Call use case
      const response = await this.getTokenInfoUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        address: response.token.address,
        symbol: response.token.symbol,
        name: response.token.name,
        decimals: response.token.decimals,
        total_supply: response.token.totalSupply || "",
        network: response.network,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetTokenInfo");
    }
  }

  /**
   * Get NFTs handler
   */
  async getNFTs(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetNFTs request", {
        walletAddress: request.wallet_address,
        network: request.network,
        contractAddress: request.contract_address,
        page: request.page,
        limit: request.limit,
      });

      // Note: gRPC uses wallet_address, but use case expects walletId
      // We need to find wallet by address first, or update the use case
      // For now, we'll need to query wallet by address
      // This is a design consideration - we may need to add a method to find wallet by address

      // TODO: Find wallet by address first
      // For now, assuming we can pass wallet_address and the use case will handle it
      // Or we need to add a method to WalletRepository to find by address

      // Map gRPC request to use case request
      // Note: This is a simplified mapping - in production, we'd need to find walletId from address
      const useCaseRequest = {
        walletId: request.wallet_address, // This won't work - we need walletId
        network: request.network || undefined,
      };

      // Call use case
      const response = await this.getNFTsUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        nfts: response.nfts.map((nft) => ({
          contract_address: nft.contractAddress,
          token_id: nft.tokenId,
          owner: response.walletAddress,
          token_uri: "", // NFT interface doesn't have tokenUri, would need to be fetched separately
          metadata: nft.metadata ? JSON.stringify(nft.metadata) : "",
          network: response.network,
        })),
        meta: {
          page: request.page || 1,
          limit: request.limit || 20,
          total: response.total,
          total_pages: Math.ceil(response.total / (request.limit || 20)),
          has_next: (request.page || 1) * (request.limit || 20) < response.total,
          has_prev: (request.page || 1) > 1,
        },
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetNFTs");
    }
  }

  /**
   * Transfer NFT handler
   */
  async transferNFT(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - TransferNFT request", {
        walletId: request.wallet_id,
        contractAddress: request.contract_address,
        to: request.to,
        tokenId: request.token_id,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
        contractAddress: request.contract_address,
        tokenId: request.token_id,
        to: request.to,
        gasLimit: request.gas_limit?.toString(),
        gasPrice: request.gas_price,
      };

      // Call use case
      const response = await this.transferNFTUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.transaction.id,
        tx_hash: response.transaction.txHash,
        wallet_id: response.transaction.walletId,
        contract_address: response.transaction.tokenAddress,
        from: response.transaction.from,
        to: response.transaction.to,
        token_id: request.token_id, // Not in response, use from request
        network: response.transaction.network,
        status: response.transaction.status,
        confirmations: response.transaction.confirmations,
        created_at: response.transaction.createdAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "TransferNFT");
    }
  }

  /**
   * Format token balance for display
   */
  private formatTokenBalance(
    balance: string,
    decimals: number,
    symbol: string
  ): string {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** decimals);
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
      const trimmedFractional = fractionalStr.replace(/0+$/, "");
      const formatted = trimmedFractional
        ? `${wholePart}.${trimmedFractional}`
        : wholePart.toString();

      return `${formatted} ${symbol}`;
    } catch {
      return `${balance} (${symbol})`;
    }
  }

  /**
   * Handle errors and map to gRPC status codes
   */
  private handleError(
    error: unknown,
    callback: grpc.sendUnaryData<any>,
    operation: string
  ): void {
    let grpcStatusCode: grpc.status;
    let errorMessage: string;

    if (error instanceof Error) {
      const errorMsg = error.message.toLowerCase();

      // Map error types to gRPC status codes
      if (
        errorMsg.includes("not found") ||
        errorMsg.includes("missing") ||
        errorMsg.includes("does not exist")
      ) {
        grpcStatusCode = grpc.status.NOT_FOUND;
        errorMessage = error.message;
      } else if (
        errorMsg.includes("invalid") ||
        errorMsg.includes("validation") ||
        errorMsg.includes("required")
      ) {
        grpcStatusCode = grpc.status.INVALID_ARGUMENT;
        errorMessage = error.message;
      } else if (errorMsg.includes("insufficient balance")) {
        grpcStatusCode = grpc.status.FAILED_PRECONDITION;
        errorMessage = error.message;
      } else if (
        errorMsg.includes("database") ||
        errorMsg.includes("mongodb") ||
        errorMsg.includes("connection")
      ) {
        grpcStatusCode = grpc.status.UNAVAILABLE;
        errorMessage = "Database connection error";
      } else if (
        errorMsg.includes("blockchain") ||
        errorMsg.includes("rpc") ||
        errorMsg.includes("network")
      ) {
        grpcStatusCode = grpc.status.UNAVAILABLE;
        errorMessage = "Blockchain network error";
      } else {
        grpcStatusCode = grpc.status.INTERNAL;
        errorMessage = error.message || "Unknown error occurred";
      }
    } else {
      grpcStatusCode = grpc.status.INTERNAL;
      errorMessage = "Unknown error occurred";
    }

    this.logger.error(`gRPC - ${operation} error`, {
      grpcStatusCode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const grpcError = {
      code: grpcStatusCode,
      message: errorMessage,
    };

    callback(grpcError);
  }
}

