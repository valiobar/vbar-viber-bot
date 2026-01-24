/**
 * Network Value Object
 *
 * Represents a blockchain network with validation and chain ID mapping.
 * This is a value object that encapsulates network information.
 * 
 * This is a shared value object used across multiple domains (wallet, transaction, etc.)
 * to maintain domain independence while sharing common blockchain network concepts.
 */

import type { BlockchainNetwork } from "@vbar/shared";

/**
 * Network value object
 *
 * Encapsulates blockchain network information with validation and chain ID mapping.
 * Value objects are immutable and compared by value, not reference.
 */
export class Network {
  private readonly _value: BlockchainNetwork;
  private readonly _chainId: number;

  /**
   * Chain ID mapping for each supported network
   */
  private static readonly CHAIN_IDS: Record<BlockchainNetwork, number> = {
    ethereum: 1,
    polygon: 137,
    bsc: 56,
    arbitrum: 42161,
  };

  /**
   * Creates a new Network value object
   *
   * @param network - Blockchain network name
   * @throws Error if network is invalid
   */
  constructor(network: BlockchainNetwork | string) {
    this._value = this.validateNetwork(network);
    this._chainId = Network.CHAIN_IDS[this._value];
  }

  /**
   * Validates network value
   *
   * @param network - Network value to validate
   * @returns Validated network
   * @throws Error if network is invalid
   */
  private validateNetwork(network: string): BlockchainNetwork {
    if (!network || typeof network !== "string") {
      throw new Error("Network is required and must be a string");
    }

    const normalizedNetwork = network.toLowerCase().trim() as BlockchainNetwork;

    if (!Network.CHAIN_IDS[normalizedNetwork]) {
      throw new Error(
        `Invalid network: ${network}. Supported networks: ${Object.keys(Network.CHAIN_IDS).join(", ")}`
      );
    }

    return normalizedNetwork;
  }

  /**
   * Gets the network value
   *
   * @returns Network value
   */
  public getValue(): BlockchainNetwork {
    return this._value;
  }

  /**
   * Gets the chain ID for this network
   *
   * @returns Chain ID
   */
  public getChainId(): number {
    return this._chainId;
  }

  /**
   * Checks if this network equals another network
   *
   * @param other - Other network to compare
   * @returns True if networks are equal
   */
  public equals(other: Network): boolean {
    return this._value === other._value;
  }

  /**
   * Converts network to string
   *
   * @returns Network as string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Gets all supported networks
   *
   * @returns Array of supported network names
   */
  public static getSupportedNetworks(): BlockchainNetwork[] {
    return Object.keys(Network.CHAIN_IDS) as BlockchainNetwork[];
  }

  /**
   * Gets chain ID for a network
   *
   * @param network - Network name
   * @returns Chain ID
   * @throws Error if network is invalid
   */
  public static getChainId(network: BlockchainNetwork): number {
    if (!Network.CHAIN_IDS[network]) {
      throw new Error(`Invalid network: ${network}`);
    }
    return Network.CHAIN_IDS[network];
  }
}

