/**
 * Message Handler
 *
 * Handles incoming messages from Viber users.
 * Supports multiple message types: text, location, contact, picture, video, file, sticker, URL.
 * Sends welcome step on first message if configured.
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
import { IUserRepository } from "../../ports/out/IUserRepository";
import { ViberBotService } from "../services/ViberBotService";
import { StepSender } from "../services/StepSender";

export class MessageHandler implements IEventHandler {
  private logger: Logger;
  private userRepository: IUserRepository;
  private viberBotService: ViberBotService | null;
  private stepSender: StepSender;
  private textHandler: TextMessageHandler;
  private locationHandler: LocationMessageHandler;
  private contactHandler: ContactMessageHandler;
  private pictureHandler: PictureMessageHandler;
  private videoHandler: VideoMessageHandler;
  private fileHandler: FileMessageHandler;
  private stickerHandler: StickerMessageHandler;
  private urlHandler: UrlMessageHandler;

  constructor(
    userRepository: IUserRepository,
    viberBotService?: ViberBotService | null,
    logger?: Logger
  ) {
    this.userRepository = userRepository;
    this.viberBotService = viberBotService || null;
    this.logger = logger || new ConsoleLogger("MessageHandler");
    this.stepSender = new StepSender(userRepository, this.logger);
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

      // Ensure user exists in database (create on first message if not exists)
      let isFirstMessage = false;
      try {
        let user = await this.userRepository.findByViberId(userId);
        if (!user) {
          // Create user on first message
          isFirstMessage = true;
          user = await this.userRepository.createOrUpdate({
            viberId: userId,
            name: userName,
            avatar: userProfile.avatar,
            language: userProfile.language,
            country: userProfile.country,
            apiVersion: userProfile.apiVersion,
            subscribed: false, // Not subscribed yet (no subscribe event received)
          });
          this.logger.info("User created on first message", { userId });
        } else {
          // Update profile if it has changed
          const profileChanged =
            user.name !== userName ||
            user.avatar !== userProfile.avatar ||
            user.language !== userProfile.language ||
            user.country !== userProfile.country ||
            user.apiVersion !== userProfile.apiVersion;

          if (profileChanged) {
            await this.userRepository.updateProfile(userId, {
              name: userName,
              avatar: userProfile.avatar,
              language: userProfile.language,
              country: userProfile.country,
              apiVersion: userProfile.apiVersion,
            });
            this.logger.debug("User profile updated", { userId });
          }
        }
      } catch (error) {
        this.logger.error("Failed to ensure user exists", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        // Don't throw - continue processing message
      }

      // Log message receipt
      this.logger.info("Message received", {
        userId,
        userName,
        messageType: this.getMessageType(message),
      });

      // Send welcome step on first message if configured
      if (
        isFirstMessage &&
        this.viberBotService &&
        this.viberBotService.isInitialized()
      ) {
        try {
          const settings = this.viberBotService.getSettings();
          if (settings && settings.welcomeStepId) {
            const bot = this.viberBotService.getBot();
            const botDataService = this.viberBotService.getBotDataService();
            await this.stepSender.sendStep(
              settings.welcomeStepId,
              bot,
              userProfile,
              botDataService,
              settings.buttonsPrefix
            );
            this.logger.info("Welcome step sent on first message", {
              userId,
              welcomeStepId: settings.welcomeStepId,
            });
          } else {
            this.logger.debug("No welcome step configured, skipping", {
              userId,
            });
          }
        } catch (error) {
          // Log error but don't throw - message processing should continue
          this.logger.error("Failed to send welcome step on first message", {
            error: error instanceof Error ? error.message : String(error),
            userId,
          });
        }
      }

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
