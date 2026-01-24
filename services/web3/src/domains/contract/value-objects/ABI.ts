/**
 * ABI Value Object
 *
 * Represents a Contract Application Binary Interface (ABI) with validation.
 * This is a value object that encapsulates ABI JSON structure validation.
 * 
 * ABI is a JSON array that describes the interface of a smart contract,
 * including functions, events, and their parameters.
 */

/**
 * ABI item type definitions
 */
export type ABIItemType = "function" | "event" | "constructor" | "fallback" | "receive";

/**
 * ABI item interface
 */
export interface ABIItem {
  type: ABIItemType;
  name?: string;
  inputs?: ABIParameter[];
  outputs?: ABIParameter[];
  stateMutability?: "pure" | "view" | "nonpayable" | "payable";
  anonymous?: boolean;
}

/**
 * ABI parameter interface
 */
export interface ABIParameter {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
  components?: ABIParameter[];
}

/**
 * ABI value object
 *
 * Encapsulates Contract Application Binary Interface (ABI) with validation.
 * Value objects are immutable and compared by value, not reference.
 * 
 * ABI is a JSON array that describes the interface of a smart contract.
 */
export class ABI {
  private readonly _value: ABIItem[];

  /**
   * Creates a new ABI value object
   *
   * @param abi - Contract ABI JSON array
   * @throws Error if ABI is invalid
   */
  constructor(abi: any[] | ABIItem[]) {
    this._value = this.validateABI(abi);
  }

  /**
   * Validates ABI format
   *
   * Validates that the ABI is a valid JSON array containing
   * valid ABI items with required properties.
   *
   * @param abi - ABI to validate
   * @returns Validated ABI array
   * @throws Error if ABI is invalid
   */
  private validateABI(abi: any[]): ABIItem[] {
    if (!Array.isArray(abi)) {
      throw new Error("ABI must be an array");
    }

    if (abi.length === 0) {
      throw new Error("ABI cannot be empty");
    }

    return abi.map((item, index) => {
      if (!item || typeof item !== "object") {
        throw new Error(`ABI item at index ${index} must be an object`);
      }

      if (!item.type || typeof item.type !== "string") {
        throw new Error(`ABI item at index ${index} must have a type property`);
      }

      const validTypes: ABIItemType[] = [
        "function",
        "event",
        "constructor",
        "fallback",
        "receive",
      ];

      if (!validTypes.includes(item.type as ABIItemType)) {
        throw new Error(
          `ABI item at index ${index} has invalid type: ${item.type}. Valid types: ${validTypes.join(", ")}`
        );
      }

      // Validate inputs if present
      if (item.inputs !== undefined) {
        if (!Array.isArray(item.inputs)) {
          throw new Error(
            `ABI item at index ${index} inputs must be an array`
          );
        }
        this.validateParameters(item.inputs, `ABI item at index ${index} inputs`);
      }

      // Validate outputs if present
      if (item.outputs !== undefined) {
        if (!Array.isArray(item.outputs)) {
          throw new Error(
            `ABI item at index ${index} outputs must be an array`
          );
        }
        this.validateParameters(item.outputs, `ABI item at index ${index} outputs`);
      }

      // Validate stateMutability if present
      if (item.stateMutability !== undefined) {
        const validStateMutabilities = ["pure", "view", "nonpayable", "payable"];
        if (!validStateMutabilities.includes(item.stateMutability)) {
          throw new Error(
            `ABI item at index ${index} has invalid stateMutability: ${item.stateMutability}`
          );
        }
      }

      return item as ABIItem;
    });
  }

  /**
   * Validates ABI parameters
   *
   * @param parameters - Parameters to validate
   * @param context - Context for error messages
   * @throws Error if parameters are invalid
   */
  private validateParameters(
    parameters: any[],
    context: string
  ): void {
    parameters.forEach((param, index) => {
      if (!param || typeof param !== "object") {
        throw new Error(`${context}[${index}] must be an object`);
      }

      if (!param.name || typeof param.name !== "string") {
        throw new Error(`${context}[${index}] must have a name property`);
      }

      if (!param.type || typeof param.type !== "string") {
        throw new Error(`${context}[${index}] must have a type property`);
      }
    });
  }

  /**
   * Gets the ABI value
   *
   * @returns ABI array
   */
  public getValue(): ABIItem[] {
    return this._value;
  }

  /**
   * Gets a function from the ABI by name
   *
   * @param functionName - Name of the function to get
   * @returns ABI item for the function, or undefined if not found
   */
  public getFunction(functionName: string): ABIItem | undefined {
    return this._value.find(
      (item) => item.type === "function" && item.name === functionName
    );
  }

  /**
   * Gets an event from the ABI by name
   *
   * @param eventName - Name of the event to get
   * @returns ABI item for the event, or undefined if not found
   */
  public getEvent(eventName: string): ABIItem | undefined {
    return this._value.find(
      (item) => item.type === "event" && item.name === eventName
    );
  }

  /**
   * Gets all functions from the ABI
   *
   * @returns Array of function ABI items
   */
  public getFunctions(): ABIItem[] {
    return this._value.filter((item) => item.type === "function");
  }

  /**
   * Gets all events from the ABI
   *
   * @returns Array of event ABI items
   */
  public getEvents(): ABIItem[] {
    return this._value.filter((item) => item.type === "event");
  }

  /**
   * Gets function signature (for function calls)
   *
   * @param functionName - Name of the function
   * @returns Function signature string (e.g., "transfer(address,uint256)")
   * @throws Error if function is not found
   */
  public getFunctionSignature(functionName: string): string {
    const func = this.getFunction(functionName);
    if (!func) {
      throw new Error(`Function ${functionName} not found in ABI`);
    }

    if (!func.inputs || func.inputs.length === 0) {
      return `${functionName}()`;
    }

    const paramTypes = func.inputs.map((input) => input.type).join(",");
    return `${functionName}(${paramTypes})`;
  }

  /**
   * Gets event signature (for event filtering)
   *
   * @param eventName - Name of the event
   * @returns Event signature string (e.g., "Transfer(address,address,uint256)")
   * @throws Error if event is not found
   */
  public getEventSignature(eventName: string): string {
    const event = this.getEvent(eventName);
    if (!event) {
      throw new Error(`Event ${eventName} not found in ABI`);
    }

    if (!event.inputs || event.inputs.length === 0) {
      return `${eventName}()`;
    }

    const paramTypes = event.inputs.map((input) => input.type).join(",");
    return `${eventName}(${paramTypes})`;
  }

  /**
   * Checks if this ABI equals another ABI
   *
   * @param other - Other ABI to compare
   * @returns True if ABIs are equal (deep comparison)
   */
  public equals(other: ABI): boolean {
    if (this._value.length !== other._value.length) {
      return false;
    }

    return JSON.stringify(this._value) === JSON.stringify(other._value);
  }

  /**
   * Converts ABI to JSON string
   *
   * @returns ABI as JSON string
   */
  public toJSON(): string {
    return JSON.stringify(this._value);
  }

  /**
   * Validates an ABI format (static utility)
   *
   * @param abi - ABI to validate
   * @returns True if ABI is valid
   */
  public static isValid(abi: any): boolean {
    try {
      if (!Array.isArray(abi)) {
        return false;
      }

      if (abi.length === 0) {
        return false;
      }

      // Try to create an ABI instance - if it throws, it's invalid
      new ABI(abi);
      return true;
    } catch {
      return false;
    }
  }
}

