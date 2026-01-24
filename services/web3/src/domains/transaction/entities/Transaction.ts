/**
 * Transaction Domain Entity
 *
 * Domain entity representing a Transaction in the Web3 Service.
 * This entity includes validation and business logic for blockchain transactions.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import { Network } from "../../shared/value-objects/Network";
import { Address } from "../../shared/value-objects/Address";
import { TransactionHash } from "../value-objects/TransactionHash";
import { GasPrice } from "../value-objects/GasPrice";

/**
 * Transaction status type
 */
export type TransactionStatus = "pending" | "confirmed" | "failed";

/**
 * Transaction domain entity
 *
 * Represents a blockchain transaction with validation and business logic.
 * Includes methods for status updates and confirmation tracking.
 */
export class Transaction {
  public readonly id: string;
  public readonly walletId: string;
  public readonly txHash: TransactionHash;
  public readonly network: Network;
  public readonly from: Address;
  public readonly to: Address;
  public readonly value: string; // Amount in wei (as string to handle large numbers)
  public readonly tokenAddress?: Address;
  private _status: TransactionStatus;
  private _confirmations: number;
  private _blockNumber?: number;
  private _gasUsed?: string;
  private _gasPrice?: GasPrice;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  /**
   * Creates a new Transaction domain entity
   *
   * @param params - Transaction properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    walletId: string;
    txHash: string | TransactionHash;
    network: BlockchainNetwork | Network | string;
    from: string | Address;
    to: string | Address;
    value: string;
    tokenAddress?: string | Address;
    status: TransactionStatus;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string | GasPrice;
    createdAt: Date | string;
    updatedAt: Date | string;
  }) {
    // Validate and set properties
    this.id = this.validateId(params.id);
    this.walletId = this.validateWalletId(params.walletId);
    this.txHash =
      params.txHash instanceof TransactionHash
        ? params.txHash
        : new TransactionHash(params.txHash);
    this.network =
      params.network instanceof Network
        ? params.network
        : new Network(params.network);
    this.from =
      params.from instanceof Address
        ? params.from
        : new Address(params.from);
    this.to =
      params.to instanceof Address
        ? params.to
        : new Address(params.to);
    this.value = this.validateValue(params.value);
    this.tokenAddress = params.tokenAddress
      ? params.tokenAddress instanceof Address
        ? params.tokenAddress
        : new Address(params.tokenAddress)
      : undefined;
    this._status = this.validateStatus(params.status);
    this._confirmations = this.validateConfirmations(params.confirmations);
    this._blockNumber = params.blockNumber
      ? this.validateBlockNumber(params.blockNumber)
      : undefined;
    this._gasUsed = params.gasUsed
      ? this.validateGasUsed(params.gasUsed)
      : undefined;
    this._gasPrice = params.gasPrice
      ? params.gasPrice instanceof GasPrice
        ? params.gasPrice
        : new GasPrice(params.gasPrice)
      : undefined;
    this.createdAt = this.validateDate(params.createdAt, "createdAt");
    this.updatedAt = this.validateDate(params.updatedAt, "updatedAt");
  }

  /**
   * Gets the transaction status
   *
   * @returns Transaction status
   */
  public get status(): TransactionStatus {
    return this._status;
  }

  /**
   * Gets the number of confirmations
   *
   * @returns Number of confirmations
   */
  public get confirmations(): number {
    return this._confirmations;
  }

  /**
   * Gets the block number
   *
   * @returns Block number or undefined
   */
  public get blockNumber(): number | undefined {
    return this._blockNumber;
  }

  /**
   * Gets the gas used
   *
   * @returns Gas used as string or undefined
   */
  public get gasUsed(): string | undefined {
    return this._gasUsed;
  }

  /**
   * Gets the gas price
   *
   * @returns Gas price value object or undefined
   */
  public get gasPrice(): GasPrice | undefined {
    return this._gasPrice;
  }

  /**
   * Validates transaction ID
   *
   * @param id - ID to validate
   * @returns Validated ID
   * @throws Error if ID is invalid
   */
  private validateId(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("Transaction ID is required and must be a string");
    }

    const trimmedId = id.trim();

    if (trimmedId.length === 0) {
      throw new Error("Transaction ID cannot be empty");
    }

    return trimmedId;
  }

  /**
   * Validates wallet ID
   *
   * @param walletId - Wallet ID to validate
   * @returns Validated wallet ID
   * @throws Error if wallet ID is invalid
   */
  private validateWalletId(walletId: string): string {
    if (!walletId || typeof walletId !== "string") {
      throw new Error("Wallet ID is required and must be a string");
    }

    const trimmedWalletId = walletId.trim();

    if (trimmedWalletId.length === 0) {
      throw new Error("Wallet ID cannot be empty");
    }

    return trimmedWalletId;
  }

  /**
   * Validates transaction value
   *
   * @param value - Value to validate (in wei)
   * @returns Validated value
   * @throws Error if value is invalid
   */
  private validateValue(value: string): string {
    if (!value || typeof value !== "string") {
      throw new Error("Transaction value is required and must be a string");
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      throw new Error("Transaction value cannot be empty");
    }

    // Validate it's a valid number (can be very large for wei)
    try {
      const valueBigInt = BigInt(trimmedValue);
      if (valueBigInt < 0n) {
        throw new Error("Transaction value cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error(`Invalid transaction value format: ${trimmedValue}`);
    }

    return trimmedValue;
  }

  /**
   * Validates transaction status
   *
   * @param status - Status to validate
   * @returns Validated status
   * @throws Error if status is invalid
   */
  private validateStatus(status: string): TransactionStatus {
    if (!status || typeof status !== "string") {
      throw new Error("Transaction status is required and must be a string");
    }

    const validStatuses: TransactionStatus[] = ["pending", "confirmed", "failed"];
    const normalizedStatus = status.toLowerCase().trim() as TransactionStatus;

    if (!validStatuses.includes(normalizedStatus)) {
      throw new Error(
        `Invalid transaction status: ${status}. Valid statuses: ${validStatuses.join(", ")}`
      );
    }

    return normalizedStatus;
  }

  /**
   * Validates confirmations count
   *
   * @param confirmations - Confirmations to validate
   * @returns Validated confirmations
   * @throws Error if confirmations is invalid
   */
  private validateConfirmations(confirmations: number): number {
    if (typeof confirmations !== "number") {
      throw new Error("Confirmations must be a number");
    }

    if (!Number.isInteger(confirmations)) {
      throw new Error("Confirmations must be an integer");
    }

    if (confirmations < 0) {
      throw new Error("Confirmations cannot be negative");
    }

    return confirmations;
  }

  /**
   * Validates block number
   *
   * @param blockNumber - Block number to validate
   * @returns Validated block number
   * @throws Error if block number is invalid
   */
  private validateBlockNumber(blockNumber: number): number {
    if (typeof blockNumber !== "number") {
      throw new Error("Block number must be a number");
    }

    if (!Number.isInteger(blockNumber)) {
      throw new Error("Block number must be an integer");
    }

    if (blockNumber <= 0) {
      throw new Error("Block number must be positive");
    }

    return blockNumber;
  }

  /**
   * Validates gas used
   *
   * @param gasUsed - Gas used to validate
   * @returns Validated gas used
   * @throws Error if gas used is invalid
   */
  private validateGasUsed(gasUsed: string): string {
    if (!gasUsed || typeof gasUsed !== "string") {
      throw new Error("Gas used is required and must be a string");
    }

    const trimmedGasUsed = gasUsed.trim();

    if (trimmedGasUsed.length === 0) {
      throw new Error("Gas used cannot be empty");
    }

    try {
      const gasUsedBigInt = BigInt(trimmedGasUsed);
      if (gasUsedBigInt < 0n) {
        throw new Error("Gas used cannot be negative");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("negative")) {
        throw error;
      }
      throw new Error(`Invalid gas used format: ${trimmedGasUsed}`);
    }

    return trimmedGasUsed;
  }

  /**
   * Validates date value
   *
   * @param date - Date to validate (Date or ISO string)
   * @param fieldName - Field name for error messages
   * @returns Validated Date object
   * @throws Error if date is invalid
   */
  private validateDate(
    date: Date | string,
    fieldName: string
  ): Date {
    if (!date) {
      throw new Error(`${fieldName} is required`);
    }

    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ${fieldName}: invalid Date object`);
      }
      return date;
    }

    if (typeof date === "string") {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid ${fieldName}: invalid date string`);
      }
      return parsedDate;
    }

    throw new Error(`${fieldName} must be a Date object or ISO string`);
  }

  /**
   * Updates transaction status
   *
   * @param status - New transaction status
   * @throws Error if status is invalid
   */
  public updateStatus(status: TransactionStatus): void {
    this._status = this.validateStatus(status);
    // Note: In a real implementation, updatedAt would be updated here
    // but since it's readonly, it should be handled by the repository/service layer
  }

  /**
   * Increments confirmation count
   */
  public addConfirmation(): void {
    this._confirmations = this.validateConfirmations(this._confirmations + 1);
    // Note: In a real implementation, updatedAt would be updated here
    // but since it's readonly, it should be handled by the repository/service layer
  }

  /**
   * Checks if transaction is confirmed based on minimum confirmations
   *
   * @param minConfirmations - Minimum number of confirmations required
   * @returns True if transaction has at least minConfirmations confirmations
   */
  public isConfirmed(minConfirmations: number): boolean {
    if (minConfirmations < 0) {
      throw new Error("Minimum confirmations cannot be negative");
    }

    return this._confirmations >= minConfirmations;
  }

  /**
   * Validates transaction entity
   *
   * @throws Error if validation fails
   */
  public validate(): void {
    // Transaction hash validation is done in TransactionHash value object constructor
    // Network validation is done in Network value object constructor
    // Address validation is done in validateAddress method
    // Additional transaction-level validations can be added here
  }

  /**
   * Converts transaction to plain object (JSON)
   *
   * @returns Plain object representation
   */
  public toJSON(): {
    id: string;
    walletId: string;
    txHash: string;
    network: BlockchainNetwork;
    from: string;
    to: string;
    value: string;
    tokenAddress?: string;
    status: TransactionStatus;
    confirmations: number;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id,
      walletId: this.walletId,
      txHash: this.txHash.getValue(),
      network: this.network.getValue(),
      from: this.from.getValue(),
      to: this.to.getValue(),
      value: this.value,
      tokenAddress: this.tokenAddress?.getValue(),
      status: this._status,
      confirmations: this._confirmations,
      blockNumber: this._blockNumber,
      gasUsed: this._gasUsed,
      gasPrice: this._gasPrice?.getValue(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Checks if this transaction equals another transaction
   *
   * @param other - Other transaction to compare
   * @returns True if transactions are equal
   */
  public equals(other: Transaction): boolean {
    // Compare tokenAddress: both undefined or both defined and equal
    const tokenAddressEqual =
      this.tokenAddress === undefined && other.tokenAddress === undefined
        ? true
        : this.tokenAddress !== undefined && other.tokenAddress !== undefined
          ? this.tokenAddress.equals(other.tokenAddress)
          : false;

    // Compare gasPrice: both undefined or both defined and equal
    const gasPriceEqual =
      this._gasPrice === undefined && other._gasPrice === undefined
        ? true
        : this._gasPrice !== undefined && other._gasPrice !== undefined
          ? this._gasPrice.equals(other._gasPrice)
          : false;

    return (
      this.id === other.id &&
      this.walletId === other.walletId &&
      this.txHash.equals(other.txHash) &&
      this.network.equals(other.network) &&
      this.from.equals(other.from) &&
      this.to.equals(other.to) &&
      this.value === other.value &&
      tokenAddressEqual &&
      this._status === other._status &&
      this._confirmations === other._confirmations &&
      this._blockNumber === other._blockNumber &&
      this._gasUsed === other._gasUsed &&
      gasPriceEqual
    );
  }
}

