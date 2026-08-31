/**
 * Contract Repository Port
 *
 * Output port interface for contract persistence operations.
 * This defines the contract for contract ABI storage and retrieval.
 */

import type { BlockchainNetwork, PaginationParams } from "@vbar/shared";
import { SmartContract } from "../../entities/SmartContract";

/**
 * Contract filters for querying contracts
 */
export interface ContractFilters {
  network?: BlockchainNetwork;
  address?: string;
  name?: string;
}

/**
 * Contract repository interface
 *
 * Defines the contract for contract persistence operations.
 * Implementations will be provided by output adapters (e.g., MongoDB).
 */
export interface ContractRepository {
  /**
   * Create a new contract
   *
   * @param contract - Smart contract entity to create
   * @returns Promise resolving to created contract
   * @throws Error if contract creation fails
   */
  create(contract: SmartContract): Promise<SmartContract>;

  /**
   * Find contract by ID
   *
   * @param id - Contract ID
   * @returns Promise resolving to contract or null if not found
   */
  findById(id: string): Promise<SmartContract | null>;

  /**
   * Find contract by address and network
   *
   * @param address - Contract address
   * @param network - Blockchain network
   * @returns Promise resolving to contract or null if not found
   */
  findByAddress(
    address: string,
    network: BlockchainNetwork
  ): Promise<SmartContract | null>;

  /**
   * Update contract
   *
   * @param id - Contract ID
   * @param updates - Partial contract updates
   * @returns Promise resolving to updated contract
   * @throws Error if contract not found or update fails
   */
  update(id: string, updates: Partial<SmartContract>): Promise<SmartContract>;

  /**
   * Delete contract
   *
   * @param id - Contract ID
   * @returns Promise that resolves when contract is deleted
   * @throws Error if contract not found or deletion fails
   */
  delete(id: string): Promise<void>;

  /**
   * List contracts with filters and pagination
   *
   * @param filters - Contract filters
   * @param pagination - Pagination parameters
   * @returns Promise resolving to contracts and total count
   */
  list(
    filters: ContractFilters,
    pagination: PaginationParams
  ): Promise<{ contracts: SmartContract[]; total: number }>;
}
