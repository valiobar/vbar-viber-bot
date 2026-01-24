/**
 * Contract Handler for gRPC
 *
 * Handles gRPC requests for smart contract operations.
 * Maps gRPC requests to use cases and responses.
 */

import * as grpc from "@grpc/grpc-js";
import type { Logger } from "@vbar/shared";
import { ReadContractUseCase } from "../../../../domains/contract/application/use-cases/ReadContractUseCase";
import { WriteContractUseCase } from "../../../../domains/contract/application/use-cases/WriteContractUseCase";
import { StoreContractABIUseCase } from "../../../../domains/contract/application/use-cases/StoreContractABIUseCase";
import { GetContractABIUseCase } from "../../../../domains/contract/application/use-cases/GetContractABIUseCase";
import { BlockchainProviderFactory } from "../../../out/blockchain/BlockchainProviderFactory";
import { RabbitMQEventPublisher } from "../../../out/rabbitmq/EventPublisher";
import { MongoWalletRepository } from "../../../../domains/wallet/adapters/out/repositories/MongoWalletRepository";
import { MongoTransactionRepository } from "../../../../domains/transaction/adapters/out/repositories/MongoTransactionRepository";
import { MongoContractRepository } from "../../../../domains/contract/adapters/out/repositories/MongoContractRepository";

/**
 * Contract Handler
 *
 * Handles all smart contract-related gRPC operations.
 */
export class ContractHandler {
  private readonly logger: Logger;
  private readonly readContractUseCase: ReadContractUseCase;
  private readonly writeContractUseCase: WriteContractUseCase;
  private readonly storeContractABIUseCase: StoreContractABIUseCase;
  private readonly getContractABIUseCase: GetContractABIUseCase;

  constructor(logger: Logger) {
    this.logger = logger;

    // Initialize dependencies
    const walletRepository = new MongoWalletRepository();
    const transactionRepository = new MongoTransactionRepository();
    const contractRepository = new MongoContractRepository();
    const blockchainProvider = BlockchainProviderFactory.createProvider(
      "ethereum",
      logger
    ); // Default provider, will be network-specific in use cases
    const eventPublisher = new RabbitMQEventPublisher(logger);

    // Initialize use cases
    this.readContractUseCase = new ReadContractUseCase(
      blockchainProvider,
      logger,
      contractRepository
    );

    this.writeContractUseCase = new WriteContractUseCase(
      walletRepository,
      transactionRepository,
      blockchainProvider,
      eventPublisher,
      logger,
      contractRepository
    );

    this.storeContractABIUseCase = new StoreContractABIUseCase(
      contractRepository,
      logger
    );

    this.getContractABIUseCase = new GetContractABIUseCase(
      contractRepository,
      logger
    );
  }

  /**
   * Read contract handler
   */
  async readContract(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - ReadContract request", {
        contractAddress: request.contract_address,
        functionName: request.function_name,
        network: request.network,
        contractId: request.contract_id,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        contractAddress: request.contract_address,
        abi: request.abi ? JSON.parse(request.abi) : undefined,
        functionName: request.function_name,
        args: request.args ? request.args.map((arg: string) => JSON.parse(arg)) : undefined,
        network: request.network as any,
        contractId: request.contract_id || undefined,
      };

      // Call use case
      const response = await this.readContractUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        contract_address: response.contractAddress,
        function_name: response.functionName,
        result: JSON.stringify(response.result),
        network: response.network,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "ReadContract");
    }
  }

  /**
   * Write contract handler
   */
  async writeContract(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - WriteContract request", {
        walletId: request.wallet_id,
        contractAddress: request.contract_address,
        functionName: request.function_name,
        network: request.network,
        contractId: request.contract_id,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        walletId: request.wallet_id,
        contractAddress: request.contract_address,
        abi: request.abi ? JSON.parse(request.abi) : undefined,
        functionName: request.function_name,
        args: request.args ? request.args.map((arg: string) => JSON.parse(arg)) : undefined,
        value: request.value || undefined,
        network: request.network as any,
        gasLimit: request.gas_limit?.toString(),
        gasPrice: request.gas_price,
        contractId: request.contract_id || undefined,
      };

      // Call use case
      const response = await this.writeContractUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.transaction.id,
        tx_hash: response.transaction.txHash,
        wallet_id: response.transaction.walletId,
        contract_address: response.transaction.to, // Contract address is the 'to' field
        function_name: request.function_name,
        network: response.transaction.network,
        status: response.transaction.status,
        confirmations: response.transaction.confirmations,
        created_at: response.transaction.createdAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "WriteContract");
    }
  }

  /**
   * Store contract ABI handler
   */
  async storeContractABI(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - StoreContractABI request", {
        address: request.address,
        network: request.network,
        name: request.name,
      });

      // Map gRPC request to use case request
      const useCaseRequest = {
        address: request.address,
        network: request.network as any,
        abi: JSON.parse(request.abi),
        name: request.name || undefined,
      };

      // Call use case
      const response = await this.storeContractABIUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.contract.id,
        address: response.contract.address,
        network: response.contract.network,
        name: response.contract.name || "",
        abi: JSON.stringify(response.contract.abi),
        created_at: response.contract.createdAt,
        updated_at: response.contract.updatedAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "StoreContractABI");
    }
  }

  /**
   * Get contract ABI handler
   */
  async getContractABI(
    call: grpc.ServerUnaryCall<any, any>,
    callback: grpc.sendUnaryData<any>
  ): Promise<void> {
    try {
      const request = call.request;

      this.logger.info("gRPC - GetContractABI request", {
        address: request.address,
        network: request.network,
      });

      // Note: gRPC uses address and network, but use case expects contractId
      // We need to find contract by address and network first
      // This is a design consideration - we may need to update the use case
      // or add a method to find contract by address and network

      // TODO: Find contract by address and network first
      // For now, we'll need to update GetContractABIUseCase to support finding by address
      // Or add a method to ContractRepository to find by address and network

      // Map gRPC request to use case request
      // Note: This is a simplified mapping - in production, we'd need to find contractId from address
      const useCaseRequest = {
        contractId: request.address, // This won't work - we need contractId
        // We need to find contract by address and network first
      };

      // Call use case
      const response = await this.getContractABIUseCase.execute(useCaseRequest);

      // Map use case response to gRPC response
      const grpcResponse = {
        id: response.contract.id,
        address: response.contract.address,
        network: response.contract.network,
        name: response.contract.name || "",
        abi: JSON.stringify(response.contract.abi),
        created_at: response.contract.createdAt,
        updated_at: response.contract.updatedAt,
      };

      callback(null, grpcResponse);
    } catch (error) {
      this.handleError(error, callback, "GetContractABI");
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
        errorMsg.includes("required") ||
        errorMsg.includes("json")
      ) {
        grpcStatusCode = grpc.status.INVALID_ARGUMENT;
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

