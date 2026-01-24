/**
 * Get NFTs Use Case
 *
 * Use case for getting NFTs owned by a wallet.
 * Orchestrates wallet retrieval and NFT query.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { WalletRepository } from "../../../wallet/ports/out/WalletRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import type { GetNFTsRequest, GetNFTsResponse } from "../dto/TokenDTO";
import { validateGetNFTsRequest } from "../dto/TokenDTO";

/**
 * Get NFTs Use Case Implementation
 *
 * Handles NFT retrieval operations following Hexagonal Architecture principles.
 */
export class GetNFTsUseCase {
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
   * Execute get NFTs
   *
   * @param request - Get NFTs request
   * @returns Promise resolving to get NFTs response
   * @throws Error if NFT retrieval fails
   */
  async execute(request: GetNFTsRequest): Promise<GetNFTsResponse> {
    try {
      // 1. Validate request
      validateGetNFTsRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      // Use provided network or wallet's network
      const network = (request.network ||
        wallet.network.getValue()) as BlockchainNetwork;

      this.logger.info("Getting NFTs", {
        walletId: wallet.id,
        walletAddress: wallet.address.getValue(),
        network: network,
      });

      // 3. Query blockchain for NFTs owned by address
      const nfts = await this.blockchainProvider.getNFTs(
        wallet.address.getValue(),
        network
      );

      // 4. Fetch metadata for each NFT (if available)
      // Note: The BlockchainProviderPort.getNFTs() should already return NFTs with metadata
      // If not, we would need to fetch it here, but for now we assume the provider handles it

      // 5. Return list of NFTs
      return {
        nfts: nfts,
        walletAddress: wallet.address.getValue(),
        network: network,
        total: nfts.length,
      };
    } catch (error) {
      this.logger.error("Failed to get NFTs", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        network: request.network,
      });
      throw error;
    }
  }
}

