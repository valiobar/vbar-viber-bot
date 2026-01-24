/**
 * Get Wallet Info Use Case
 *
 * Use case for getting wallet information.
 * Orchestrates wallet retrieval from repository.
 */

import type { Logger } from "@vbar/shared";
import { WalletRepository } from "../../ports/out/WalletRepository";
import type {
  GetWalletInfoRequest,
  GetWalletInfoResponse,
} from "../dto/WalletDTO";

/**
 * Get Wallet Info Use Case Implementation
 *
 * Handles wallet information retrieval operations following Hexagonal Architecture principles.
 */
export class GetWalletInfoUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly logger: Logger;

  constructor(walletRepository: WalletRepository, logger: Logger) {
    this.walletRepository = walletRepository;
    this.logger = logger;
  }

  /**
   * Execute get wallet info
   *
   * @param request - Get wallet info request
   * @returns Promise resolving to get wallet info response
   * @throws Error if wallet retrieval fails
   */
  async execute(
    request: GetWalletInfoRequest
  ): Promise<GetWalletInfoResponse> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Retrieved wallet info", {
        walletId: wallet.id,
        viberUserId: wallet.viberUserId,
        address: wallet.address.getValue(),
        network: wallet.network.getValue(),
      });

      // 3. Return wallet info (without private key)
      return {
        wallet: wallet.toJSON(),
      };
    } catch (error) {
      this.logger.error("Failed to get wallet info", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
      });
      throw error;
    }
  }

  /**
   * Validate get wallet info request
   *
   * @param request - Request to validate
   * @throws Error if request is invalid
   */
  private validateRequest(request: GetWalletInfoRequest): void {
    if (!request.walletId || typeof request.walletId !== "string") {
      throw new Error("walletId is required and must be a string");
    }

    if (request.walletId.trim().length === 0) {
      throw new Error("walletId cannot be empty");
    }
  }
}

