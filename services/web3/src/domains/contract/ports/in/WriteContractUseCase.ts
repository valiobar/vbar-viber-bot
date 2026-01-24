/**
 * Write Contract Use Case Port
 *
 * Input port interface for WriteContractUseCase.
 * Defines the contract for writing to smart contract operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  WriteContractRequest,
  WriteContractResponse,
} from "../../application/dto/ContractDTO";

/**
 * Write Contract Use Case Interface
 *
 * Defines the contract for writing to smart contract operations.
 * Use case implementations will implement this interface.
 */
export interface WriteContractUseCase {
  /**
   * Execute write contract
   *
   * @param request - Write contract request
   * @returns Promise resolving to write contract response
   * @throws Error if contract write fails
   */
  execute(request: WriteContractRequest): Promise<WriteContractResponse>;
}

