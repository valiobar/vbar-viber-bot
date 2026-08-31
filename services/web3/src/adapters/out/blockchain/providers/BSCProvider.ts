/**
 * BSC Provider
 *
 * Binance Smart Chain (BSC)-specific blockchain provider configuration.
 * Supports BSC mainnet and testnet.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import type { Logger } from "@vbar/shared";
import { EthersAdapter } from "../EthersAdapter";

/**
 * BSC Provider Configuration
 *
 * Provides BSC network-specific RPC endpoint configuration.
 */
export class BSCProvider {
  /**
   * Chain IDs for BSC networks
   */
  private static readonly CHAIN_IDS: Record<string, number> = {
    mainnet: 56,
    testnet: 97,
  };

  /**
   * Get RPC endpoint for BSC network
   *
   * @param network - Blockchain network (bsc)
   * @param rpcEndpoints - Array of RPC endpoint URLs (with fallback support)
   * @param logger - Logger instance
   * @returns EthersAdapter instance configured for BSC
   */
  static createProvider(
    network: BlockchainNetwork,
    rpcEndpoints: string[],
    logger: Logger
  ): EthersAdapter {
    if (network !== "bsc") {
      throw new Error(`BSCProvider only supports 'bsc' network, got: ${network}`);
    }

    if (!rpcEndpoints || rpcEndpoints.length === 0) {
      throw new Error("At least one RPC endpoint is required for BSC");
    }

    // Use first RPC endpoint (fallback mechanism handled by factory)
    const rpcUrl = rpcEndpoints[0];

    logger.debug("Creating BSC provider", {
      network,
      rpcUrl: rpcUrl.replace(/\/v\d+\/[^/]+$/, "/v*/***"), // Mask API key in logs
      chainId: BSCProvider.CHAIN_IDS.mainnet,
      fallbackEndpoints: rpcEndpoints.length - 1,
    });

    return new EthersAdapter(rpcUrl, logger);
  }

  /**
   * Get chain ID for BSC network
   *
   * @param network - Blockchain network
   * @returns Chain ID
   */
  static getChainId(network: BlockchainNetwork): number {
    if (network !== "bsc") {
      throw new Error(`BSCProvider only supports 'bsc' network`);
    }

    return BSCProvider.CHAIN_IDS.mainnet;
  }

  /**
   * Get supported testnet chain IDs
   *
   * @returns Object mapping testnet names to chain IDs
   */
  static getTestnetChainIds(): Record<string, number> {
    return {
      testnet: BSCProvider.CHAIN_IDS.testnet,
    };
  }
}

