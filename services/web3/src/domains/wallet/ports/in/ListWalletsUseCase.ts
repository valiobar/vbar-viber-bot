/**
 * List Wallets Use Case Port
 *
 * Input port interface for ListWalletsUseCase.
 * Defines the contract for wallet listing operations.
 */

import type { ListWalletsRequest, ListWalletsResponse } from "../../application/dto/WalletDTO";

/**
 * List Wallets Use Case Interface
 *
 * Defines the contract for wallet listing operations.
 */
export interface ListWalletsUseCase {
  /**
   * Execute list wallets
   *
   * @param request - List wallets request
   * @returns Promise resolving to list wallets response
   * @throws Error if wallet listing fails
   */
  execute(request: ListWalletsRequest): Promise<ListWalletsResponse>;
}

