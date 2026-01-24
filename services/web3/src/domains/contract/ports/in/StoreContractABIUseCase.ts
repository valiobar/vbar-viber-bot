/**
 * Store Contract ABI Use Case Port
 *
 * Input port interface for StoreContractABIUseCase.
 * Defines the contract for storing contract ABI operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  StoreContractABIRequest,
  StoreContractABIResponse,
} from "../../application/dto/ContractDTO";

/**
 * Store Contract ABI Use Case Interface
 *
 * Defines the contract for storing contract ABI operations.
 * Use case implementations will implement this interface.
 */
export interface StoreContractABIUseCase {
  /**
   * Execute store contract ABI
   *
   * @param request - Store contract ABI request
   * @returns Promise resolving to store contract ABI response
   * @throws Error if contract ABI storage fails
   */
  execute(
    request: StoreContractABIRequest
  ): Promise<StoreContractABIResponse>;
}

