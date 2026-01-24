/**
 * Get Wallet Info Use Case Port
 *
 * Input port interface for GetWalletInfoUseCase.
 * Defines the contract for wallet information retrieval operations.
 */

import type { GetWalletInfoRequest, GetWalletInfoResponse } from "../../application/dto/WalletDTO";

/**
 * Get Wallet Info Use Case Interface
 *
 * Defines the contract for wallet information retrieval operations.
 */
export interface GetWalletInfoUseCase {
  /**
   * Execute get wallet info
   *
   * @param request - Get wallet info request
   * @returns Promise resolving to get wallet info response
   * @throws Error if wallet retrieval fails
   */
  execute(request: GetWalletInfoRequest): Promise<GetWalletInfoResponse>;
}

