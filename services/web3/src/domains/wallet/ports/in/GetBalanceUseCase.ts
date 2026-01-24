/**
 * Get Balance Use Case Port
 *
 * Input port interface for GetBalanceUseCase.
 * Defines the contract for wallet balance retrieval operations.
 */

import type { GetBalanceRequest, GetBalanceResponse } from "../../application/dto/WalletDTO";

/**
 * Get Balance Use Case Interface
 *
 * Defines the contract for wallet balance retrieval operations.
 */
export interface GetBalanceUseCase {
  /**
   * Execute get balance
   *
   * @param request - Get balance request
   * @returns Promise resolving to get balance response
   * @throws Error if balance retrieval fails
   */
  execute(request: GetBalanceRequest): Promise<GetBalanceResponse>;
}

