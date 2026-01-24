/**
 * Address Value Object
 *
 * Represents a blockchain address with EIP-55 checksumming.
 * This is a value object that encapsulates address validation and formatting.
 * 
 * This is a shared value object used across multiple domains (wallet, transaction, etc.)
 * to maintain domain independence while sharing common blockchain address concepts.
 */

import { isAddress, getAddress } from "ethers";

/**
 * Address value object
 *
 * Encapsulates blockchain address with EIP-55 checksumming.
 * Value objects are immutable and compared by value, not reference.
 */
export class Address {
  private readonly _value: string; // EIP-55 checksummed address

  /**
   * Creates a new Address value object
   *
   * @param address - Blockchain address (will be checksummed)
   * @throws Error if address is invalid
   */
  constructor(address: string) {
    this._value = this.validateAndChecksum(address);
  }

  /**
   * Validates and checksums an address
   *
   * @param address - Address to validate and checksum
   * @returns EIP-55 checksummed address
   * @throws Error if address is invalid
   */
  private validateAndChecksum(address: string): string {
    if (!address || typeof address !== "string") {
      throw new Error("Address is required and must be a string");
    }

    const trimmedAddress = address.trim();

    if (trimmedAddress.length === 0) {
      throw new Error("Address cannot be empty");
    }

    // Validate address format using ethers.js
    if (!isAddress(trimmedAddress)) {
      throw new Error(`Invalid address format: ${trimmedAddress}`);
    }

    // Convert to EIP-55 checksummed format
    try {
      return getAddress(trimmedAddress);
    } catch (error) {
      throw new Error(`Failed to checksum address: ${trimmedAddress}`);
    }
  }

  /**
   * Gets the checksummed address value
   *
   * @returns EIP-55 checksummed address
   */
  public getValue(): string {
    return this._value;
  }

  /**
   * Gets the address in lowercase (for comparison)
   *
   * @returns Lowercase address
   */
  public toLowerCase(): string {
    return this._value.toLowerCase();
  }

  /**
   * Checks if this address equals another address
   *
   * @param other - Other address to compare
   * @returns True if addresses are equal (case-insensitive)
   */
  public equals(other: Address): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  /**
   * Converts address to string
   *
   * @returns Address as string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Validates an address format (static utility)
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

  /**
   * Checksums an address (static utility)
   *
   * @param address - Address to checksum
   * @returns EIP-55 checksummed address
   * @throws Error if address is invalid
   */
  public static checksum(address: string): string {
    if (!Address.isValid(address)) {
      throw new Error(`Invalid address: ${address}`);
    }
    return getAddress(address.trim());
  }
}

