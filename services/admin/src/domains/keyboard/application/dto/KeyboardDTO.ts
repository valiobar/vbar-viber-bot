/**
 * Keyboard DTO (Data Transfer Object)
 *
 * DTO representing a Keyboard for API requests and responses.
 * This is a plain data structure used to transfer keyboard data
 * between the application layer and external interfaces (API routes).
 */

import { Keyboard } from "../../entities/Keyboard";
import { ButtonDTO } from "./ButtonDTO";
import { InputFieldState } from "../../types";
import type { KeyboardDTO as SharedKeyboardDTO } from "@vbar/shared";

/**
 * Keyboard DTO (Data Transfer Object)
 *
 * Plain data structure matching Keyboard entity properties
 * but without business logic or methods.
 * Buttons are represented as ButtonDTO[] instead of Button entities.
 * Provides static methods for converting between Keyboard entities and DTOs.
 * Implements the shared KeyboardDTO interface for cross-service compatibility.
 */
export class KeyboardDTO implements SharedKeyboardDTO {
  public readonly id: string;
  public readonly type: "keyboard";
  public readonly Buttons: ButtonDTO[];
  public readonly DefaultHeight: boolean;
  public readonly InputFieldState: InputFieldState;
  public readonly BgColor: string | null;
  public readonly hidden: boolean;
  public readonly humanReadableName: string;
  public readonly title: string | null;
  public readonly isBroadcast: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  private constructor(data: {
    id: string;
    type: "keyboard";
    Buttons: ButtonDTO[];
    DefaultHeight: boolean;
    InputFieldState: InputFieldState;
    BgColor: string | null;
    hidden: boolean;
    humanReadableName: string;
    title: string | null;
    isBroadcast: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.type = data.type;
    this.Buttons = data.Buttons;
    this.DefaultHeight = data.DefaultHeight;
    this.InputFieldState = data.InputFieldState;
    this.BgColor = data.BgColor;
    this.hidden = data.hidden;
    this.humanReadableName = data.humanReadableName;
    this.title = data.title;
    this.isBroadcast = data.isBroadcast;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Converts a Keyboard entity to KeyboardDTO
   *
   * @param keyboard - Keyboard domain entity
   * @returns KeyboardDTO
   */
  public static fromEntity(keyboard: Keyboard): KeyboardDTO {
    return new KeyboardDTO({
      id: keyboard.id,
      type: keyboard.type,
      Buttons: keyboard.Buttons.map((button) => ButtonDTO.fromEntity(button)),
      DefaultHeight: keyboard.DefaultHeight,
      InputFieldState: keyboard.InputFieldState,
      BgColor: keyboard.BgColor,
      hidden: keyboard.hidden,
      humanReadableName: keyboard.humanReadableName,
      title: keyboard.title,
      isBroadcast: keyboard.isBroadcast,
      createdAt: keyboard.createdAt,
      updatedAt: keyboard.updatedAt,
    });
  }

  /**
   * Converts a KeyboardDTO to Keyboard entity
   *
   * Used when updating existing keyboards from API requests.
   * Note: This creates a new entity instance, which will trigger validation.
   *
   * @param dto - KeyboardDTO
   * @returns Keyboard domain entity
   */
  public static toEntity(dto: KeyboardDTO): Keyboard {
    // Convert ButtonDTO[] to Button[]
    const buttons = dto.Buttons.map((buttonDto) =>
      ButtonDTO.toEntity(buttonDto)
    );

    return new Keyboard({
      id: dto.id,
      type: dto.type,
      Buttons: buttons,
      DefaultHeight: dto.DefaultHeight,
      InputFieldState: dto.InputFieldState,
      BgColor: dto.BgColor,
      hidden: dto.hidden,
      humanReadableName: dto.humanReadableName,
      title: dto.title,
      isBroadcast: dto.isBroadcast,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
