/**
 * Create Wallet Use Case Port
 *
 * Input port interface for CreateWalletUseCase.
 * Defines the contract for wallet creation operations.
 */

import type { CreateWalletRequest, CreateWalletResponse } from "../../application/dto/WalletDTO";

/**
 * Create Wallet Use Case Interface
 *
 * Defines the contract for wallet creation operations.
 */
export interface CreateWalletUseCase {
  /**
   * Execute wallet creation
   *
   * @param request - Create wallet request
   * @returns Promise resolving to create wallet response
   * @throws Error if wallet creation fails
   */
  execute(request: CreateWalletRequest): Promise<CreateWalletResponse>;
}

