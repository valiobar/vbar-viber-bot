/**
 * Transaction Hash Value Object
 *
 * Represents a blockchain transaction hash with validation.
 * This is a value object that encapsulates transaction hash validation and formatting.
 */

/**
 * Transaction hash value object
 *
 * Encapsulates blockchain transaction hash with validation.
 * Value objects are immutable and compared by value, not reference.
 */
export class TransactionHash {
  private readonly _value: string; // 0x + 64 hex characters

  /**
   * Creates a new TransactionHash value object
   *
   * @param hash - Transaction hash (0x + 64 hex characters)
   * @throws Error if hash is invalid
   */
  constructor(hash: string) {
    this._value = this.validate(hash);
  }

  /**
   * Validates transaction hash format
   *
   * @param hash - Hash to validate
   * @returns Validated hash
   * @throws Error if hash is invalid
   */
  private validate(hash: string): string {
    if (!hash || typeof hash !== "string") {
      throw new Error("Transaction hash is required and must be a string");
    }

    const trimmedHash = hash.trim();

    if (trimmedHash.length === 0) {
      throw new Error("Transaction hash cannot be empty");
    }

    // Validate format: 0x + 64 hex characters
    const txHashPattern = /^0x[a-fA-F0-9]{64}$/;

    if (!txHashPattern.test(trimmedHash)) {
      throw new Error(
        `Invalid transaction hash format: ${trimmedHash}. Expected format: 0x followed by 64 hexadecimal characters`
      );
    }

    return trimmedHash;
  }

  /**
   * Gets the transaction hash value
   *
   * @returns Transaction hash
   */
  public getValue(): string {
    return this._value;
  }

  /**
   * Checks if this transaction hash equals another transaction hash
   *
   * @param other - Other transaction hash to compare
   * @returns True if transaction hashes are equal (case-insensitive)
   */
  public equals(other: TransactionHash): boolean {
    return this._value.toLowerCase() === other._value.toLowerCase();
  }

  /**
   * Converts transaction hash to string
   *
   * @returns Transaction hash as string
   */
  public toString(): string {
    return this._value;
  }

  /**
   * Validates a transaction hash format (static utility)
   *
   * @param hash - Hash to validate
   * @returns True if hash is valid
   */
  public static isValid(hash: string): boolean {
    if (!hash || typeof hash !== "string") {
      return false;
    }

    const trimmedHash = hash.trim();
    const txHashPattern = /^0x[a-fA-F0-9]{64}$/;

    return txHashPattern.test(trimmedHash);
  }
}

