/**
 * Ethereum Provider
 *
 * Ethereum-specific blockchain provider configuration.
 * Supports Ethereum mainnet and testnets (Goerli, Sepolia).
 */

import type { BlockchainNetwork } from "@vbar/shared";
import type { Logger } from "@vbar/shared";
import { EthersAdapter } from "../EthersAdapter";

/**
 * Ethereum Provider Configuration
 *
 * Provides Ethereum network-specific RPC endpoint configuration.
 */
export class EthereumProvider {
  /**
   * Chain IDs for Ethereum networks
   */
  private static readonly CHAIN_IDS: Record<string, number> = {
    mainnet: 1,
    goerli: 5,
    sepolia: 11155111,
  };

  /**
   * Get RPC endpoint for Ethereum network
   *
   * @param network - Blockchain network (ethereum)
   * @param rpcEndpoints - Array of RPC endpoint URLs (with fallback support)
   * @param logger - Logger instance
   * @returns EthersAdapter instance configured for Ethereum
   */
  static createProvider(
    network: BlockchainNetwork,
    rpcEndpoints: string[],
    logger: Logger
  ): EthersAdapter {
    if (network !== "ethereum") {
      throw new Error(`EthereumProvider only supports 'ethereum' network, got: ${network}`);
    }

    if (!rpcEndpoints || rpcEndpoints.length === 0) {
      throw new Error("At least one RPC endpoint is required for Ethereum");
    }

    // Use first RPC endpoint (fallback mechanism handled by factory)
    const rpcUrl = rpcEndpoints[0];

    logger.debug("Creating Ethereum provider", {
      network,
      rpcUrl: rpcUrl.replace(/\/v\d+\/[^/]+$/, "/v*/***"), // Mask API key in logs
      chainId: EthereumProvider.CHAIN_IDS.mainnet,
      fallbackEndpoints: rpcEndpoints.length - 1,
    });

    return new EthersAdapter(rpcUrl, logger);
  }

  /**
   * Get chain ID for Ethereum network
   *
   * @param network - Blockchain network
   * @returns Chain ID
   */
  static getChainId(network: BlockchainNetwork): number {
    if (network !== "ethereum") {
      throw new Error(`EthereumProvider only supports 'ethereum' network`);
    }

    return EthereumProvider.CHAIN_IDS.mainnet;
  }

  /**
   * Get supported testnet chain IDs
   *
   * @returns Object mapping testnet names to chain IDs
   */
  static getTestnetChainIds(): Record<string, number> {
    return {
      goerli: EthereumProvider.CHAIN_IDS.goerli,
      sepolia: EthereumProvider.CHAIN_IDS.sepolia,
    };
  }
}

