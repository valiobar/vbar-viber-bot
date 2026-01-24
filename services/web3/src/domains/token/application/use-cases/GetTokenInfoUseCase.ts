/**
 * Get Token Info Use Case
 *
 * Use case for getting token metadata from the blockchain.
 * Orchestrates token information retrieval.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import type {
  GetTokenInfoRequest,
  GetTokenInfoResponse,
} from "../dto/TokenDTO";
import { validateGetTokenInfoRequest } from "../dto/TokenDTO";

/**
 * Get Token Info Use Case Implementation
 *
 * Handles token information retrieval operations following Hexagonal Architecture principles.
 */
export class GetTokenInfoUseCase {
  private readonly blockchainProvider: BlockchainProviderPort;
  private readonly logger: Logger;

  constructor(
    blockchainProvider: BlockchainProviderPort,
    logger: Logger
  ) {
    this.blockchainProvider = blockchainProvider;
    this.logger = logger;
  }

  /**
   * Execute get token info
   *
   * @param request - Get token info request
   * @returns Promise resolving to get token info response
   * @throws Error if token info retrieval fails
   */
  async execute(
    request: GetTokenInfoRequest
  ): Promise<GetTokenInfoResponse> {
    try {
      // 1. Validate request
      validateGetTokenInfoRequest(request);

      this.logger.info("Getting token info", {
        tokenAddress: request.tokenAddress,
        network: request.network,
      });

      // 2. Call ERC-20 name(), symbol(), decimals() functions
      const tokenInfo = await this.blockchainProvider.getTokenInfo(
        request.tokenAddress,
        request.network
      );

      // 3. Return token info
      return {
        token: {
          address: request.tokenAddress,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.totalSupply,
        },
        network: request.network,
      };
    } catch (error) {
      this.logger.error("Failed to get token info", {
        error: error instanceof Error ? error.message : String(error),
        tokenAddress: request.tokenAddress,
        network: request.network,
      });
      throw error;
    }
  }
}

