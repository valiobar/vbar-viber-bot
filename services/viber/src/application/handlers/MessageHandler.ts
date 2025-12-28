/**
 * Message Handler
 *
 * Handles incoming messages from Viber users.
 * Supports multiple message types: text, location, contact, picture, video, file, sticker, URL.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot, Message } from "viber-bot";
import { IEventHandler } from "./IEventHandler";
import { ConsoleLogger, Logger } from "@vbar/shared";
import {
  TextMessageHandler,
  LocationMessageHandler,
  ContactMessageHandler,
  PictureMessageHandler,
  VideoMessageHandler,
  FileMessageHandler,
  StickerMessageHandler,
  UrlMessageHandler,
} from "./message-handlers";

export class MessageHandler implements IEventHandler {
  private logger: Logger;
  private textHandler: TextMessageHandler;
  private locationHandler: LocationMessageHandler;
  private contactHandler: ContactMessageHandler;
  private pictureHandler: PictureMessageHandler;
  private videoHandler: VideoMessageHandler;
  private fileHandler: FileMessageHandler;
  private stickerHandler: StickerMessageHandler;
  private urlHandler: UrlMessageHandler;

  constructor(logger?: Logger) {
    this.logger = logger || new ConsoleLogger("MessageHandler");
    // Initialize message type handlers
    this.textHandler = new TextMessageHandler(this.logger);
    this.locationHandler = new LocationMessageHandler(this.logger);
    this.contactHandler = new ContactMessageHandler(this.logger);
    this.pictureHandler = new PictureMessageHandler(this.logger);
    this.videoHandler = new VideoMessageHandler(this.logger);
    this.fileHandler = new FileMessageHandler(this.logger);
    this.stickerHandler = new StickerMessageHandler(this.logger);
    this.urlHandler = new UrlMessageHandler(this.logger);
  }

  getName(): string {
    return "MessageHandler";
  }

  register(bot: Bot): void {
    bot.onMessage((message: any, response: any) => {
      this.handleMessage(message, response).catch((error) => {
        this.logger.error("Error handling message", { error });
        // Don't throw - we've already acknowledged to Viber
      });
    });

    this.logger.info("Message handler registered");
  }

  private async handleMessage(message: any, response: any): Promise<void> {
    try {
      // Extract user profile
      const userProfile = response.userProfile;
      const userId = userProfile.id;
      const userName = userProfile.name;

      // Log message receipt
      this.logger.info("Message received", {
        userId,
        userName,
        messageType: this.getMessageType(message),
      });

      // Handle different message types
      if (message instanceof Message.Text) {
        await this.textHandler.handle(message, userProfile);
      } else if (message instanceof Message.Location) {
        await this.locationHandler.handle(message, userProfile);
      } else if (message instanceof Message.Contact) {
        await this.contactHandler.handle(message, userProfile);
      } else if (message instanceof Message.Picture) {
        await this.pictureHandler.handle(message, userProfile);
      } else if (message instanceof Message.Video) {
        await this.videoHandler.handle(message, userProfile);
      } else if (message instanceof Message.File) {
        await this.fileHandler.handle(message, userProfile);
      } else if (message instanceof Message.Sticker) {
        await this.stickerHandler.handle(message, userProfile);
      } else if (message instanceof Message.Url) {
        await this.urlHandler.handle(message, userProfile);
      } else {
        this.logger.warn("Unknown message type", {
          userId,
          messageType: typeof message,
        });
      }

      // TODO: In future steps, route to message processor via port interface
      // const messageProcessor = this.messageProcessor;
      // await messageProcessor.processMessage(messageData);
    } catch (error) {
      this.logger.error("Failed to process message", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private getMessageType(message: any): string {
    if (message instanceof Message.Text) return "text";
    if (message instanceof Message.Location) return "location";
    if (message instanceof Message.Contact) return "contact";
    if (message instanceof Message.Picture) return "picture";
    if (message instanceof Message.Video) return "video";
    if (message instanceof Message.File) return "file";
    if (message instanceof Message.Sticker) return "sticker";
    if (message instanceof Message.Url) return "url";
    return "unknown";
  }
}
