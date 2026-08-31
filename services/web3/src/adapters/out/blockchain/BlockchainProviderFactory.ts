/**
 * Blockchain Provider Factory
 *
 * Factory for creating network-specific blockchain providers.
 * Supports multiple RPC endpoints per network with fallback mechanism.
 * Configuration via environment variables.
 */

import type { BlockchainNetwork, Logger } from "@vbar/shared";
import { ConfigHelper } from "@vbar/shared";
import type { BlockchainProviderPort } from "../../../ports/out/BlockchainProviderPort";
import { EthereumProvider } from "./providers/EthereumProvider";
import { PolygonProvider } from "./providers/PolygonProvider";
import { BSCProvider } from "./providers/BSCProvider";
import { ArbitrumProvider } from "./providers/ArbitrumProvider";
import { EthersAdapter } from "./EthersAdapter";

/**
 * Blockchain Provider Factory
 *
 * Creates network-specific blockchain providers with fallback RPC endpoint support.
 * Supports configuration via environment variables with comma-separated fallback endpoints.
 */
export class BlockchainProviderFactory {
  /**
   * Environment variable keys for RPC endpoints
   */
  private static readonly RPC_ENV_KEYS: Record<BlockchainNetwork, string> = {
    ethereum: "WEB3_RPC_ETHEREUM",
    polygon: "WEB3_RPC_POLYGON",
    bsc: "WEB3_RPC_BSC",
    arbitrum: "WEB3_RPC_ARBITRUM",
  };

  /**
   * Default RPC endpoints for each network
   * Used when environment variables are not set
   */
  private static readonly RPC_DEFAULTS: Record<BlockchainNetwork, string> = {
    ethereum: "https://eth.llamarpc.com",
    polygon: "https://polygon.llamarpc.com",
    bsc: "https://bsc-dataseed1.binance.org",
    arbitrum: "https://arb1.arbitrum.io/rpc",
  };

  /**
   * Provider cache to reuse providers across requests
   */
  private static providerCache: Map<string, BlockchainProviderPort> = new Map();

  /**
   * Create a blockchain provider for the specified network
   *
   * @param network - Blockchain network
   * @param logger - Logger instance
   * @returns BlockchainProviderPort instance
   * @throws Error if network is not supported or RPC endpoint is not configured
   */
  static createProvider(
    network: BlockchainNetwork,
    logger: Logger
  ): BlockchainProviderPort {
    // Check cache first
    const cacheKey = network;
    const cachedProvider = BlockchainProviderFactory.providerCache.get(cacheKey);
    if (cachedProvider) {
      logger.debug("Using cached blockchain provider", { network });
      return cachedProvider;
    }

    // Get RPC endpoints from environment variables
    const rpcEndpoints = BlockchainProviderFactory.getRpcEndpoints(network, logger);

    // Create provider based on network
    let provider: BlockchainProviderPort;

    switch (network) {
      case "ethereum":
        provider = EthereumProvider.createProvider(network, rpcEndpoints, logger);
        break;
      case "polygon":
        provider = PolygonProvider.createProvider(network, rpcEndpoints, logger);
        break;
      case "bsc":
        provider = BSCProvider.createProvider(network, rpcEndpoints, logger);
        break;
      case "arbitrum":
        provider = ArbitrumProvider.createProvider(network, rpcEndpoints, logger);
        break;
      default:
        throw new Error(`Unsupported blockchain network: ${network}`);
    }

    // Cache the provider
    BlockchainProviderFactory.providerCache.set(cacheKey, provider);

    logger.info("Created blockchain provider", {
      network,
      rpcEndpointsCount: rpcEndpoints.length,
      primaryRpc: rpcEndpoints[0].replace(/\/v\d+\/[^/]+$/, "/v*/***"), // Mask API key
    });

    return provider;
  }

  /**
   * Get RPC endpoints for a network from environment variables
   *
   * Supports multiple endpoints separated by commas for fallback mechanism.
   * Example: WEB3_RPC_ETHEREUM=https://rpc1.example.com,https://rpc2.example.com
   *
   * @param network - Blockchain network
   * @param logger - Logger instance
   * @returns Array of RPC endpoint URLs
   * @throws Error if no RPC endpoint is configured
   */
  private static getRpcEndpoints(
    network: BlockchainNetwork,
    logger: Logger
  ): string[] {
    const envKey = BlockchainProviderFactory.RPC_ENV_KEYS[network];

    if (!envKey) {
      throw new Error(`No environment variable key configured for network: ${network}`);
    }

    try {
      const defaultValue = BlockchainProviderFactory.RPC_DEFAULTS[network];
      const rpcValue = ConfigHelper.getEnv(envKey, defaultValue);

      if (!rpcValue || rpcValue.trim().length === 0) {
        throw new Error(`Environment variable ${envKey} is empty`);
      }

      // Split by comma to support multiple endpoints (fallback mechanism)
      const endpoints = rpcValue
        .split(",")
        .map((endpoint) => endpoint.trim())
        .filter((endpoint) => endpoint.length > 0);

      if (endpoints.length === 0) {
        throw new Error(`No valid RPC endpoints found in ${envKey}`);
      }

      // Validate URLs
      for (const endpoint of endpoints) {
        try {
          new URL(endpoint);
        } catch {
          throw new Error(`Invalid RPC endpoint URL: ${endpoint}`);
        }
      }

      logger.debug("Loaded RPC endpoints", {
        network,
        envKey,
        endpointCount: endpoints.length,
        hasFallback: endpoints.length > 1,
      });

      return endpoints;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to get RPC endpoints for ${network}`, {
        envKey,
        error: errorMessage,
      });
      throw new Error(
        `Failed to get RPC endpoints for ${network}: ${errorMessage}`
      );
    }
  }

  /**
   * Create a provider with fallback mechanism
   *
   * Attempts to use primary RPC endpoint, falls back to secondary endpoints on failure.
   * This method creates a wrapper that handles fallback logic.
   *
   * @param network - Blockchain network
   * @param logger - Logger instance
   * @returns BlockchainProviderPort with fallback support
   */
  static createProviderWithFallback(
    network: BlockchainNetwork,
    logger: Logger
  ): BlockchainProviderPort {
    const rpcEndpoints = BlockchainProviderFactory.getRpcEndpoints(network, logger);

    // If only one endpoint, return simple provider
    if (rpcEndpoints.length === 1) {
      return BlockchainProviderFactory.createProvider(network, logger);
    }

    // Create fallback wrapper
    return new FallbackBlockchainProvider(network, rpcEndpoints, logger);
  }

  /**
   * Clear provider cache
   *
   * Useful for testing or when RPC endpoints change at runtime.
   */
  static clearCache(): void {
    BlockchainProviderFactory.providerCache.clear();
  }
}

/**
 * Fallback Blockchain Provider
 *
 * Wrapper that provides fallback mechanism for multiple RPC endpoints.
 * Attempts operations on primary endpoint, falls back to secondary endpoints on failure.
 */
class FallbackBlockchainProvider implements BlockchainProviderPort {
  private readonly network: BlockchainNetwork;
  private readonly rpcEndpoints: string[];
  private readonly logger: Logger;
  private currentProviderIndex: number = 0;

  constructor(
    network: BlockchainNetwork,
    rpcEndpoints: string[],
    logger: Logger
  ) {
    this.network = network;
    this.rpcEndpoints = rpcEndpoints;
    this.logger = logger;
  }

  /**
   * Get current provider
   *
   * @returns Current EthersAdapter instance
   */
  private getCurrentProvider(): BlockchainProviderPort {
    const rpcUrl = this.rpcEndpoints[this.currentProviderIndex];
    return new EthersAdapter(rpcUrl, this.logger);
  }

  /**
   * Execute operation with fallback
   *
   * @param operation - Operation to execute
   * @returns Operation result
   */
  private async executeWithFallback<T>(
    operation: (provider: BlockchainProviderPort) => Promise<T>
  ): Promise<T> {
    let lastError: Error | null = null;

    // Try all endpoints
    for (let i = 0; i < this.rpcEndpoints.length; i++) {
      try {
        this.currentProviderIndex = i;
        const provider = this.getCurrentProvider();
        return await operation(provider);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (i < this.rpcEndpoints.length - 1) {
          this.logger.warn(
            `RPC endpoint ${i + 1} failed, trying fallback endpoint`,
            {
              network: this.network,
              endpointIndex: i,
              error: lastError.message,
            }
          );
        }
      }
    }

    // All endpoints failed
    throw (
      lastError ||
      new Error(`All RPC endpoints failed for network: ${this.network}`)
    );
  }

  async getBalance(address: string, network: BlockchainNetwork): Promise<string> {
    return this.executeWithFallback((provider) =>
      provider.getBalance(address, network)
    );
  }

  async sendTransaction(
    signedTx: string,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithFallback((provider) =>
      provider.sendTransaction(signedTx, network)
    );
  }

  async getTransactionReceipt(
    txHash: string,
    network: BlockchainNetwork
  ): Promise<import("../../../ports/out/BlockchainProviderPort").TransactionReceipt | null> {
    return this.executeWithFallback((provider) =>
      provider.getTransactionReceipt(txHash, network)
    );
  }

  async callContract(
    address: string,
    abi: any[],
    functionName: string,
    params: any[],
    network: BlockchainNetwork
  ): Promise<any> {
    return this.executeWithFallback((provider) =>
      provider.callContract(address, abi, functionName, params, network)
    );
  }

  async estimateGas(
    tx: import("../../../ports/out/BlockchainProviderPort").TransactionRequest,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithFallback((provider) =>
      provider.estimateGas(tx, network)
    );
  }

  async getGasPrice(network: BlockchainNetwork): Promise<string> {
    return this.executeWithFallback((provider) =>
      provider.getGasPrice(network)
    );
  }

  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    network: BlockchainNetwork
  ): Promise<string> {
    return this.executeWithFallback((provider) =>
      provider.getTokenBalance(tokenAddress, walletAddress, network)
    );
  }

  async getTokenInfo(
    tokenAddress: string,
    network: BlockchainNetwork
  ): Promise<import("../../../ports/out/BlockchainProviderPort").TokenInfo> {
    return this.executeWithFallback((provider) =>
      provider.getTokenInfo(tokenAddress, network)
    );
  }

  async getNFTs(
    ownerAddress: string,
    network: BlockchainNetwork
  ): Promise<import("@vbar/shared").NFT[]> {
    return this.executeWithFallback((provider) =>
      provider.getNFTs(ownerAddress, network)
    );
  }
}

