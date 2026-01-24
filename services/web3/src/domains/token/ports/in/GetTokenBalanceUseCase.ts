/**
 * Get Token Balance Use Case Port
 *
 * Input port interface for GetTokenBalanceUseCase.
 * Defines the contract for retrieving token balance operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  GetTokenBalanceRequest,
  GetTokenBalanceResponse,
} from "../../application/dto/TokenDTO";

/**
 * Get Token Balance Use Case Interface
 *
 * Defines the contract for retrieving token balance operations.
 * Use case implementations will implement this interface.
 */
export interface GetTokenBalanceUseCase {
  /**
   * Execute get token balance
   *
   * @param request - Get token balance request
   * @returns Promise resolving to get token balance response
   * @throws Error if token balance retrieval fails
   */
  execute(
    request: GetTokenBalanceRequest
  ): Promise<GetTokenBalanceResponse>;
}

