/**
 * Wallet Handler for gRPC
 *
 * Handles gRPC requests for wallet operations.
 * Maps gRPC requests to use cases and responses.
 */

import * as grpc from "@grpc/grpc-js";
import type { Logger } from "@vbar/shared";
import { ConsoleLogger } from "@vbar/shared";
import { CreateWalletUseCase } from "../../../../domains/wallet/application/use-cases/CreateWalletUseCase";
import { GetBalanceUseCase } from "../../../../domains/wallet/application/use-cases/GetBalanceUseCase";
import { GetWalletInfoUseCase } from "../../../../domains/wallet/application/use-cases/GetWalletInfoUseCase";
import { ListWalletsUseCase } from "../../../../domains/wallet/application/use-cases/ListWalletsUseCase";
import { WalletService } from "../../../../domains/wallet/services/WalletService";
import { BlockchainProviderFactory } from "../../../out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";

/**
 * Wallet Handler
 *
 * Handles all wallet-related gRPC operations.
 */
export class WalletHandler {
  private readonly logger: Logger;
  private readonly createWalletUseCase: CreateWalletUseCase;
  private readonly getBalanceUseCase: GetBalanceUseCase;
  private readonly getWalletInfoUseCase: GetWalletInfoUseCase;
  private readonly listWalletsUseCase: ListWalletsUseCase;

  constructor(logger: Logger) {
    this.logger = logger;

    // Initialize dependencies
    const walletRepository = new MongoWalletRepository();
    const blockchainProvider = BlockchainProviderFactory.createProvider(
      "ethereum",
      logger
    ); // Default provider, will be network-specific in use cases
    const eventPublisher = new RabbitMQEventPublisher(logger);
    const walletService = new WalletService();

    // Initialize use cases
    this.createWalletUseCase = new CreateWalletUseCase(
      walletRepository,
      blockchainProvider,
      eventPublisher,
      walletService,
      logger
    );

    this.getBalanceUseCase = new GetBalanceUseCase(
      walletRepository,
      blockchainProvider,
      logger
    );

    this.getWalletInfoUseCase = new GetWalletInfoUseCase(
      walletRepository,
      logger
    );

    this.listWalletsUseCase = new ListWalletsUseCase(walletRepository, logger);
  }

  /**
   * Create wallet handler
   */
  async createWallet(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - CreateWallet request", {
        viberUserId: request.viber_user_id,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        viberUserId: request.viber_user_id,
        network: request.network as any,
        privateKey: request.private_key || undefined,
      };

      // Call use case
      const response = await this.createWalletUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        wallet: {
          id: response.wallet.id,
          viber_user_id: response.wallet.viberUserId,
          address: response.wallet.address,
          network: response.wallet.network,
          created_at: response.wallet.createdAt,
          updated_at: response.wallet.updatedAt,
        },
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "CreateWallet");
    }
  }

  /**
   * Get balance handler
   */
  async getBalance(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetBalance request", {
        walletId: request.wallet_id,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
      };

      // Call use case
      const response = await this.getBalanceUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        wallet_id: request.wallet_id,
        address: response.address,
        network: response.network,
        balance: response.balance,
        balance_formatted: this.formatBalance(response.balance, response.network),
        last_updated: new Date().toISOString(),
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetBalance");
    }
  }

  /**
   * Get wallet info handler
   */
  async getWalletInfo(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetWalletInfo request", {
        walletId: request.wallet_id,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
      };

      // Call use case
      const response = await this.getWalletInfoUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        wallet: {
          id: response.wallet.id,
          viber_user_id: response.wallet.viberUserId,
          address: response.wallet.address,
          network: response.wallet.network,
          created_at: response.wallet.createdAt,
          updated_at: response.wallet.updatedAt,
        },
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetWalletInfo");
    }
  }

  /**
   * List wallets handler
   */
  async listWallets(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - ListWallets request", {
        viberUserId: request.viber_user_id,
        network: request.network,
        page: request.page,
        limit: request.limit,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        viberUserId: request.viber_user_id || undefined,
        network: request.network || undefined,
        page: request.page || 1,
        limit: request.limit || 20,
      };

      // Call use case
      const response = await this.listWalletsUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        wallets: response.wallets.map((wallet) => ({
          id: wallet.id,
          viber_user_id: wallet.viberUserId,
          address: wallet.address,
          network: wallet.network,
          created_at: wallet.createdAt,
          updated_at: wallet.updatedAt,
        })),
        meta: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          total_pages: Math.ceil(response.total / response.limit),
          has_next: response.page * response.limit < response.total,
          has_prev: response.page > 1,
        },
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "ListWallets");
    }
  }

  /**
   * Format balance for display
   */
  private formatBalance(balance: string, network: string): string {
    try {
      const balanceBigInt = BigInt(balance);
      const divisor = BigInt(10 ** 18); // Assuming 18 decimals for native tokens
      const wholePart = balanceBigInt / divisor;
      const fractionalPart = balanceBigInt % divisor;
      const fractionalStr = fractionalPart.toString().padStart(18, "0");
      const trimmedFractional = fractionalStr.replace(/0+$/, "");
      const formatted = trimmedFractional
        ? `${wholePart}.${trimmedFractional}`
        : wholePart.toString();

      // Get network symbol
      const symbol = this.getNetworkSymbol(network);
      return `${formatted} ${symbol}`;
    } catch {
      return `${balance} wei`;
    }
  }

  /**
   * Get network symbol
   */
  private getNetworkSymbol(network: string): string {
    const symbols: Record<string, string> = {
      ethereum: "ETH",
      polygon: "MATIC",
      bsc: "BNB",
      arbitrum: "ETH",
    };
    return symbols[network] || "ETH";
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
      } else if (
        errorMsg.includes("already exists") ||
        errorMsg.includes("duplicate")
      ) {
        grpcStatusCode = grpc.status.ALREADY_EXISTS;
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

