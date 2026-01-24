/**
 * Token Domain Entity
 *
 * Domain entity representing a Token (ERC-20) in the Web3 Service.
 * This entity includes validation and business logic for token operations.
 */

import { Address } from "../../shared/value-objects/Address";

/**
 * Token domain entity
 *
 * Represents an ERC-20 token with validation and business logic.
 * Includes methods for amount formatting and parsing.
 */
export class Token {
  public readonly address: Address;
  public readonly name: string;
  public readonly symbol: string;
  public readonly decimals: number;
  public readonly totalSupply?: string;

  /**
   * Creates a new Token domain entity
   *
   * @param params - Token properties
   * @throws Error if validation fails
   */
  constructor(params: {
    address: string | Address;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: string;
  }) {
    // Validate and set properties
    this.address =
      params.address instanceof Address
        ? params.address
        : new Address(params.address);
    this.name = this.validateName(params.name);
    this.symbol = this.validateSymbol(params.symbol);
    this.decimals = this.validateDecimals(params.decimals);
    this.totalSupply = params.totalSupply
      ? this.validateTotalSupply(params.totalSupply)
      : undefined;
  }

  /**
   * Validates token name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateName(name: string): string {
    if (!name || typeof name !== "string") {
      throw new Error("Token name is required and must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Token name cannot be empty");
    }

    return trimmedName;
  }

  /**
   * Validates token symbol
   *
   * @param symbol - Symbol to validate
   * @returns Validated symbol
   * @throws Error if symbol is invalid
   */
  private validateSymbol(symbol: string): string {
    if (!symbol || typeof symbol !== "string") {
      throw new Error("Token symbol is required and must be a string");
    }

    const trimmedSymbol = symbol.trim();

    if (trimmedSymbol.length === 0) {
      throw new Error("Token symbol cannot be empty");
    }

    return trimmedSymbol.toUpperCase();
  }

  /**
   * Validates token decimals
   *
   * @param decimals - Decimals to validate
   * @returns Validated decimals
   * @throws Error if decimals is invalid
   */
  private validateDecimals(decimals: number): number {
    if (typeof decimals !== "number") {
      throw new Error("Token decimals must be a number");
    }

    if (!Number.isInteger(decimals)) {
      throw new Error("Token decimals must be an integer");
    }

    if (decimals < 0) {
      throw new Error("Token decimals cannot be negative");
    }

    if (decimals > 255) {
      throw new Error("Token decimals cannot exceed 255");
    }

    return decimals;
  }

  /**
   * Validates total supply
   *
   * @param totalSupply - Total supply to validate
   * @returns Validated total supply
   * @throws Error if total supply is invalid
   */
  private validateTotalSupply(totalSupply: string): string {
    if (!totalSupply || typeof totalSupply !== "string") {
      throw new Error("Total supply must be a string");
    }

    const trimmedTotalSupply = totalSupply.trim();

    if (trimmedTotalSupply.length === 0) {
      throw new Error("Total supply cannot be empty");
    }

    // Validate it's a valid number (can be very large)
    try {
      const totalSupplyBigInt = BigInt(trimmedTotalSupply);
      if (totalSupplyBigInt < 0n) {
        throw new Error("Total supply cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error(`Invalid total supply format: ${trimmedTotalSupply}`);
    }

    return trimmedTotalSupply;
  }

  /**
   * Formats amount from smallest unit (wei) to human-readable format
   *
   * @param amount - Amount in smallest unit (as string to handle large numbers)
   * @returns Formatted amount as string with decimals applied
   * @throws Error if amount is invalid
   */
  public formatAmount(amount: string): string {
    if (!amount || typeof amount !== "string") {
      throw new Error("Amount is required and must be a string");
    }

    const trimmedAmount = amount.trim();

    if (trimmedAmount.length === 0) {
      throw new Error("Amount cannot be empty");
    }

    try {
      const amountBigInt = BigInt(trimmedAmount);
      if (amountBigInt < 0n) {
        throw new Error("Amount cannot be negative");
      }

      // Convert to string with leading zeros if needed
      const amountString = amountBigInt.toString().padStart(this.decimals + 1, "0");

      // Split into integer and decimal parts
      const integerPart = amountString.slice(0, -this.decimals) || "0";
      const decimalPart = amountString.slice(-this.decimals);

      // Remove trailing zeros from decimal part
      const trimmedDecimalPart = decimalPart.replace(/0+$/, "");

      // Return formatted amount
      if (trimmedDecimalPart.length === 0) {
        return integerPart;
      }

      return `${integerPart}.${trimmedDecimalPart}`;
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error(`Invalid amount format: ${trimmedAmount}`);
    }
  }

  /**
   * Parses human-readable amount to smallest unit (wei)
   *
   * @param amount - Human-readable amount (e.g., "1.5" for 1.5 tokens)
   * @returns Amount in smallest unit as string
   * @throws Error if amount is invalid
   */
  public parseAmount(amount: string): string {
    if (!amount || typeof amount !== "string") {
      throw new Error("Amount is required and must be a string");
    }

    const trimmedAmount = amount.trim();

    if (trimmedAmount.length === 0) {
      throw new Error("Amount cannot be empty");
    }

    // Validate format (number with optional decimal point)
    const amountPattern = /^-?\d+(\.\d+)?$/;
    if (!amountPattern.test(trimmedAmount)) {
      throw new Error(`Invalid amount format: ${trimmedAmount}`);
    }

    // Check for negative values
    if (trimmedAmount.startsWith("-")) {
      throw new Error("Amount cannot be negative");
    }

    // Split into integer and decimal parts
    const parts = trimmedAmount.split(".");
    const integerPart = parts[0] || "0";
    const decimalPart = parts[1] || "";

    // Validate decimal part doesn't exceed token decimals
    if (decimalPart.length > this.decimals) {
      throw new Error(
        `Amount has too many decimal places. Maximum: ${this.decimals}, got: ${decimalPart.length}`
      );
    }

    // Pad decimal part to match token decimals
    const paddedDecimalPart = decimalPart.padEnd(this.decimals, "0");

    // Combine integer and decimal parts
    const amountInSmallestUnit = integerPart + paddedDecimalPart;

    // Validate the result is a valid number
    try {
      const amountBigInt = BigInt(amountInSmallestUnit);
      if (amountBigInt < 0n) {
        throw new Error("Amount cannot be negative");
      }
      return amountBigInt.toString();
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error(`Invalid amount format: ${trimmedAmount}`);
    }
  }

  /**
   * Validates token entity
   *
   * @throws Error if validation fails
   */
  public validate(): void {
    // Address validation is done in Address value object constructor
    // Additional token-level validations can be added here
  }

  /**
   * Converts token to plain object (JSON)
   *
   * @returns Plain object representation
   */
  public toJSON(): {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply?: string;
  } {
    return {
      address: this.address.getValue(),
      name: this.name,
      symbol: this.symbol,
      decimals: this.decimals,
      totalSupply: this.totalSupply,
    };
  }

  /**
   * Checks if this token equals another token
   *
   * @param other - Other token to compare
   * @returns True if tokens are equal
   */
  public equals(other: Token): boolean {
    // Compare totalSupply: both undefined or both defined and equal
    const totalSupplyEqual =
      this.totalSupply === undefined && other.totalSupply === undefined
        ? true
        : this.totalSupply !== undefined && other.totalSupply !== undefined
          ? this.totalSupply === other.totalSupply
          : false;

    return (
      this.address.equals(other.address) &&
      this.name === other.name &&
      this.symbol === other.symbol &&
      this.decimals === other.decimals &&
      totalSupplyEqual
    );
  }
}

