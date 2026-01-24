/**
 * List Wallets Use Case
 *
 * Use case for listing wallets with filters and pagination.
 * Orchestrates wallet querying from repository.
 */

import type { BlockchainNetwork, Logger, PaginationParams } from "@vbar/shared";
import {
  WalletRepository,
  WalletFilters,
} from "../../ports/out/WalletRepository";
import type {
  ListWalletsRequest,
  ListWalletsResponse,
} from "../dto/WalletDTO";

/**
 * List Wallets Use Case Implementation
 *
 * Handles wallet listing operations with filters and pagination following Hexagonal Architecture principles.
 */
export class ListWalletsUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly logger: Logger;

  constructor(walletRepository: WalletRepository, logger: Logger) {
    this.walletRepository = walletRepository;
    this.logger = logger;
  }

  /**
   * Execute list wallets
   *
   * @param request - List wallets request
   * @returns Promise resolving to list wallets response
   * @throws Error if wallet listing fails
   */
  async execute(request: ListWalletsRequest): Promise<ListWalletsResponse> {
    try {
      // 1. Validate and normalize request
      const filters = this.buildFilters(request);
      const pagination = this.buildPagination(request);

      // 2. Query wallets with filters and pagination
      const result = await this.walletRepository.list(filters, pagination);

      this.logger.info("Listed wallets", {
        filters: filters,
        pagination: pagination,
        count: result.wallets.length,
        total: result.total,
      });

      // 3. Return list of wallets
      return {
        wallets: result.wallets.map((wallet) => wallet.toJSON()),
        total: result.total,
        page: pagination.page || 1,
        limit: pagination.limit || 50,
      };
    } catch (error) {
      this.logger.error("Failed to list wallets", {
        error: error instanceof Error ? error.message : String(error),
        request: request,
      });
      throw error;
    }
  }

  /**
   * Build wallet filters from request
   *
   * @param request - List wallets request
   * @returns Wallet filters
   */
  private buildFilters(request: ListWalletsRequest): WalletFilters {
    const filters: WalletFilters = {};

    if (request.viberUserId) {
      filters.viberUserId = request.viberUserId;
    }

    if (request.network) {
      filters.network = request.network;
    }

    return filters;
  }

  /**
   * Build pagination parameters from request
   *
   * @param request - List wallets request
   * @returns Pagination parameters
   */
  private buildPagination(request: ListWalletsRequest): PaginationParams {
    const page = request.page && request.page > 0 ? request.page : 1;
    const limit =
      request.limit && request.limit > 0 && request.limit <= 100
        ? request.limit
        : 50;

    return {
      page,
      limit,
    };
  }
}

