/**
 * Track Transaction Use Case Port
 *
 * Input port interface for TrackTransactionUseCase.
 * Defines the contract for tracking transaction operations.
 * This follows Hexagonal Architecture principles.
 */

import type {
  TrackTransactionRequest,
  TrackTransactionResponse,
} from "../../application/dto/TransactionDTO";

/**
 * Track Transaction Use Case Interface
 *
 * Defines the contract for tracking transaction operations.
 * Use case implementations will implement this interface.
 */
export interface TrackTransactionUseCase {
  /**
   * Execute track transaction
   *
   * @param request - Track transaction request
   * @returns Promise resolving to track transaction response
   * @throws Error if transaction tracking fails
   */
  execute(request: TrackTransactionRequest): Promise<TrackTransactionResponse>;
}

