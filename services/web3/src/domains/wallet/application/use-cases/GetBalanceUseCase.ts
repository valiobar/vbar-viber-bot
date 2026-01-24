/**
 * Get Balance Use Case
 *
 * Use case for getting wallet balance from the blockchain.
 * Orchestrates wallet retrieval and balance query.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { WalletRepository } from "../../ports/out/WalletRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import type {
  GetBalanceRequest,
  GetBalanceResponse,
} from "../dto/WalletDTO";

/**
 * Get Balance Use Case Implementation
 *
 * Handles wallet balance retrieval operations following Hexagonal Architecture principles.
 */
export class GetBalanceUseCase {
  private readonly walletRepository: WalletRepository;
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly logger: Logger;

  constructor(
    walletRepository: WalletRepository,
    blockchainProvider: BlockchainProviderPort,
    logger: Logger
  ) {
    this.walletRepository = walletRepository;
    this.blockchainProvider = blockchainProvider;
    this.logger = logger;
  }

  /**
   * Execute get balance
   *
   * @param request - Get balance request
   * @returns Promise resolving to get balance response
   * @throws Error if balance retrieval fails
   */
  async execute(request: GetBalanceRequest): Promise<GetBalanceResponse> {
    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      // 3. Get balance from blockchain provider
      const balance = await this.blockchainProvider.getBalance(
        wallet.address.getValue(),
        wallet.network.getValue()
      );

      this.logger.info("Retrieved wallet balance", {
        walletId: wallet.id,
        address: wallet.address.getValue(),
        network: wallet.network.getValue(),
        balance: balance,
      });

      // 4. Return balance in wei (as string)
      return {
        balance: balance,
        network: wallet.network.getValue(),
        address: wallet.address.getValue(),
      };
    } catch (error) {
      this.logger.error("Failed to get wallet balance", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
      });
      throw error;
    }
  }

  /**
   * Validate get balance request
   *
   * @param request - Request to validate
   * @throws Error if request is invalid
   */
  private validateRequest(request: GetBalanceRequest): void {
    if (!request.walletId || typeof request.walletId !== "string") {
      throw new Error("walletId is required and must be a string");
    }

    if (request.walletId.trim().length === 0) {
      throw new Error("walletId cannot be empty");
    }
  }
}

