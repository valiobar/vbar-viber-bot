/**
 * Blockchain configuration for Web3 Service
 *
 * Manages RPC endpoints, chain IDs, and gas settings for multiple networks
 */

import { ConfigHelper } from "@vbar/shared";

/**
 * Chain ID mappings for supported networks
 */
export const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  bsc: 56,
  arbitrum: 42161,
} as const;

/**
 * Network name type
 */
export type NetworkName = keyof typeof CHAIN_IDS;

/**
 * Blockchain configuration interface
 */
export interface BlockchainConfig {
  rpcUrls: string[];
  chainId: number;
  name: string;
  gasPrice?: {
    min: string;
    max: string;
  };
}

/**
 * Get RPC URLs from environment variable
 * Supports comma-separated values for fallback endpoints
 *
 * @param envVar - Environment variable name
 * @param defaultValue - Default RPC URL
 * @returns Array of RPC URLs
 */
function getRpcUrls(envVar: string, defaultValue: string): string[] {
  const value = ConfigHelper.getEnv(envVar, defaultValue);
  return value.split(",").map((url) => url.trim()).filter((url) => url.length > 0);
}

/**
 * Get blockchain configuration for a specific network
 *
 * @param network - Network name
 * @returns Blockchain configuration
 */
export function getBlockchainConfig(network: NetworkName): BlockchainConfig {
  switch (network) {
    case "ethereum":
      return {
        rpcUrls: getRpcUrls(
          "WEB3_RPC_ETHEREUM",
          "https://eth.llamarpc.com"
        ),
        chainId: CHAIN_IDS.ethereum,
        name: "Ethereum Mainnet",
      };
    case "polygon":
      return {
        rpcUrls: getRpcUrls(
          "WEB3_RPC_POLYGON",
          "https://polygon.llamarpc.com"
        ),
        chainId: CHAIN_IDS.polygon,
        name: "Polygon Mainnet",
      };
    case "bsc":
      return {
        rpcUrls: getRpcUrls("WEB3_RPC_BSC", "https://bsc-dataseed1.binance.org"),
        chainId: CHAIN_IDS.bsc,
        name: "Binance Smart Chain",
      };
    case "arbitrum":
      return {
        rpcUrls: getRpcUrls(
          "WEB3_RPC_ARBITRUM",
          "https://arb1.arbitrum.io/rpc"
        ),
        chainId: CHAIN_IDS.arbitrum,
        name: "Arbitrum One",
      };
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Get primary RPC URL for a network (first URL in the array)
 *
 * @param network - Network name
 * @returns Primary RPC URL
 */
export function getPrimaryRpcUrl(network: NetworkName): string {
  const config = getBlockchainConfig(network);
  if (config.rpcUrls.length === 0) {
    throw new Error(`No RPC URLs configured for network: ${network}`);
  }
  return config.rpcUrls[0];
}

/**
 * Get all RPC URLs for a network (for fallback)
 *
 * @param network - Network name
 * @returns Array of RPC URLs
 */
export function getAllRpcUrls(network: NetworkName): string[] {
  const config = getBlockchainConfig(network);
  return config.rpcUrls;
}

/**
 * Get chain ID for a network
 *
 * @param network - Network name
 * @returns Chain ID
 */
export function getChainId(network: NetworkName): number {
  return CHAIN_IDS[network];
}

/**
 * Validate blockchain configuration
 * Checks that all required RPC endpoints are configured
 */
export function validateBlockchainConfig(): void {
  const networks: NetworkName[] = ["ethereum", "polygon", "bsc", "arbitrum"];

  for (const network of networks) {
    try {
      const config = getBlockchainConfig(network);
      if (config.rpcUrls.length === 0) {
        throw new Error(`No RPC URLs configured for ${network}`);
      }
    } catch (error) {
      throw new Error(
        `Invalid blockchain configuration for ${network}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

