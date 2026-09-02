/**
 * Button Domain Entity
 *
 * Domain entity representing a Button in the Admin Service.
 * Buttons are interactive elements that can be part of Keyboards or Carousels.
 * This entity includes validation and business logic for button properties.
 */

import {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserMode,
  InternalBrowserConfig,
} from "./types";
import { Validators } from "./lib/Validators";

/**
 * Button domain entity
 *
 * Represents an interactive button with various action types and styling options.
 * Buttons are stored in Viber API-compatible format for the Viber Service to use.
 */
export class Button {
  public readonly id: string;
  public readonly Columns: number;
  public readonly Rows: number;
  public readonly Text: string;
  public readonly TextColor: string;
  public readonly BgColor: string | null;
  public readonly BgMedia: string | null;
  public readonly BgMediaType: BgMediaType;
  public readonly BgMediaScaleType: string;
  public readonly BgLoop: boolean;
  public readonly ActionType: ActionType;
  public readonly ActionBody: string;
  public readonly OpenURLType: OpenURLType;
  public readonly InternalBrowser: InternalBrowserConfig;
  public readonly TextVAlign: TextVAlign;
  public readonly TextHAlign: TextHAlign;
  public readonly TextSize: TextSize;
  public readonly Silent: boolean;
  public readonly isJson: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  /**
   * Creates a new Button domain entity
   *
   * @param params - Button properties
   * @throws Error if validation fails
   */
  constructor(params: {
    id: string;
    Columns: number;
    Rows: number;
    Text: string;
    TextColor: string;
    BgColor?: string | null;
    BgMedia?: string | null;
    BgMediaType?: BgMediaType;
    BgMediaScaleType?: string;
    BgLoop?: boolean;
    ActionType: ActionType;
    ActionBody: string;
    OpenURLType?: OpenURLType;
    InternalBrowser?: InternalBrowserConfig;
    TextVAlign?: TextVAlign;
    TextHAlign?: TextHAlign;
    TextSize?: TextSize;
    Silent?: boolean;
    isJson?: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    // Validate and set properties
    this.id = params.id;
    this.Columns = Validators.validateColumns(params.Columns);
    this.Rows = Validators.validateRows(params.Rows);
    this.Text = Validators.validateText(params.Text);
    this.TextColor = Validators.validateTextColor(params.TextColor);
    this.BgColor = Validators.validateBgColor(params.BgColor);
    this.BgMedia = Validators.validateBgMedia(params.BgMedia);
    this.BgMediaType = Validators.validateBgMediaType(params.BgMediaType);
    this.BgMediaScaleType = params.BgMediaScaleType || "fit";
    this.BgLoop = params.BgLoop ?? true;
    this.ActionType = Validators.validateActionType(params.ActionType);
    this.ActionBody = Validators.validateActionBody(
      params.ActionBody,
      params.ActionType,
      params.isJson ?? false
    );
    this.OpenURLType = Validators.validateOpenURLType(params.OpenURLType);
    this.InternalBrowser = Validators.validateInternalBrowser(
      params.InternalBrowser
    );
    this.TextVAlign = Validators.validateTextAlignment(
      params.TextVAlign,
      "vertical"
    ) as TextVAlign;
    this.TextHAlign = Validators.validateTextAlignment(
      params.TextHAlign,
      "horizontal"
    ) as TextHAlign;
    this.TextSize = Validators.validateTextSize(params.TextSize);
    this.Silent = params.Silent ?? true;
    this.isJson = params.isJson ?? false;
    this.createdAt = params.createdAt;
    this.updatedAt = params.updatedAt;

    // Business rule: If BgMediaType is 'picture', BgColor should be removed or set to default
    if (this.BgMediaType === "picture" && this.BgColor !== null) {
      // Note: This is a Viber API requirement, but we'll keep BgColor in the entity
      // and handle it during transformation to Viber API format
    }
  }

  /**
   * Formats text with font tag and TextColor if not already formatted
   *
   * @returns Formatted text
   */
  public formatText(): string {
    // If text already contains font tag, return as is
    if (this.Text.includes("<font")) {
      return this.Text;
    }

    // Wrap text in font tag with TextColor
    return `<font color="${this.TextColor}">${this.Text}</font>`;
  }

  /**
   * Gets action body as JSON object if isJson is true
   *
   * @returns Parsed JSON object or null
   */
  public getActionBodyAsJson(): object | null {
    if (!this.isJson) {
      return null;
    }

    try {
      return JSON.parse(this.ActionBody);
    } catch {
      return null;
    }
  }

  /**
   * Gets button in Viber API format
   *
   * @returns Button object for Viber API
   */
  public getForViberApi(): object {
    const button: any = {
      Columns: this.Columns,
      Rows: this.Rows,
      Text: this.formatText(),
      TextColor: this.TextColor,
      ActionType: this.ActionType,
      ActionBody: this.ActionBody,
      TextVAlign: this.TextVAlign,
      TextHAlign: this.TextHAlign,
      TextSize: this.TextSize,
      Silent: this.Silent,
    };

    // Add optional fields
    if (this.BgColor !== null) {
      // Note: BgColor should be removed if BgMediaType is 'picture' (Viber API requirement)
      if (this.BgMediaType !== "picture") {
        button.BgColor = this.BgColor;
      }
    }

    if (this.BgMedia !== null) {
      button.BgMedia = this.BgMedia;
      button.BgMediaType = this.BgMediaType;
      button.BgMediaScaleType = this.BgMediaScaleType;
      button.BgLoop = this.BgLoop;
    }

    if (this.ActionType === "open-url") {
      button.OpenURLType = this.OpenURLType;
      button.InternalBrowser = this.InternalBrowser;
    }

    return button;
  }

  /**
   * Creates a Button entity from database document
   *
   * @param doc - Database document (MongoDB document with _id)
   * @returns Button domain entity
   */
  public static fromDatabaseDocument(doc: {
    _id?: string | { toString(): string };
    id?: string;
    Columns: number;
    Rows: number;
    Text: string;
    TextColor: string;
    BgColor?: string | null;
    BgMedia?: string | null;
    BgMediaType?: BgMediaType;
    BgMediaScaleType?: string;
    BgLoop?: boolean;
    ActionType: ActionType;
    ActionBody: string;
    OpenURLType?: OpenURLType;
    InternalBrowser?: InternalBrowserConfig;
    TextVAlign?: TextVAlign;
    TextHAlign?: TextHAlign;
    TextSize?: TextSize;
    Silent?: boolean;
    isJson?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
  }): Button {
    // Convert ObjectId to string if needed
    const id =
      doc.id ||
      (doc._id
        ? typeof doc._id === "string"
          ? doc._id
          : doc._id.toString()
        : `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    // Convert dates to ISO strings
    const createdAt =
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : doc.createdAt || new Date().toISOString();
    const updatedAt =
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : doc.updatedAt || new Date().toISOString();

    return new Button({
      id,
      Columns: doc.Columns,
      Rows: doc.Rows,
      Text: doc.Text,
      TextColor: doc.TextColor,
      BgColor: doc.BgColor,
      BgMedia: doc.BgMedia,
      BgMediaType: doc.BgMediaType,
      BgMediaScaleType: doc.BgMediaScaleType,
      BgLoop: doc.BgLoop,
      ActionType: doc.ActionType,
      ActionBody: doc.ActionBody,
      OpenURLType: doc.OpenURLType,
      InternalBrowser: doc.InternalBrowser,
      TextVAlign: doc.TextVAlign,
      TextHAlign: doc.TextHAlign,
      TextSize: doc.TextSize,
      Silent: doc.Silent,
      isJson: doc.isJson,
      createdAt,
      updatedAt,
    });
  }

  /**
   * Creates a new Button entity
   *
   * @param params - Button creation parameters
   * @returns New Button domain entity
   */
  public static create(params: {
    Columns: number;
    Rows: number;
    Text: string;
    TextColor: string;
    BgColor?: string | null;
    BgMedia?: string | null;
    BgMediaType?: BgMediaType;
    BgMediaScaleType?: string;
    BgLoop?: boolean;
    ActionType: ActionType;
    ActionBody: string;
    OpenURLType?: OpenURLType;
    InternalBrowser?: InternalBrowserConfig;
    TextVAlign?: TextVAlign;
    TextHAlign?: TextHAlign;
    TextSize?: TextSize;
    Silent?: boolean;
    isJson?: boolean;
  }): Button {
    const now = new Date().toISOString();

    // Generate a temporary ID (will be replaced by repository)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return new Button({
      id: tempId,
      Columns: params.Columns,
      Rows: params.Rows,
      Text: params.Text,
      TextColor: params.TextColor,
      BgColor: params.BgColor,
      BgMedia: params.BgMedia,
      BgMediaType: params.BgMediaType,
      BgMediaScaleType: params.BgMediaScaleType,
      BgLoop: params.BgLoop,
      ActionType: params.ActionType,
      ActionBody: params.ActionBody,
      OpenURLType: params.OpenURLType,
      InternalBrowser: params.InternalBrowser,
      TextVAlign: params.TextVAlign,
      TextHAlign: params.TextHAlign,
      TextSize: params.TextSize,
      Silent: params.Silent,
      isJson: params.isJson,
      createdAt: now,
      updatedAt: now,
    });
  }
}
