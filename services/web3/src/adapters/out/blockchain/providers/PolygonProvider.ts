/**
 * Polygon Provider
 *
 * Polygon-specific blockchain provider configuration.
 * Supports Polygon mainnet and Mumbai testnet.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import type { Logger } from "@vbar/shared";
import { EthersAdapter } from "../EthersAdapter";

/**
 * Polygon Provider Configuration
 *
 * Provides Polygon network-specific RPC endpoint configuration.
 */
export class PolygonProvider {
  /**
   * Chain IDs for Polygon networks
   */
  private static readonly CHAIN_IDS: Record<string, number> = {
    mainnet: 137,
    mumbai: 80001,
  };

  /**
   * Get RPC endpoint for Polygon network
   *
   * @param network - Blockchain network (polygon)
   * @param rpcEndpoints - Array of RPC endpoint URLs (with fallback support)
   * @param logger - Logger instance
   * @returns EthersAdapter instance configured for Polygon
   */
  static createProvider(
    network: BlockchainNetwork,
    rpcEndpoints: string[],
    logger: Logger
  ): EthersAdapter {
    if (network !== "polygon") {
      throw new Error(`PolygonProvider only supports 'polygon' network, got: ${network}`);
    }

    if (!rpcEndpoints || rpcEndpoints.length === 0) {
      throw new Error("At least one RPC endpoint is required for Polygon");
    }

    // Use first RPC endpoint (fallback mechanism handled by factory)
    const rpcUrl = rpcEndpoints[0];

    logger.debug("Creating Polygon provider", {
      network,
      rpcUrl: rpcUrl.replace(/\/v\d+\/[^/]+$/, "/v*/***"), // Mask API key in logs
      chainId: PolygonProvider.CHAIN_IDS.mainnet,
      fallbackEndpoints: rpcEndpoints.length - 1,
    });

    return new EthersAdapter(rpcUrl, logger);
  }

  /**
   * Get chain ID for Polygon network
   *
   * @param network - Blockchain network
   * @returns Chain ID
   */
  static getChainId(network: BlockchainNetwork): number {
    if (network !== "polygon") {
      throw new Error(`PolygonProvider only supports 'polygon' network`);
    }

    return PolygonProvider.CHAIN_IDS.mainnet;
  }

  /**
   * Get supported testnet chain IDs
   *
   * @returns Object mapping testnet names to chain IDs
   */
  static getTestnetChainIds(): Record<string, number> {
    return {
      mumbai: PolygonProvider.CHAIN_IDS.mumbai,
    };
  }
}

