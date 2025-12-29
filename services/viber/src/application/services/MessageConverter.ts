/**
 * Message Converter Service
 *
 * Converts MessageDTO to Viber Message instances for sending via Viber Bot API.
 * Supports all message types: text, picture, video, file, location, contact, sticker, url.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Message } from "viber-bot";
import { MessageDTO } from "../types/DTOs";
import { Logger, ConsoleLogger } from "@vbar/shared";

/**
 * Message Converter Service
 *
 * Converts MessageDTO objects to Viber Message instances that can be sent via bot.sendMessage().
 * Handles all supported message types and their content structures.
 */
export class MessageConverter {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("MessageConverter");
  }

  /**
   * Convert a MessageDTO to a Viber Message instance
   *
   * @param messageDTO - MessageDTO to convert
   * @param keyboard - Optional keyboard object to attach to the message
   * @param minApiVersion - Optional minimum API version (required for InputFieldState support)
   * @returns Viber Message instance
   * @throws Error if message type is not supported or content is invalid
   */
  convertToViberMessage(
    messageDTO: MessageDTO,
    keyboard?: any,
    minApiVersion?: number
  ):
    | Message.Text
    | Message.Picture
    | Message.Video
    | Message.File
    | Message.Location
    | Message.Contact
    | Message.Sticker
    | Message.Url {
    const content = messageDTO.content as any;
    // InputFieldState requires API version 7.2.0 or higher
    // If keyboard has InputFieldState, ensure minApiVersion is at least 7.2
    const requiredApiVersion =
      keyboard?.InputFieldState && (!minApiVersion || minApiVersion < 7.2)
        ? 7.2
        : minApiVersion || 1;

    try {
      let message:
        | Message.Text
        | Message.Picture
        | Message.Video
        | Message.File
        | Message.Location
        | Message.Contact
        | Message.Sticker
        | Message.Url;

      // Pass minApiVersion as the last constructor parameter
      // Constructor signature: (content, keyboard, trackingData, timestamp, token, minApiVersion)
      // For InputFieldState support, we need minApiVersion >= 7.2
      const apiVersionParam =
        requiredApiVersion >= 7.2 ? requiredApiVersion : undefined;

      switch (messageDTO.type) {
        case "text": {
          const text = content?.text || "";
          // Message.Text(text, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Text as any)(
            text,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "picture": {
          const media = content?.media || "";
          const text = content?.text;
          // Message.Picture(media, text, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Picture as any)(
            media,
            text,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "video": {
          const media = content?.media || "";
          const size = content?.size;
          const text = content?.text;
          // Message.Video(media, size, text, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Video as any)(
            media,
            size,
            text,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "file": {
          const media = content?.media || "";
          const size = content?.size;
          const fileName = content?.file_name;
          // Message.File(media, size, fileName, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.File as any)(
            media,
            size,
            fileName,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "location": {
          const lat = content?.lat;
          const lon = content?.lon;
          if (lat === undefined || lon === undefined) {
            throw new Error("Location message requires lat and lon in content");
          }
          // Message.Location(location, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Location as any)(
            { lat, lon },
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "contact": {
          const name = content?.name || "";
          const phoneNumber = content?.phone_number || "";
          // Message.Contact(contact, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Contact as any)(
            { name, phone_number: phoneNumber },
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "sticker": {
          const stickerId = content?.sticker_id;
          if (stickerId === undefined) {
            throw new Error("Sticker message requires sticker_id in content");
          }
          // Message.Sticker(stickerId, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Sticker as any)(
            stickerId,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        case "url": {
          const url = content?.url || messageDTO.url || "";
          if (!url) {
            throw new Error(
              "URL message requires url in content or messageDTO.url"
            );
          }
          // Message.Url(url, keyboard, trackingData, timestamp, token, minApiVersion)
          message = new (Message.Url as any)(
            url,
            keyboard,
            null,
            null,
            null,
            apiVersionParam
          );
          break;
        }

        default:
          throw new Error(`Unsupported message type: ${messageDTO.type}`);
      }

      return message;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("Failed to convert message", {
        messageId: messageDTO.id,
        messageType: messageDTO.type,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Convert multiple MessageDTOs to Viber Message instances
   *
   * @param messageDTOs - Array of MessageDTOs to convert
   * @param keyboard - Optional keyboard to attach to the last message
   * @param minApiVersion - Optional minimum API version (required for InputFieldState support)
   * @returns Array of Viber Message instances
   */
  convertToViberMessages(
    messageDTOs: MessageDTO[],
    keyboard?: any,
    minApiVersion?: number
  ): Array<
    | Message.Text
    | Message.Picture
    | Message.Video
    | Message.File
    | Message.Location
    | Message.Contact
    | Message.Sticker
    | Message.Url
  > {
    const messages: Array<
      | Message.Text
      | Message.Picture
      | Message.Video
      | Message.File
      | Message.Location
      | Message.Contact
      | Message.Sticker
      | Message.Url
    > = [];

    for (let i = 0; i < messageDTOs.length; i++) {
      const messageDTO = messageDTOs[i];
      // Attach keyboard only to the last message
      const attachKeyboard =
        i === messageDTOs.length - 1 ? keyboard : undefined;
      try {
        const viberMessage = this.convertToViberMessage(
          messageDTO,
          attachKeyboard,
          minApiVersion
        );
        messages.push(viberMessage);
      } catch (error) {
        // Log error but continue with other messages
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn("Skipping message due to conversion error", {
          messageId: messageDTO.id,
          messageType: messageDTO.type,
          error: errorMessage,
        });
      }
    }

    return messages;
  }
}
