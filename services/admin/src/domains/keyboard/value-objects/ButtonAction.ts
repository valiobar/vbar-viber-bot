/**
 * ButtonAction Value Object
 *
 * Value object representing a button action with type, body, and optional configuration.
 * Encapsulates action-related validation and transformation logic.
 */

import { ActionType, OpenURLType, InternalBrowserConfig } from "../types";
import { Validators } from "../services/Validators";

/**
 * ButtonAction value object
 *
 * Represents a button action with validation based on action type.
 * Value objects are immutable and compared by value, not reference.
 */
export class ButtonAction {
  private readonly _actionType: ActionType;
  private readonly _actionBody: string;
  private readonly _openURLType?: OpenURLType;
  private readonly _internalBrowser?: InternalBrowserConfig;
  private readonly _isJson: boolean;

  /**
   * Creates a new ButtonAction value object
   *
   * @param params - Action properties
   * @throws Error if validation fails
   */
  constructor(params: {
    actionType: ActionType;
    actionBody: string;
    openURLType?: OpenURLType;
    internalBrowser?: InternalBrowserConfig;
    isJson?: boolean;
  }) {
    // Validate action type
    this._actionType = Validators.validateActionType(params.actionType);

    // Validate action body based on action type
    this._actionBody = Validators.validateActionBody(
      params.actionBody,
      this._actionType,
      params.isJson ?? false
    );

    // Validate openURLType and internalBrowser for open-url action
    if (this._actionType === "open-url") {
      this._openURLType = Validators.validateOpenURLType(params.openURLType);
      this._internalBrowser = Validators.validateInternalBrowser(
        params.internalBrowser
      );
    } else {
      // For non-open-url actions, these should be undefined
      this._openURLType = undefined;
      this._internalBrowser = undefined;
    }

    this._isJson = params.isJson ?? false;
  }

  /**
   * Gets the action type
   *
   * @returns Action type
   */
  public getActionType(): ActionType {
    return this._actionType;
  }

  /**
   * Gets the action body
   *
   * @returns Action body string
   */
  public getActionBody(): string {
    return this._actionBody;
  }

  /**
   * Gets the action body as JSON object if isJson is true
   *
   * @returns Parsed JSON object or null
   */
  public getActionBodyAsObject(): object | null {
    if (!this._isJson) {
      return null;
    }

    try {
      return JSON.parse(this._actionBody);
    } catch {
      return null;
    }
  }

  /**
   * Adds a key-value pair to the JSON action body and returns a new ButtonAction
   *
   * @param key - Key to add to the JSON object
   * @param value - Value to add to the JSON object
   * @returns New ButtonAction instance with updated JSON
   * @throws Error if isJson is false or if ActionBody is not valid JSON
   */
  public withJsonProperty(key: string, value: any): ButtonAction {
    if (!this._isJson) {
      throw new Error(
        "Cannot add JSON property: ActionBody is not JSON (isJson is false)"
      );
    }

    // Parse current JSON
    let jsonObject: any;
    try {
      jsonObject = JSON.parse(this._actionBody);
    } catch (error) {
      throw new Error(
        `Cannot add JSON property: ActionBody is not valid JSON: ${error}`
      );
    }

    // Ensure it's an object
    if (
      typeof jsonObject !== "object" ||
      jsonObject === null ||
      Array.isArray(jsonObject)
    ) {
      throw new Error(
        "Cannot add JSON property: ActionBody must be a JSON object"
      );
    }

    // Add the key-value pair
    jsonObject[key] = value;

    // Create new ActionBody with updated JSON
    const updatedActionBody = JSON.stringify(jsonObject);

    // Return new ButtonAction instance with updated ActionBody
    return new ButtonAction({
      actionType: this._actionType,
      actionBody: updatedActionBody,
      openURLType: this._openURLType,
      internalBrowser: this._internalBrowser,
      isJson: true,
    });
  }

  /**
   * Gets the open URL type (only for open-url action)
   *
   * @returns Open URL type or undefined
   */
  public getOpenURLType(): OpenURLType | undefined {
    return this._openURLType;
  }

  /**
   * Gets the internal browser configuration (only for open-url action)
   *
   * @returns Internal browser config or undefined
   */
  public getInternalBrowser(): InternalBrowserConfig | undefined {
    return this._internalBrowser;
  }

  /**
   * Checks if action body is JSON
   *
   * @returns True if action body is JSON
   */
  public isJson(): boolean {
    return this._isJson;
  }

  /**
   * Gets action in Viber API format
   *
   * @returns Action object for Viber API
   */
  public getForViberApi(): object {
    const action: any = {
      ActionType: this._actionType,
      ActionBody: this._actionBody,
    };

    // Add open-url specific fields
    if (this._actionType === "open-url") {
      if (this._openURLType) {
        action.OpenURLType = this._openURLType;
      }
      if (this._internalBrowser) {
        action.InternalBrowser = this._internalBrowser;
      }
    }

    return action;
  }

  /**
   * Checks if this ButtonAction equals another ButtonAction (value equality)
   *
   * @param other - Other ButtonAction to compare
   * @returns True if actions are equal by value
   */
  public equals(other: ButtonAction): boolean {
    if (!other) {
      return false;
    }

    // Compare all properties
    if (this._actionType !== other._actionType) {
      return false;
    }

    if (this._actionBody !== other._actionBody) {
      return false;
    }

    if (this._isJson !== other._isJson) {
      return false;
    }

    // Compare open-url specific fields
    if (this._actionType === "open-url") {
      if (this._openURLType !== other._openURLType) {
        return false;
      }

      if (this._internalBrowser?.Mode !== other._internalBrowser?.Mode) {
        return false;
      }
    }

    return true;
  }

  /**
   * Creates a ButtonAction from raw data
   *
   * @param data - Raw action data
   * @returns ButtonAction value object
   */
  public static fromData(data: {
    ActionType: ActionType;
    ActionBody: string;
    OpenURLType?: OpenURLType;
    InternalBrowser?: InternalBrowserConfig;
    isJson?: boolean;
  }): ButtonAction {
    return new ButtonAction({
      actionType: data.ActionType,
      actionBody: data.ActionBody,
      openURLType: data.OpenURLType,
      internalBrowser: data.InternalBrowser,
      isJson: data.isJson,
    });
  }
}
