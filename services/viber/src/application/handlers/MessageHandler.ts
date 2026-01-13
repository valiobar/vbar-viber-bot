/**
 * Message Handler
 *
 * Handles incoming messages from Viber users.
 * Supports multiple message types: text, location, contact, picture, video, file, sticker, URL.
 * Sends welcome step on first message if configured.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot, Message, Events } from "viber-bot";
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
import { ViberAiService } from "../services/ViberAiService";
import { IAiServiceClient } from "../../ports/out/IAiServiceClient";

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
  private viberAiService: ViberAiService;

  constructor(
    userRepository: IUserRepository,
    viberBotService?: ViberBotService | null,
    logger?: Logger,
    aiServiceClient?: IAiServiceClient
  ) {
    this.userRepository = userRepository;
    this.viberBotService = viberBotService || null;
    this.logger = logger || new ConsoleLogger("MessageHandler");
    this.stepSender = new StepSender(userRepository, this.logger);
    // Initialize message type handlers
    this.textHandler = new TextMessageHandler(
      this.logger,
      this.viberBotService,
      this.stepSender,
      this.userRepository
    );
    this.locationHandler = new LocationMessageHandler(this.logger);
    this.contactHandler = new ContactMessageHandler(this.logger);
    this.pictureHandler = new PictureMessageHandler(this.logger);
    this.videoHandler = new VideoMessageHandler(this.logger);
    this.fileHandler = new FileMessageHandler(this.logger);
    this.stickerHandler = new StickerMessageHandler(this.logger);
    this.urlHandler = new UrlMessageHandler(this.logger);
    if (!aiServiceClient) {
      throw new Error("AI Service client is required for MessageHandler");
    }
    this.viberAiService = new ViberAiService(this.logger, aiServiceClient);
  }

  getName(): string {
    return "MessageHandler";
  }

  register(bot: Bot): void {
    bot.on(Events.MESSAGE_RECEIVED, (message: any, response: any) => {
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

      // Check if user is in AI step before routing to specific handlers
      try {
        const user = await this.userRepository.findByViberId(userId);
        if (user && user.currentStepId) {
          if (this.viberBotService && this.viberBotService.isInitialized()) {
            const buttonsPrefix =
              this.viberBotService.getSettings()?.buttonsPrefix;
            const isTextMessage = message instanceof Message.Text;
            const isMessageContainsPrefix =
              isTextMessage &&
              buttonsPrefix &&
              message.text?.includes(buttonsPrefix);

            const botDataService = this.viberBotService.getBotDataService();
            const step = botDataService.getStepById(user.currentStepId);
            if (step && step.isAi === true && !isMessageContainsPrefix) {
              // Extract message content based on message typea
              let messageContent: string = "";
              const messageType = this.getMessageType(message);

              if (message instanceof Message.Text) {
                messageContent = message.text;
              } else if (message instanceof Message.Picture) {
                // Picture message: URL and optional text
                messageContent = message.url;
                if (message.text) {
                  messageContent += ` | Text: ${message.text}`;
                }
              } else if (message instanceof Message.Video) {
                // Video message: URL, optional text, size, and duration
                messageContent = message.url;
                if (message.text) {
                  messageContent += ` | Text: ${message.text}`;
                }
                if (message.size) {
                  messageContent += ` | Size: ${message.size} bytes`;
                }
                if (message.duration) {
                  messageContent += ` | Duration: ${message.duration} seconds`;
                }
              } else if (message instanceof Message.File) {
                // File message: URL, optional file name and size
                messageContent = message.url;
                if (message.filename) {
                  messageContent += ` | File: ${message.filename}`;
                }
                if (message.sizeInBytes) {
                  messageContent += ` | Size: ${message.sizeInBytes} bytes`;
                }
              } else if (message instanceof Message.Location) {
                // Location message: format as "latitude,longitude" per Viber Node API
                if (
                  message.latitude !== undefined &&
                  message.longitude !== undefined
                ) {
                  messageContent = `${message.latitude},${message.longitude}`;
                } else {
                  messageContent = "Location data not available";
                }
              } else if (message instanceof Message.Contact) {
                // Contact message: format contact info
                const name = message.contactName || "";
                const phone = message.contactPhoneNumber || "";
                messageContent = `Contact: ${name}${
                  phone ? ` (${phone})` : ""
                }`;
              } else if (message instanceof Message.Sticker) {
                messageContent = `Sticker ID: ${message.stickerId}`;
              } else if (message instanceof Message.Url) {
                messageContent = message.url;
              }

              // Handle message via AI service
              const bot = this.viberBotService.getBot();
              await this.viberAiService.handleMessage(
                messageContent,
                messageType,
                userId,
                user.currentStepId,
                bot,
                userProfile
              );

              // Return early - don't route to specific handler
              return;
            }
          }
        }
      } catch (error) {
        // Log error but continue with normal message routing
        this.logger.error("Failed to check AI step", {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
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
