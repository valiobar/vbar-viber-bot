/**
 * Keyboard Domain Entity
 *
 * Domain entity representing a Keyboard in the Admin Service.
 * Keyboards are interactive button layouts for user interactions.
 * This entity includes validation and business logic for keyboard properties.
 */

import { Button } from "./Button";
import { InputFieldState } from "./types";
import { Validators } from "./lib/Validators";

/**
 * Keyboard domain entity
 *
 * Represents a keyboard with button layouts and configuration options.
 * Keyboards are stored in Viber API-compatible format for the Viber Service to use.
 */
export class Keyboard {
  public readonly id: string;
  public readonly type: "keyboard";
  public readonly Buttons: Button[];
  public readonly DefaultHeight: boolean;
  public readonly InputFieldState: InputFieldState;
  public readonly BgColor: string | null;
  public readonly hidden: boolean;
  public readonly humanReadableName: string;
  public readonly title: string | null;
  public readonly isBroadcast: boolean;
  public readonly isTemplate: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Creates a new Keyboard domain entity
   *
   * @param params - Keyboard properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    type: string;
    Buttons: Button[];
    DefaultHeight?: boolean;
    InputFieldState?: InputFieldState;
    BgColor?: string | null;
    hidden?: boolean;
    humanReadableName: string;
    title?: string | null;
    isBroadcast?: boolean;
    isTemplate?: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.type = Validators.validateKeyboardType(params.type);
    this.Buttons = Validators.validateButtons(params.Buttons);
    this.DefaultHeight = params.DefaultHeight ?? false;
    this.InputFieldState = Validators.validateInputFieldState(
      params.InputFieldState
    );
    this.BgColor = Validators.validateBgColor(params.BgColor);
    this.hidden = params.hidden ?? false;
    this.humanReadableName = Validators.validateHumanReadableName(
      params.humanReadableName
    );
    this.title = Validators.validateTitle(params.title);
    this.isBroadcast = params.isBroadcast ?? false;
    this.isTemplate = params.isTemplate ?? false;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;

    // Validate button layout after all properties are set
    Validators.validateButtonLayout(this.Buttons);
  }

  /**
   * Checks if keyboard is hidden
   *
   * @returns True if keyboard is hidden
   */
  public isHidden(): boolean {
    return this.hidden;
  }

  /**
   * Calculates total columns used by all buttons
   *
   * @returns Total columns
   */
  public getTotalColumns(): number {
    // Simple calculation: sum of all button columns
    // Note: This is a simplified calculation. In reality, layout depends on positioning
    return this.Buttons.reduce((sum, button) => sum + button.Columns, 0);
  }

  /**
   * Gets keyboard in Viber API format
   *
   * @returns Keyboard object for Viber API
   */
  public getForViberApi(): object {
    const keyboard: any = {
      Type: this.type,
      Buttons: this.Buttons.map((button) => button.getForViberApi()),
      DefaultHeight: this.DefaultHeight,
      InputFieldState: this.InputFieldState,
    };

    // Add optional fields
    if (this.BgColor !== null) {
      keyboard.BgColor = this.BgColor;
    }

    return keyboard;
  }

  /**
   * Creates a Keyboard entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns Keyboard domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id: string | { toString(): string };
    type: string;
    Buttons: any[];
    DefaultHeight?: boolean;
    InputFieldState?: InputFieldState;
    BgColor?: string | null;
    hidden?: boolean;
    humanReadableName: string;
    title?: string | null;
    isBroadcast?: boolean;
    isTemplate?: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
  }): Keyboard {
    // Convert ObjectId to string if needed
    const id = typeof doc._id === "string" ? doc._id : doc._id.toString();

    // Convert dates to ISO strings
    const createdAt =
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt;
    const updatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt;

    // Convert button documents to Button entities
    const buttons = doc.Buttons.map((buttonDoc) =>
      Button.fromDatabaseDocument(buttonDoc)
    );

    return new Keyboard({
      id,
      type: doc.type,
      Buttons: buttons,
      DefaultHeight: doc.DefaultHeight,
      InputFieldState: doc.InputFieldState,
      BgColor: doc.BgColor,
      hidden: doc.hidden,
      humanReadableName: doc.humanReadableName,
      title: doc.title,
      isBroadcast: doc.isBroadcast,
      isTemplate: doc.isTemplate,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Creates a new Keyboard entity
   *
   * @param params - Keyboard creation parameters
   * @returns New Keyboard domain entity
   */
  public static create(params: {
    Buttons: Button[];
    DefaultHeight?: boolean;
    InputFieldState?: InputFieldState;
    BgColor?: string | null;
    hidden?: boolean;
    humanReadableName: string;
    title?: string | null;
    isBroadcast?: boolean;
    isTemplate?: boolean;
  }): Keyboard {
    const now = new Date().toISOString();

    // Generate a temporary ID (will be replaced by repository)
    const tempId = `temp-${Date.now()}`;

    return new Keyboard({
      id: tempId,
      type: "keyboard",
      Buttons: params.Buttons,
      DefaultHeight: params.DefaultHeight,
      InputFieldState: params.InputFieldState,
      BgColor: params.BgColor,
      hidden: params.hidden,
      humanReadableName: params.humanReadableName,
      title: params.title,
      isBroadcast: params.isBroadcast,
      isTemplate: params.isTemplate,
      createdAt: now,
      updatedAt: now,
    });
  }
}
