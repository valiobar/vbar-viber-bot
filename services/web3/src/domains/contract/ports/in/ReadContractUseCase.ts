/**
 * Read Contract Use Case Port
 *
 * Input port interface for ReadContractUseCase.
 * Defines the contract for reading smart contract operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  ReadContractRequest,
  ReadContractResponse,
} from "../../application/dto/ContractDTO";

/**
 * Read Contract Use Case Interface
 *
 * Defines the contract for reading smart contract operations.
 * Use case implementations will implement this interface.
 */
export interface ReadContractUseCase {
  /**
   * Execute read contract
   *
   * @param request - Read contract request
   * @returns Promise resolving to read contract response
   * @throws Error if contract read fails
   */
  execute(request: ReadContractRequest): Promise<ReadContractResponse>;
}

