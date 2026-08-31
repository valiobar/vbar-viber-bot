/**
 * Transaction Repository Port
 *
 * Output port interface for transaction persistence operations.
 * This defines the contract for transaction storage and retrieval.
 */

import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";
import { Transaction, TransactionStatus } from "../../entities/Transaction";

/**
 * Transaction filters for querying transactions
 */
export interface TransactionFilters {
  walletId?: string;
  network?: BlockchainNetwork;
  status?: TransactionStatus;
  from?: string;
  to?: string;
}

/**
 * Transaction repository interface
 *
 * Defines the contract for transaction persistence operations.
 * Implementations will be provided by output adapters (e.g., MongoDB).
 */
export interface TransactionRepository {
  /**
   * Create a new transaction
   *
   * @param transaction - Transaction entity to create
   * @returns Promise resolving to created transaction
   * @throws Error if transaction creation fails
   */
  create(transaction: Transaction): Promise<Transaction>;

  /**
   * Find transaction by ID
   *
   * @param id - Transaction ID
   * @returns Promise resolving to transaction or null if not found
   */
  findById(id: string): Promise<Transaction | null>;

  /**
   * Find transaction by transaction hash
   *
   * @param txHash - Transaction hash
   * @param network - Blockchain network
   * @returns Promise resolving to transaction or null if not found
   */
  findByTxHash(
    txHash: string,
    network: BlockchainNetwork
  ): Promise<Transaction | null>;

  /**
   * Find transactions by wallet ID
   *
   * @param walletId - Wallet ID
   * @param network - Optional network filter
   * @returns Promise resolving to array of transactions
   */
  findByWalletId(
    walletId: string,
    network?: BlockchainNetwork
  ): Promise<Transaction[]>;

  /**
   * Update transaction
   *
   * @param id - Transaction ID
   * @param updates - Partial transaction updates
   * @returns Promise resolving to updated transaction
   * @throws Error if transaction not found or update fails
   */
  update(id: string, updates: Partial<Transaction>): Promise<Transaction>;

  /**
   * Delete transaction
   *
   * @param id - Transaction ID
   * @returns Promise that resolves when transaction is deleted
   * @throws Error if transaction not found or deletion fails
   */
  delete(id: string): Promise<void>;

  /**
   * List transactions with filters and pagination
   *
   * @param filters - Transaction filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to transactions and total count
   */
  list(
    filters: TransactionFilters,
    pagination: PaginationParams
  ): Promise<{ transactions: Transaction[]; total: number }>;
}

