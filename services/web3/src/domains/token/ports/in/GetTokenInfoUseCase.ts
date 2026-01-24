/**
 * Get Token Info Use Case Port
 *
 * Input port interface for GetTokenInfoUseCase.
 * Defines the contract for retrieving token information operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  GetTokenInfoRequest,
  GetTokenInfoResponse,
} from "../../application/dto/TokenDTO";

/**
 * Get Token Info Use Case Interface
 *
 * Defines the contract for retrieving token information operations.
 * Use case implementations will implement this interface.
 */
export interface GetTokenInfoUseCase {
  /**
   * Execute get token info
   *
   * @param request - Get token info request
   * @returns Promise resolving to get token info response
   * @throws Error if token info retrieval fails
   */
  execute(request: GetTokenInfoRequest): Promise<GetTokenInfoResponse>;
}

