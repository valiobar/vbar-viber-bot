/**
 * Send Transaction Use Case Port
 *
 * Input port interface for SendTransactionUseCase.
 * Defines the contract for sending transaction operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  SendTransactionRequest,
  SendTransactionResponse,
} from "../../application/dto/TransactionDTO";

/**
 * Send Transaction Use Case Interface
 *
 * Defines the contract for sending transaction operations.
 * Use case implementations will implement this interface.
 */
export interface SendTransactionUseCase {
  /**
   * Execute send transaction
   *
   * @param request - Send transaction request
   * @returns Promise resolving to send transaction response
   * @throws Error if transaction sending fails
   */
  execute(request: SendTransactionRequest): Promise<SendTransactionResponse>;
}

