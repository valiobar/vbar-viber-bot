/**
 * Contract Address Value Object
 *
 * Represents a smart contract address with validation.
 * This is a value object that encapsulates contract address validation.
 * 
 * Contract addresses follow the same format as regular Ethereum addresses,
 * but this value object provides semantic meaning and validation specific
 * to smart contracts.
 */

import { Address } from "../../shared/value-objects/Address";
import { isAddress } from "ethers";

/**
 * Contract address value object
 *
 * Encapsulates smart contract address with validation.
 * Value objects are immutable and compared by value, not reference.
 * 
 * Contract addresses are Ethereum addresses that represent smart contracts
 * deployed on blockchain networks.
 */
export class ContractAddress {
  private readonly _value: Address; // EIP-55 checksummed address

  /**
   * Creates a new ContractAddress value object
   *
   * @param address - Contract address (will be checksummed)
   * @throws Error if address is invalid
   */
  constructor(address: string | Address) {
    this._value =
      address instanceof Address ? address : new Address(address);
  }

  /**
   * Validates contract address format
   *
   * Contract addresses must be valid Ethereum addresses.
   * Additional validation can be added here to verify the address
   * is actually a contract (e.g., by checking contract code),
   * but that would require blockchain interaction and should be done
   * at the service layer, not the domain layer.
   *
   * @param address - Address to validate
   * @returns Validated Address value object
   * @throws Error if address is invalid
   */
  private validate(address: string): Address {
    if (!address || typeof address !== "string") {
      throw new Error("Contract address is required and must be a string");
    }

    const trimmedAddress = address.trim();

    if (trimmedAddress.length === 0) {
      throw new Error("Contract address cannot be empty");
    }

    // Validate address format using ethers.js
    if (!isAddress(trimmedAddress)) {
      throw new Error(`Invalid contract address format: ${trimmedAddress}`);
    }

    // Address validation and checksumming is handled by Address value object
    return new Address(trimmedAddress);
  }

  /**
   * Gets the checksummed contract address value
   *
   * @returns EIP-55 checksummed contract address
   */
  public getValue(): string {
    return this._value.getValue();
  }

  /**
   * Gets the contract address in lowercase (for comparison)
   *
   * @returns Lowercase contract address
   */
  public toLowerCase(): string {
    return this._value.toLowerCase();
  }

  /**
   * Checks if this contract address equals another contract address
   *
   * @param other - Other contract address to compare
   * @returns True if contract addresses are equal (case-insensitive)
   */
  public equals(other: ContractAddress): boolean {
    return this._value.equals(other._value);
  }

  /**
   * Converts contract address to string
   *
   * @returns Contract address as string
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
   * Validates a contract address format (static utility)
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

