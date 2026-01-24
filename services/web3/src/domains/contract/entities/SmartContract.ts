/**
 * Smart Contract Domain Entity
 *
 * Domain entity representing a Smart Contract in the Web3 Service.
 * This entity includes validation and business logic for smart contract operations.
 */

import type { BlockchainNetwork } from "@vbar/shared";
import { Network } from "../../shared/value-objects/Network";
import { ContractAddress } from "../value-objects/ContractAddress";
import { ABI, type ABIItem } from "../value-objects/ABI";

/**
 * Smart Contract domain entity
 *
 * Represents a smart contract with address, network, and ABI information.
 * Includes validation and business logic for contract operations.
 */
export class SmartContract {
  public readonly id: string;
  public readonly address: ContractAddress;
  public readonly network: Network;
  public readonly abi: ABI;
  public readonly name?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  /**
   * Creates a new SmartContract domain entity
   *
   * @param params - Smart contract properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    address: string | ContractAddress;
    network: BlockchainNetwork | Network | string;
    abi: any[] | ABIItem[] | ABI;
    name?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
  }) {
    // Validate and set properties
    this.id = this.validateId(params.id);
    this.address =
      params.address instanceof ContractAddress
        ? params.address
        : new ContractAddress(params.address);
    this.network =
      params.network instanceof Network
        ? params.network
        : new Network(params.network);
    this.abi =
      params.abi instanceof ABI ? params.abi : new ABI(params.abi);
    this.name = params.name ? this.validateName(params.name) : undefined;
    this.createdAt = this.validateDate(params.createdAt, "createdAt");
    this.updatedAt = this.validateDate(params.updatedAt, "updatedAt");
  }

  /**
   * Validates contract ID
   *
   * @param id - ID to validate
   * @returns Validated ID
   * @throws Error if ID is invalid
   */
  private validateId(id: string): string {
    if (!id || typeof id !== "string") {
      throw new Error("Contract ID is required and must be a string");
    }

    const trimmedId = id.trim();

    if (trimmedId.length === 0) {
      throw new Error("Contract ID cannot be empty");
    }

    return trimmedId;
  }

  /**
   * Validates contract name
   *
   * @param name - Name to validate
   * @returns Validated name
   * @throws Error if name is invalid
   */
  private validateName(name: string): string {
    if (typeof name !== "string") {
      throw new Error("Contract name must be a string");
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      throw new Error("Contract name cannot be empty");
    }

    return trimmedName;
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
   * Validates ABI format
   *
   * @param abi - ABI to validate
   * @returns True if ABI is valid
   */
  public validateABI(abi: any[]): boolean {
    return ABI.isValid(abi);
  }

  /**
   * Gets a function from the ABI by name
   *
   * @param functionName - Name of the function to get
   * @returns ABI item for the function, or undefined if not found
   */
  public getFunction(functionName: string): ABIItem | undefined {
    return this.abi.getFunction(functionName);
  }

  /**
   * Gets an event from the ABI by name
   *
   * @param eventName - Name of the event to get
   * @returns ABI item for the event, or undefined if not found
   */
  public getEvent(eventName: string): ABIItem | undefined {
    return this.abi.getEvent(eventName);
  }

  /**
   * Validates smart contract
   *
   * @throws Error if validation fails
   */
  public validate(): void {
    // Address validation is done in ContractAddress value object constructor
    // Network validation is done in Network value object constructor
    // ABI validation is done in ABI value object constructor
    // Additional contract-level validations can be added here
  }

  /**
   * Converts smart contract to plain object (JSON)
   *
   * @returns Plain object representation
   */
  public toJSON(): {
    id: string;
    address: string;
    network: BlockchainNetwork;
    abi: ABIItem[];
    name?: string;
    createdAt: string;
    updatedAt: string;
  } {
    return {
      id: this.id,
      address: this.address.getValue(),
      network: this.network.getValue(),
      abi: this.abi.getValue(),
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Checks if this smart contract equals another smart contract
   *
   * @param other - Other smart contract to compare
   * @returns True if smart contracts are equal
   */
  public equals(other: SmartContract): boolean {
    return (
      this.id === other.id &&
      this.address.equals(other.address) &&
      this.network.equals(other.network) &&
      this.abi.equals(other.abi) &&
      this.name === other.name
    );
  }
}

