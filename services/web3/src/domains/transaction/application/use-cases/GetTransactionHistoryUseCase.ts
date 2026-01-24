/**
 * Get Transaction History Use Case
 *
 * Use case for getting transaction history with filters and pagination.
 * Orchestrates transaction querying from repository.
 */

import type { Logger, PaginationParams } from "@vbar/shared";
import {
  TransactionRepository,
  TransactionFilters,
} from "../../ports/out/TransactionRepository";
import type {
  GetTransactionHistoryRequest,
  GetTransactionHistoryResponse,
} from "../dto/TransactionDTO";
import { validateGetTransactionHistoryRequest } from "../dto/TransactionDTO";

/**
 * Get Transaction History Use Case Implementation
 *
 * Handles transaction history retrieval operations following Hexagonal Architecture principles.
 */
export class GetTransactionHistoryUseCase {
  private readonly transactionRepository: TransactionRepository;
  private readonly logger: Logger;

  constructor(
    transactionRepository: TransactionRepository,
    logger: Logger
  ) {
    this.transactionRepository = transactionRepository;
    this.logger = logger;
  }

  /**
   * Execute get transaction history
   *
   * @param request - Get transaction history request
   * @returns Promise resolving to get transaction history response
   * @throws Error if transaction history retrieval fails
   */
  async execute(
    request: GetTransactionHistoryRequest
  ): Promise<GetTransactionHistoryResponse> {
    try {
      // 1. Validate request
      validateGetTransactionHistoryRequest(request);

      // 2. Build filters
      const filters: TransactionFilters = {};

      if (request.walletId) {
        filters.walletId = request.walletId;
      }

      if (request.network) {
        filters.network = request.network;
      }

      if (request.status) {
        filters.status = request.status;
      }

      // 3. Build pagination
      const page = request.page || 1;
      const limit = request.limit || 20;

      const pagination: PaginationParams = {
        page: page,
        limit: limit,
      };

      this.logger.info("Querying transaction history", {
        filters,
        pagination,
      });

      // 4. Query transactions with filters and pagination
      const result = await this.transactionRepository.list(filters, pagination);

      this.logger.info("Retrieved transaction history", {
        count: result.transactions.length,
        total: result.total,
        page: page,
        limit: limit,
      });

      // 5. Return list of transactions
      return {
        transactions: result.transactions.map((tx) => tx.toJSON()),
        total: result.total,
        page: page,
        limit: limit,
      };
    } catch (error) {
      this.logger.error("Failed to get transaction history", {
        error: error instanceof Error ? error.message : String(error),
        request,
      });
      throw error;
    }
  }
}

