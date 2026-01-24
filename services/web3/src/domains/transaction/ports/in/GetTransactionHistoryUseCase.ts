/**
 * Get Transaction History Use Case Port
 *
 * Input port interface for GetTransactionHistoryUseCase.
 * Defines the contract for retrieving transaction history operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  GetTransactionHistoryRequest,
  GetTransactionHistoryResponse,
} from "../../application/dto/TransactionDTO";

/**
 * Get Transaction History Use Case Interface
 *
 * Defines the contract for retrieving transaction history operations.
 * Use case implementations will implement this interface.
 */
export interface GetTransactionHistoryUseCase {
  /**
   * Execute get transaction history
   *
   * @param request - Get transaction history request
   * @returns Promise resolving to get transaction history response
   * @throws Error if transaction history retrieval fails
   */
  execute(
    request: GetTransactionHistoryRequest
  ): Promise<GetTransactionHistoryResponse>;
}

