/**
 * Get Token Balance Use Case
 *
 * Use case for getting token balance from the blockchain.
 * Orchestrates wallet retrieval and token balance query.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { WalletRepository } from "../../../wallet/ports/out/WalletRepository";
import { BlockchainProviderPort } from "../../../../ports/out/BlockchainProviderPort";
import type {
  GetTokenBalanceRequest,
  GetTokenBalanceResponse,
} from "../dto/TokenDTO";
import { validateGetTokenBalanceRequest } from "../dto/TokenDTO";

/**
 * Get Token Balance Use Case Implementation
 *
 * Handles token balance retrieval operations following Hexagonal Architecture principles.
 */
export class GetTokenBalanceUseCase {
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
   * Execute get token balance
   *
   * @param request - Get token balance request
   * @returns Promise resolving to get token balance response
   * @throws Error if balance retrieval fails
   */
  async execute(
    request: GetTokenBalanceRequest
  ): Promise<GetTokenBalanceResponse> {
    try {
      // 1. Validate request
      validateGetTokenBalanceRequest(request);

      // 2. Get wallet from repository
      const wallet = await this.walletRepository.findById(request.walletId);

      if (!wallet) {
        throw new Error(`Wallet not found: ${request.walletId}`);
      }

      this.logger.info("Getting token balance", {
        walletId: wallet.id,
        tokenAddress: request.tokenAddress,
        network: wallet.network.getValue(),
      });

      const network = wallet.network.getValue();

      // 3. Call ERC-20 balanceOf() function on blockchain
      const balanceRaw = await this.blockchainProvider.getTokenBalance(
        request.tokenAddress,
        wallet.address.getValue(),
        network
      );

      // 4. Get token decimals and symbol
      const tokenInfo = await this.blockchainProvider.getTokenInfo(
        request.tokenAddress,
        network
      );

      // 5. Format balance with decimals
      // The balance from getTokenBalance is already in the smallest unit (wei-like)
      // We need to format it using the token decimals
      const balanceFormatted = this.formatBalanceWithDecimals(
        balanceRaw,
        tokenInfo.decimals
      );

      // 6. Return token balance
      return {
        balance: balanceFormatted,
        tokenAddress: request.tokenAddress,
        decimals: tokenInfo.decimals,
        symbol: tokenInfo.symbol,
        name: tokenInfo.name,
        network: network,
        walletAddress: wallet.address.getValue(),
      };
    } catch (error) {
      this.logger.error("Failed to get token balance", {
        error: error instanceof Error ? error.message : String(error),
        walletId: request.walletId,
        tokenAddress: request.tokenAddress,
      });
      throw error;
    }
  }

  /**
   * Format balance with decimals
   *
   * @param balanceRaw - Raw balance in smallest unit (as string)
   * @param decimals - Token decimals
   * @returns Formatted balance as string
   */
  private formatBalanceWithDecimals(
    balanceRaw: string,
    decimals: number
  ): string {
    try {
      const balanceBigInt = BigInt(balanceRaw);
      if (balanceBigInt === 0n) {
        return "0";
      }

      // Convert to string with leading zeros if needed
      const balanceString = balanceBigInt.toString().padStart(decimals + 1, "0");

      // Split into integer and decimal parts
      const integerPart = balanceString.slice(0, -decimals) || "0";
      const decimalPart = balanceString.slice(-decimals);

      // Remove trailing zeros from decimal part
      const trimmedDecimalPart = decimalPart.replace(/0+$/, "");

      // Return formatted amount
      if (trimmedDecimalPart.length === 0) {
        return integerPart;
      }

      return `${integerPart}.${trimmedDecimalPart}`;
    } catch (error) {
      throw new Error(
        `Failed to format balance: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

