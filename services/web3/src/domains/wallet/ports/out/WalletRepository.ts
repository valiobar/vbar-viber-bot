/**
 * Wallet Repository Port
 *
 * Output port interface for wallet persistence operations.
 * This defines the contract for wallet storage and retrieval.
 */

import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";
import { Wallet } from "../../../entities/Wallet";

/**
 * Wallet filters for querying wallets
 */
export interface WalletFilters {
  viberUserId?: string;
  network?: BlockchainNetwork;
  address?: string;
}

/**
 * Wallet repository interface
 *
 * Defines the contract for wallet persistence operations.
 * Implementations will be provided by output adapters (e.g., MongoDB).
 */
export interface WalletRepository {
  /**
   * Create a new wallet
   *
   * @param wallet - Wallet entity to create
   * @param encryptedPrivateKey - Encrypted private key (optional, for new wallets)
   * @returns Promise resolving to created wallet
   * @throws Error if wallet creation fails
   */
  create(wallet: Wallet, encryptedPrivateKey?: string): Promise<Wallet>;

  /**
   * Find wallet by ID
   *
   * @param id - Wallet ID
   * @returns Promise resolving to wallet or null if not found
   */
  findById(id: string): Promise<Wallet | null>;

  /**
   * Find wallets by Viber user ID
   *
   * @param viberUserId - Viber user ID
   * @param network - Optional network filter
   * @returns Promise resolving to array of wallets
   */
  findByViberUserId(
    viberUserId: string,
    network?: BlockchainNetwork
  ): Promise<Wallet[]>;

  /**
   * Find wallet by address and network
   *
   * @param address - Wallet address
   * @param network - Blockchain network
   * @returns Promise resolving to wallet or null if not found
   */
  findByAddress(
    address: string,
    network: BlockchainNetwork
  ): Promise<Wallet | null>;

  /**
   * Update wallet
   *
   * @param id - Wallet ID
   * @param updates - Partial wallet updates
   * @returns Promise resolving to updated wallet
   * @throws Error if wallet not found or update fails
   */
  update(id: string, updates: Partial<Wallet>): Promise<Wallet>;

  /**
   * Delete wallet
   *
   * @param id - Wallet ID
   * @returns Promise that resolves when wallet is deleted
   * @throws Error if wallet not found or deletion fails
   */
  delete(id: string): Promise<void>;

  /**
   * List wallets with filters and pagination
   *
   * @param filters - Wallet filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to wallets and total count
   */
  list(
    filters: WalletFilters,
    pagination: PaginationParams
  ): Promise<{ wallets: Wallet[]; total: number }>;

  /**
   * Get encrypted private key for a wallet
   *
   * @param walletId - Wallet ID
   * @returns Promise resolving to encrypted private key
   * @throws Error if wallet not found or private key not available
   */
  getEncryptedPrivateKey(walletId: string): Promise<string>;
}

