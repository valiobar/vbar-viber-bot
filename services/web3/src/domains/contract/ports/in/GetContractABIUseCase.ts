/**
 * Get Contract ABI Use Case Port
 *
 * Input port interface for GetContractABIUseCase.
 * Defines the contract for retrieving contract ABI operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  GetContractABIRequest,
  GetContractABIResponse,
} from "../../application/dto/ContractDTO";

/**
 * Get Contract ABI Use Case Interface
 *
 * Defines the contract for retrieving contract ABI operations.
 * Use case implementations will implement this interface.
 */
export interface GetContractABIUseCase {
  /**
   * Execute get contract ABI
   *
   * @param request - Get contract ABI request
   * @returns Promise resolving to get contract ABI response
   * @throws Error if contract ABI retrieval fails
   */
  execute(
    request: GetContractABIRequest
  ): Promise<GetContractABIResponse>;
}

