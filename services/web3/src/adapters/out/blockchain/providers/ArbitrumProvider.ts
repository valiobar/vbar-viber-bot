/**
 * Arbitrum Provider
 *
 * Arbitrum-specific blockchain provider configuration.
 * Supports Arbitrum One mainnet and Goerli testnet.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import type { Logger } from "@vbar/shared";
import { EthersAdapter } from "../EthersAdapter";

/**
 * Arbitrum Provider Configuration
 *
 * Provides Arbitrum network-specific RPC endpoint configuration.
 */
export class ArbitrumProvider {
  /**
   * Chain IDs for Arbitrum networks
   */
  private static readonly CHAIN_IDS: Record<string, number> = {
    mainnet: 42161,
    goerli: 421613,
  };

  /**
   * Get RPC endpoint for Arbitrum network
   *
   * @param network - Blockchain network (arbitrum)
   * @param rpcEndpoints - Array of RPC endpoint URLs (with fallback support)
   * @param logger - Logger instance
   * @returns EthersAdapter instance configured for Arbitrum
   */
  static createProvider(
    network: BlockchainNetwork,
    rpcEndpoints: string[],
    logger: Logger
  ): EthersAdapter {
    if (network !== "arbitrum") {
      throw new Error(`ArbitrumProvider only supports 'arbitrum' network, got: ${network}`);
    }

    if (!rpcEndpoints || rpcEndpoints.length === 0) {
      throw new Error("At least one RPC endpoint is required for Arbitrum");
    }

    // Use first RPC endpoint (fallback mechanism handled by factory)
    const rpcUrl = rpcEndpoints[0];

    logger.debug("Creating Arbitrum provider", {
      network,
      rpcUrl: rpcUrl.replace(/\/v\d+\/[^/]+$/, "/v*/***"), // Mask API key in logs
      chainId: ArbitrumProvider.CHAIN_IDS.mainnet,
      fallbackEndpoints: rpcEndpoints.length - 1,
    });

    return new EthersAdapter(rpcUrl, logger);
  }

  /**
   * Get chain ID for Arbitrum network
   *
   * @param network - Blockchain network
   * @returns Chain ID
   */
  static getChainId(network: BlockchainNetwork): number {
    if (network !== "arbitrum") {
      throw new Error(`ArbitrumProvider only supports 'arbitrum' network`);
    }

    return ArbitrumProvider.CHAIN_IDS.mainnet;
  }

  /**
   * Get supported testnet chain IDs
   *
   * @returns Object mapping testnet names to chain IDs
   */
  static getTestnetChainIds(): Record<string, number> {
    return {
      goerli: ArbitrumProvider.CHAIN_IDS.goerli,
    };
  }
}

