/**
 * Message DTO (Data Transfer Object)
 *
 * DTO representing a Message for API requests and responses.
 * This is a plain data structure used to transfer message data
 * between the application layer and external interfaces (API routes).
 */

import { Message } from "../../entities/Message";
import { MessageContent } from "../../value-objects/MessageContent";
import { MessageType } from "../../types";
import type { MessageDTO as SharedMessageDTO } from "@vbar/shared";

/**
 * Message DTO (Data Transfer Object)
 *
 * Plain data structure matching Message entity properties
 * but without business logic or methods.
 * Content is represented as plain object instead of MessageContent value object.
 * Provides static methods for converting between Message entities and DTOs.
 * Implements the shared MessageDTO interface for cross-service compatibility.
 */
export class MessageDTO implements SharedMessageDTO {
  public readonly id: string;
  public readonly type: MessageType;
  public readonly content: object; // Plain object, not MessageContent
  public readonly url: string | null;
  public readonly humanReadableName: string;
  public readonly hidden: boolean;
  public readonly createdAt: string;
  public readonly updatedAt: string;

  private constructor(data: {
    id: string;
    type: MessageType;
    content: object;
    url: string | null;
    humanReadableName: string;
    hidden: boolean;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = data.id;
    this.type = data.type;
    this.content = data.content;
    this.url = data.url;
    this.humanReadableName = data.humanReadableName;
    this.hidden = data.hidden;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Converts a Message entity to MessageDTO
   *
   * @param message - Message domain entity
   * @returns MessageDTO
   */
  public static fromEntity(message: Message): MessageDTO {
    return new MessageDTO({
      id: message.id,
      type: message.type,
      content: message.content.getData(), // Convert MessageContent to plain object
      url: message.url,
      humanReadableName: message.humanReadableName,
      hidden: message.hidden,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    });
  }

  /**
   * Converts a MessageDTO to Message entity
   *
   * Used when updating existing messages from API requests.
   * Note: This creates a new entity instance, which will trigger validation.
   *
   * @param dto - MessageDTO
   * @returns Message domain entity
   */
  public static toEntity(dto: MessageDTO): Message {
    // Convert plain object to MessageContent value object
    const content = new MessageContent(dto.type, dto.content);

    return new Message({
      id: dto.id,
      type: dto.type,
      content,
      url: dto.url,
      humanReadableName: dto.humanReadableName,
      hidden: dto.hidden,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    });
  }
}
