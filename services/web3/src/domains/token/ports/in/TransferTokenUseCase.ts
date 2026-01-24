/**
 * Transfer Token Use Case Port
 *
 * Input port interface for TransferTokenUseCase.
 * Defines the contract for transferring token operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  TransferTokenRequest,
  TransferTokenResponse,
} from "../../application/dto/TokenDTO";

/**
 * Transfer Token Use Case Interface
 *
 * Defines the contract for transferring token operations.
 * Use case implementations will implement this interface.
 */
export interface TransferTokenUseCase {
  /**
   * Execute transfer token
   *
   * @param request - Transfer token request
   * @returns Promise resolving to transfer token response
   * @throws Error if token transfer fails
   */
  execute(request: TransferTokenRequest): Promise<TransferTokenResponse>;
}

