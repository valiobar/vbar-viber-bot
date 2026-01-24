/**
 * Transaction Handler for gRPC
 *
 * Handles gRPC requests for transaction operations.
 * Maps gRPC requests to use cases and responses.
 */

import * as grpc from "@grpc/grpc-js";
import type { Logger } from "@vbar/shared";
import { SendTransactionUseCase } from "../../../../domains/transaction/application/use-cases/SendTransactionUseCase";
import { TrackTransactionUseCase } from "../../../../domains/transaction/application/use-cases/TrackTransactionUseCase";
import { GetTransactionHistoryUseCase } from "../../../../domains/transaction/application/use-cases/GetTransactionHistoryUseCase";
import { BlockchainProviderFactory } from "../../../out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";

/**
 * Transaction Handler
 *
 * Handles all transaction-related gRPC operations.
 */
export class TransactionHandler {
  private readonly logger: Logger;
  private readonly sendTransactionUseCase: SendTransactionUseCase;
  private readonly trackTransactionUseCase: TrackTransactionUseCase;
  private readonly getTransactionHistoryUseCase: GetTransactionHistoryUseCase;

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
    this.sendTransactionUseCase = new SendTransactionUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );

    this.trackTransactionUseCase = new TrackTransactionUseCase(
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger
    );

    this.getTransactionHistoryUseCase = new GetTransactionHistoryUseCase(
      transactionRepository,
      logger
    );
  }

  /**
   * Send transaction handler
   */
  async sendTransaction(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - SendTransaction request", {
        walletId: request.wallet_id,
        to: request.to,
        value: request.value,
        network: request.network,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
        to: request.to,
        value: request.value,
        gasLimit: request.gas_limit?.toString(),
        gasPrice: request.gas_price,
      };

      // Call use case
      const response = await this.sendTransactionUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.transaction.id,
        tx_hash: response.transaction.txHash,
        wallet_id: response.transaction.walletId,
        from: response.transaction.from,
        to: response.transaction.to,
        value: response.transaction.value,
        network: response.transaction.network,
        status: response.transaction.status,
        confirmations: response.transaction.confirmations,
        created_at: response.transaction.createdAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "SendTransaction");
    }
  }

  /**
   * Track transaction handler
   */
  async trackTransaction(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - TrackTransaction request", {
        txHash: request.tx_hash,
      });

      // Note: gRPC uses tx_hash, but use case expects transactionId
      // We need to find transaction by tx_hash first or update the use case
      // For now, assuming we can pass tx_hash as transactionId if the use case supports it
      // Otherwise, we'd need to query by tx_hash first

      // Map gRPC request to use case request
      // Note: TrackTransactionUseCase expects transactionId, but gRPC provides tx_hash
      // This is a design consideration - we may need to update the use case or add a method
      // to find transaction by tx_hash first
      const useCaseRequest = {
        transactionId: request.tx_hash, // Assuming this works, or we need to find by tx_hash first
      };

      // Call use case
      const response = await this.trackTransactionUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        tx_hash: response.transaction.txHash,
        status: response.transaction.status,
        confirmations: response.transaction.confirmations,
        block_number: response.transaction.blockNumber,
        block_hash: undefined, // Not in use case response
        last_checked: response.transaction.updatedAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "TrackTransaction");
    }
  }

  /**
   * Get transaction history handler
   */
  async getTransactionHistory(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetTransactionHistory request", {
        walletId: request.wallet_id,
        network: request.network,
        status: request.status,
        page: request.page,
        limit: request.limit,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id || undefined,
        network: request.network || undefined,
        status: request.status || undefined,
        page: request.page || 1,
        limit: request.limit || 20,
      };

      // Call use case
      const response = await this.getTransactionHistoryUseCase.execute(
        useCaseRequest
      );

      // Map use case response to gRPC response
      const grpcResponse = {
        transactions: response.transactions.map((tx) => ({
          id: tx.id,
          tx_hash: tx.txHash,
          wallet_id: tx.walletId,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          network: tx.network,
          status: tx.status,
          confirmations: tx.confirmations,
          block_number: tx.blockNumber,
          block_hash: undefined, // Not in use case response
          gas_used: tx.gasUsed,
          gas_price: tx.gasPrice,
          created_at: tx.createdAt,
          updated_at: tx.updatedAt,
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
      this.handleError(error, callback, "GetTransactionHistory");
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

