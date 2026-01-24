/**
 * Token Address Value Object
 *
 * Represents a token contract address (ERC-20 or ERC-721) with validation.
 * This is a value object that encapsulates token address validation.
 * 
 * Token addresses follow the same format as regular Ethereum addresses,
 * but this value object provides semantic meaning and validation specific
 * to token contracts.
 */

import { Address } from "../../shared/value-objects/Address";
import { isAddress } from "ethers";

/**
 * Token address value object
 *
 * Encapsulates token contract address with validation.
 * Value objects are immutable and compared by value, not reference.
 * 
 * Token addresses are Ethereum addresses that represent smart contracts
 * implementing ERC-20 (fungible tokens) or ERC-721 (NFTs) standards.
 */
export class TokenAddress {
  private readonly _value: Address; // EIP-55 checksummed address

  /**
   * Creates a new TokenAddress value object
   *
   * @param address - Token contract address (will be checksummed)
   * @throws Error if address is invalid
   */
  constructor(address: string | Address) {
    this._value =
      address instanceof Address ? address : new Address(address);
  }

  /**
   * Validates token address format
   *
   * Token addresses must be valid Ethereum addresses.
   * Additional validation can be added here to verify the address
   * is actually a token contract (e.g., by checking contract code),
   * but that would require blockchain interaction and should be done
   * at the service layer, not the domain layer.
   *
   * @param address - Address to validate
   * @returns Validated Address value object
   * @throws Error if address is invalid
   */
  private validate(address: string): Address {
    if (!address || typeof address !== "string") {
      throw new Error("Token address is required and must be a string");
    }

    const trimmedAddress = address.trim();

    if (trimmedAddress.length === 0) {
      throw new Error("Token address cannot be empty");
    }

    // Validate address format using ethers.js
    if (!isAddress(trimmedAddress)) {
      throw new Error(`Invalid token address format: ${trimmedAddress}`);
    }

    // Address validation and checksumming is handled by Address value object
    return new Address(trimmedAddress);
  }

  /**
   * Gets the checksummed token address value
   *
   * @returns EIP-55 checksummed token address
   */
  public getValue(): string {
    return this._value.getValue();
  }

  /**
   * Gets the token address in lowercase (for comparison)
   *
   * @returns Lowercase token address
   */
  public toLowerCase(): string {
    return this._value.toLowerCase();
  }

  /**
   * Checks if this token address equals another token address
   *
   * @param other - Other token address to compare
   * @returns True if token addresses are equal (case-insensitive)
   */
  public equals(other: TokenAddress): boolean {
    return this._value.equals(other._value);
  }

  /**
   * Converts token address to string
   *
   * @returns Token address as string
   */
  public toString(): string {
    return this._value.toString();
  }

  /**
   * Gets the underlying Address value object
   *
   * @returns Address value object
   */
  public getAddress(): Address {
    return this._value;
  }

  /**
   * Validates a token address format (static utility)
   *
   * @param address - Address to validate
   * @returns True if address is valid
   */
  public static isValid(address: string): boolean {
    if (!address || typeof address !== "string") {
      return false;
    }
    return isAddress(address.trim());
  }
}

