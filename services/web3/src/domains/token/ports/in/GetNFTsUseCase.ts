/**
 * Get NFTs Use Case Port
 *
 * Input port interface for GetNFTsUseCase.
 * Defines the contract for retrieving NFTs operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  GetNFTsRequest,
  GetNFTsResponse,
} from "../../application/dto/TokenDTO";

/**
 * Get NFTs Use Case Interface
 *
 * Defines the contract for retrieving NFTs operations.
 * Use case implementations will implement this interface.
 */
export interface GetNFTsUseCase {
  /**
   * Execute get NFTs
   *
   * @param request - Get NFTs request
   * @returns Promise resolving to get NFTs response
   * @throws Error if NFTs retrieval fails
   */
  execute(request: GetNFTsRequest): Promise<GetNFTsResponse>;
}

