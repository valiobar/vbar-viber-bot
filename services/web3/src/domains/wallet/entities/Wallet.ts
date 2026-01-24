/**
 * Wallet Domain Entity
 *
 * Domain entity representing a Wallet in the Web3 Service.
 * This entity includes validation and business logic for wallet addresses.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import { Address } from "../../shared/value-objects/Address";
import { Network } from "../../shared/value-objects/Network";

/**
 * Wallet domain entity
 *
 * Represents a wallet with blockchain address and network information.
 * Includes validation and business logic for wallet operations.
 */
export class Wallet {
  public readonly id: string;
  public readonly viberUserId: string;
  public readonly address: Address;
  public readonly network: Network;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  /**
   * Creates a new Wallet domain entity
   *
   * @param params - Wallet properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    viberUserId: string;
    address: string | Address;
    network: BlockchainNetwork | Network | string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }) {
    // Validate and set properties
    this.id = this.validateId(params.id);
    this.viberUserId = this.validateViberUserId(params.viberUserId);
    this.address =
      params.address instanceof Address
        ? params.address
        : new Address(params.address);
    this.network =
      params.network instanceof Network
        ? params.network
        : new Network(params.network);
    this.createdAt = this.validateDate(params.createdAt, "createdAt");
    this.updatedAt = this.validateDate(params.updatedAt, "updatedAt");
  }

  /**
   * Validates wallet ID
   *
   * @param id - ID to validate
   * @returns Validated ID
   * @throws Error if ID is invalid
   */
  private validateId(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("Wallet ID is required and must be a string");
    }

    const trimmedId = id.trim();

    if (trimmedId.length === 0) {
      throw new Error("Wallet ID cannot be empty");
    }

    return trimmedId;
  }

  /**
   * Validates Viber user ID
   *
   * @param viberUserId - Viber user ID to validate
   * @returns Validated Viber user ID
   * @throws Error if Viber user ID is invalid
   */
  private validateViberUserId(viberUserId: string): string {
    if (!viberUserId || typeof viberUserId !== "string") {
      throw new Error("Viber user ID is required and must be a string");
    }

    const trimmedUserId = viberUserId.trim();

    if (trimmedUserId.length === 0) {
      throw new Error("Viber user ID cannot be empty");
    }

    return trimmedUserId;
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
   * Validates wallet address format
   *
   * @throws Error if address is invalid
   */
  public validate(): void {
    // Address validation is done in Address value object constructor
    // Network validation is done in Network value object constructor
    // Additional wallet-level validations can be added here
  }

  /**
   * Converts wallet to plain object (JSON)
   *
   * @returns Plain object representation
   */
  public toJSON(): {
    id: string;
    viberUserId: string;
    address: string;
    network: BlockchainNetwork;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id,
      viberUserId: this.viberUserId,
      address: this.address.getValue(),
      network: this.network.getValue(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Checks if this wallet equals another wallet
   *
   * @param other - Other wallet to compare
   * @returns True if wallets are equal
   */
  public equals(other: Wallet): boolean {
    return (
      this.id === other.id &&
      this.viberUserId === other.viberUserId &&
      this.address.equals(other.address) &&
      this.network.equals(other.network)
    );
  }
}

