/**
 * Gas Price Value Object
 *
 * Represents a gas price with validation and conversion methods.
 * This is a value object that encapsulates gas price validation and unit conversions.
 */

import { formatUnits, parseUnits } from "ethers";

/**
 * Gas price value object
 *
 * Encapsulates gas price with validation and unit conversions.
 * Value objects are immutable and compared by value, not reference.
 */
export class GasPrice {
  private readonly _value: string; // Gas price in wei (as string to handle large numbers)

  /**
   * Maximum reasonable gas price in wei (1,000,000 gwei = 1,000,000,000,000,000,000 wei)
   */
  private static readonly MAX_GAS_PRICE_WEI = "1000000000000000000";

  /**
   * Minimum gas price in wei (1 wei)
   */
  private static readonly MIN_GAS_PRICE_WEI = "1";

  /**
   * Creates a new GasPrice value object
   *
   * @param gasPrice - Gas price in wei (as string or number)
   * @throws Error if gas price is invalid
   */
  constructor(gasPrice: string | number) {
    this._value = this.validate(gasPrice);
  }

  /**
   * Validates gas price value
   *
   * @param gasPrice - Gas price to validate
   * @returns Validated gas price as string
   * @throws Error if gas price is invalid
   */
  private validate(gasPrice: string | number): string {
    if (gasPrice === null || gasPrice === undefined) {
      throw new Error("Gas price is required");
    }

    let gasPriceStr: string;

    if (typeof gasPrice === "number") {
      if (gasPrice <= 0 || !Number.isFinite(gasPrice)) {
        throw new Error("Gas price must be a positive finite number");
      }
      gasPriceStr = gasPrice.toString();
    } else if (typeof gasPrice === "string") {
      const trimmed = gasPrice.trim();
      if (trimmed.length === 0) {
        throw new Error("Gas price cannot be empty");
      }
      gasPriceStr = trimmed;
    } else {
      throw new Error("Gas price must be a string or number");
    }

    // Validate it's a valid number
    const gasPriceBigInt = BigInt(gasPriceStr);
    const minGasPrice = BigInt(GasPrice.MIN_GAS_PRICE_WEI);
    const maxGasPrice = BigInt(GasPrice.MAX_GAS_PRICE_WEI);

    if (gasPriceBigInt < minGasPrice) {
      throw new Error(
        `Gas price must be at least ${GasPrice.MIN_GAS_PRICE_WEI} wei`
      );
    }

    if (gasPriceBigInt > maxGasPrice) {
      throw new Error(
        `Gas price exceeds maximum reasonable value of ${GasPrice.MAX_GAS_PRICE_WEI} wei (1,000,000 gwei)`
      );
    }

    return gasPriceStr;
  }

  /**
   * Gets the gas price value in wei
   *
   * @returns Gas price in wei as string
   */
  public getValue(): string {
    return this._value;
  }

  /**
   * Gets the gas price in gwei
   *
   * @returns Gas price in gwei as string
   */
  public toGwei(): string {
    try {
      return formatUnits(this._value, "gwei");
    } catch (error) {
      throw new Error(`Failed to convert gas price to gwei: ${error}`);
    }
  }

  /**
   * Gets the gas price in ether
   *
   * @returns Gas price in ether as string
   */
  public toEther(): string {
    try {
      return formatUnits(this._value, "ether");
    } catch (error) {
      throw new Error(`Failed to convert gas price to ether: ${error}`);
    }
  }

  /**
   * Creates a GasPrice from gwei value
   *
   * @param gwei - Gas price in gwei
   * @returns GasPrice instance
   * @throws Error if conversion fails
   */
  public static fromGwei(gwei: string | number): GasPrice {
    try {
      const gweiStr = typeof gwei === "number" ? gwei.toString() : gwei;
      const wei = parseUnits(gweiStr, "gwei").toString();
      return new GasPrice(wei);
    } catch (error) {
      throw new Error(`Failed to convert gwei to wei: ${error}`);
    }
  }

  /**
   * Creates a GasPrice from ether value
   *
   * @param ether - Gas price in ether
   * @returns GasPrice instance
   * @throws Error if conversion fails
   */
  public static fromEther(ether: string | number): GasPrice {
    try {
      const etherStr = typeof ether === "number" ? ether.toString() : ether;
      const wei = parseUnits(etherStr, "ether").toString();
      return new GasPrice(wei);
    } catch (error) {
      throw new Error(`Failed to convert ether to wei: ${error}`);
    }
  }

  /**
   * Checks if this gas price equals another gas price
   *
   * @param other - Other gas price to compare
   * @returns True if gas prices are equal
   */
  public equals(other: GasPrice): boolean {
    return this._value === other._value;
  }

  /**
   * Compares this gas price with another
   *
   * @param other - Other gas price to compare
   * @returns Negative if this is less, positive if greater, zero if equal
   */
  public compare(other: GasPrice): number {
    const thisValue = BigInt(this._value);
    const otherValue = BigInt(other._value);

    if (thisValue < otherValue) {
      return -1;
    }
    if (thisValue > otherValue) {
      return 1;
    }
    return 0;
  }

  /**
   * Converts gas price to string
   *
   * @returns Gas price as string
   */
  public toString(): string {
    return this._value;
  }
}

