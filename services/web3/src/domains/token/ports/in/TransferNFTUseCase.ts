/**
 * Transfer NFT Use Case Port
 *
 * Input port interface for TransferNFTUseCase.
 * Defines the contract for transferring NFT operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  TransferNFTRequest,
  TransferNFTResponse,
} from "../../application/dto/TokenDTO";

/**
 * Transfer NFT Use Case Interface
 *
 * Defines the contract for transferring NFT operations.
 * Use case implementations will implement this interface.
 */
export interface TransferNFTUseCase {
  /**
   * Execute transfer NFT
   *
   * @param request - Transfer NFT request
   * @returns Promise resolving to transfer NFT response
   * @throws Error if NFT transfer fails
   */
  execute(request: TransferNFTRequest): Promise<TransferNFTResponse>;
}

