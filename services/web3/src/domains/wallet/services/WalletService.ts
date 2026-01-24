/**
 * WalletService Domain Service
 *
 * Domain service for wallet-related business logic.
 * Handles wallet generation, import, and address validation operations.
 */

import { Wallet as EthersWallet } from "ethers";
import { Network } from "../../shared/value-objects/Network";
import { Address } from "../../shared/value-objects/Address";

/**
 * Wallet generation result
 */
export interface WalletGenerationResult {
  address: string;
  privateKey: string;
}

/**
 * Wallet import result
 */
export interface WalletImportResult {
  address: string;
}

/**
 * WalletService domain service
 *
 * Provides wallet-related business logic operations.
 * Pure business logic with minimal external dependencies (ethers.js for blockchain operations).
 */
export class WalletService {
  /**
   * Generates a new wallet for the specified network
   *
   * @param network - Blockchain network
   * @returns Wallet generation result with address and private key
   * @throws Error if wallet generation fails
   */
  public generateWallet(network: Network): WalletGenerationResult {
    try {
      // Create a new random wallet using ethers.js
      const wallet = EthersWallet.createRandom();

      // Get the address (already in checksummed format from ethers)
      const address = wallet.address;

      // Get the private key (without 0x prefix for consistency)
      const privateKey = wallet.privateKey;

      return {
        address: Address.checksum(address), // Ensure EIP-55 format
        privateKey,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate wallet for network ${network.getValue()}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Imports an existing wallet from a private key
   *
   * @param privateKey - Private key to import (with or without 0x prefix)
   * @param network - Blockchain network
   * @returns Wallet import result with address
   * @throws Error if wallet import fails
   */
  public importWallet(
    privateKey: string,
    network: Network
  ): WalletImportResult {
    try {
      // Validate private key format
      if (!privateKey || typeof privateKey !== "string") {
        throw new Error("Private key is required and must be a string");
      }

      const trimmedPrivateKey = privateKey.trim();

      // Ensure private key has 0x prefix for ethers.js
      const normalizedPrivateKey = trimmedPrivateKey.startsWith("0x")
        ? trimmedPrivateKey
        : `0x${trimmedPrivateKey}`;

      // Validate private key length (64 hex characters + 0x prefix = 66 characters)
      if (normalizedPrivateKey.length !== 66) {
        throw new Error(
          "Invalid private key format: must be 64 hex characters (with or without 0x prefix)"
        );
      }

      // Create wallet from private key using ethers.js
      const wallet = new EthersWallet(normalizedPrivateKey);

      // Get the address (already in checksummed format from ethers)
      const address = wallet.address;

      return {
        address: Address.checksum(address), // Ensure EIP-55 format
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("invalid private key")) {
        throw new Error(`Invalid private key: ${error.message}`);
      }
      throw new Error(
        `Failed to import wallet for network ${network.getValue()}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validates an address format
   *
   * @param address - Address to validate
   * @returns True if address is valid
   */
  public validateAddress(address: string): boolean {
    return Address.isValid(address);
  }

  /**
   * Converts an address to EIP-55 checksummed format
   *
   * @param address - Address to checksum
   * @returns EIP-55 checksummed address
   * @throws Error if address is invalid
   */
  public checksumAddress(address: string): string {
    return Address.checksum(address);
  }
}

