/**
 * Button DTO (Data Transfer Object)
 *
 * DTO representing a Button for API requests and responses.
 * This is a plain data structure used to transfer button data
 * between the application layer and external interfaces (API routes).
 */

import { Button } from "../../entities/Button";
import {
  ActionType,
  TextSize,
  TextVAlign,
  TextHAlign,
  BgMediaType,
  OpenURLType,
  InternalBrowserConfig,
} from "../../types";
import type { ButtonDTO as SharedButtonDTO } from "@vbar/shared";

/**
 * Button DTO (Data Transfer Object)
 *
 * Plain data structure matching Button entity properties
 * but without business logic or methods.
 * Provides static methods for converting between Button entities and DTOs.
 * Implements the shared ButtonDTO interface for cross-service compatibility.
 */
export class ButtonDTO implements SharedButtonDTO {
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

  private constructor(data: {
    id: string;
    Columns: number;
    Rows: number;
    Text: string;
    TextColor: string;
    BgColor: string | null;
    BgMedia: string | null;
    BgMediaType: BgMediaType;
    BgMediaScaleType: string;
    BgLoop: boolean;
    ActionType: ActionType;
    ActionBody: string;
    OpenURLType: OpenURLType;
    InternalBrowser: InternalBrowserConfig;
    TextVAlign: TextVAlign;
    TextHAlign: TextHAlign;
    TextSize: TextSize;
    Silent: boolean;
    isJson: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.Columns = data.Columns;
    this.Rows = data.Rows;
    this.Text = data.Text;
    this.TextColor = data.TextColor;
    this.BgColor = data.BgColor;
    this.BgMedia = data.BgMedia;
    this.BgMediaType = data.BgMediaType;
    this.BgMediaScaleType = data.BgMediaScaleType;
    this.BgLoop = data.BgLoop;
    this.ActionType = data.ActionType;
    this.ActionBody = data.ActionBody;
    this.OpenURLType = data.OpenURLType;
    this.InternalBrowser = data.InternalBrowser;
    this.TextVAlign = data.TextVAlign;
    this.TextHAlign = data.TextHAlign;
    this.TextSize = data.TextSize;
    this.Silent = data.Silent;
    this.isJson = data.isJson;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Converts a Button entity to ButtonDTO
   *
   * @param button - Button domain entity
   * @returns ButtonDTO
   */
  public static fromEntity(button: Button): ButtonDTO {
    return new ButtonDTO({
      id: button.id,
      Columns: button.Columns,
      Rows: button.Rows,
      Text: button.Text,
      TextColor: button.TextColor,
      BgColor: button.BgColor,
      BgMedia: button.BgMedia,
      BgMediaType: button.BgMediaType,
      BgMediaScaleType: button.BgMediaScaleType,
      BgLoop: button.BgLoop,
      ActionType: button.ActionType,
      ActionBody: button.ActionBody,
      OpenURLType: button.OpenURLType,
      InternalBrowser: button.InternalBrowser,
      TextVAlign: button.TextVAlign,
      TextHAlign: button.TextHAlign,
      TextSize: button.TextSize,
      Silent: button.Silent,
      isJson: button.isJson,
      createdAt: button.createdAt,
      updatedAt: button.updatedAt,
    });
  }

  /**
   * Converts a ButtonDTO to Button entity
   *
   * Used when updating existing buttons from API requests.
   * Note: This creates a new entity instance, which will trigger validation.
   *
   * @param dto - ButtonDTO
   * @returns Button domain entity
   */
  public static toEntity(dto: ButtonDTO): Button {
    return new Button({
      id: dto.id,
      Columns: dto.Columns,
      Rows: dto.Rows,
      Text: dto.Text,
      TextColor: dto.TextColor,
      BgColor: dto.BgColor,
      BgMedia: dto.BgMedia,
      BgMediaType: dto.BgMediaType,
      BgMediaScaleType: dto.BgMediaScaleType,
      BgLoop: dto.BgLoop,
      ActionType: dto.ActionType,
      ActionBody: dto.ActionBody,
      OpenURLType: dto.OpenURLType,
      InternalBrowser: dto.InternalBrowser,
      TextVAlign: dto.TextVAlign,
      TextHAlign: dto.TextHAlign,
      TextSize: dto.TextSize,
      Silent: dto.Silent,
      isJson: dto.isJson,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
