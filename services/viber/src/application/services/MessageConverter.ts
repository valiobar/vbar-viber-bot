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
   * @returns Viber Message instance
   * @throws Error if message type is not supported or content is invalid
   */
  convertToViberMessage(
    messageDTO: MessageDTO,
    keyboard?: any
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

    try {
      switch (messageDTO.type) {
        case "text": {
          const text = content?.text || "";
          return new Message.Text(text, keyboard);
        }

        case "picture": {
          const media = content?.media || "";
          const text = content?.text;
          return new Message.Picture(media, text, keyboard);
        }

        case "video": {
          const media = content?.media || "";
          const size = content?.size;
          const text = content?.text;
          return new Message.Video(media, size, text, keyboard);
        }

        case "file": {
          const media = content?.media || "";
          const size = content?.size;
          const fileName = content?.file_name;
          return new Message.File(media, size, fileName, keyboard);
        }

        case "location": {
          const lat = content?.lat;
          const lon = content?.lon;
          if (lat === undefined || lon === undefined) {
            throw new Error("Location message requires lat and lon in content");
          }
          return new Message.Location({ lat, lon }, keyboard);
        }

        case "contact": {
          const name = content?.name || "";
          const phoneNumber = content?.phone_number || "";
          return new Message.Contact(
            { name, phone_number: phoneNumber },
            keyboard
          );
        }

        case "sticker": {
          const stickerId = content?.sticker_id;
          if (stickerId === undefined) {
            throw new Error("Sticker message requires sticker_id in content");
          }
          return new Message.Sticker(stickerId, keyboard);
        }

        case "url": {
          const url = content?.url || messageDTO.url || "";
          if (!url) {
            throw new Error(
              "URL message requires url in content or messageDTO.url"
            );
          }
          return new Message.Url(url, keyboard);
        }

        default:
          throw new Error(`Unsupported message type: ${messageDTO.type}`);
      }
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
   * @returns Array of Viber Message instances
   */
  convertToViberMessages(
    messageDTOs: MessageDTO[],
    keyboard?: any
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
          attachKeyboard
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
