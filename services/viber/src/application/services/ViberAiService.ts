/**
 * Viber AI Service
 *
 * Handles AI processing for messages when user is in an AI step.
 * Calls the AI service via gRPC to process messages.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */

import { ConfigHelper, Logger } from "@vbar/shared";
import {
  getNearbyLocations,
  locations,
} from "@vbar/shared/locations";
import { IAiServiceClient } from "../../ports/out/IAiServiceClient";
import { IGeocodingClient } from "../../ports/out/IGeocodingClient";
import { Bot, Message } from "viber-bot";
import { buildDismissKeyboard, buildThinkingKeyboard } from "./thinkingKeyboard";
import {
  buildRichMediaFromCards,
  parseAiCarouselDirective,
} from "./AiCarouselDirective";
import { parseAiLocationsDirective } from "./AiLocationsDirective";
import {
  buildMapUrl,
  buildNearbyCarousel,
  CLOSEST_COUNT,
  MAIN_KEYBOARD_NAME,
  resolveNamedKeyboard,
} from "./LocationCarousel";
import { BotDataService } from "./BotDataService";
import { resolveUserMinApiVersion } from "./resolveUserMinApiVersion";

const AI_LOCATIONS_RADIUS_KM = 10;
const GEOCODE_FAILED_TEXT =
  "Не успях да намеря това място. Моля, уточнете града, квартала или адреса.";

export interface ViberAiContext {
  botDataService: BotDataService;
  buttonsPrefix?: string | null;
}

export class ViberAiService {
  constructor(
    private logger: Logger,
    private aiServiceClient: IAiServiceClient,
    private geocodingClient: IGeocodingClient
  ) {}

  /**
   * Handle message for AI processing
   *
   * @param messageContent - Extracted content from the message (text, URL, etc.)
   * @param messageType - Type of message (text, picture, video, file, location, contact, sticker, url)
   * @param userId - Viber user ID
   * @param stepId - Current step ID
   * @param bot - Viber Bot instance for sending messages
   * @param userProfile - User profile for sending messages
   * @param taskType - Task type: "simple", "rag", or "custom" (optional)
   * @param promptName - Per-step prompt override (optional)
   * @param restoreKeyboard - Converted Viber keyboard to attach after the AI reply
   * @param context - Bot data and button prefix used to resolve the "main" keyboard
   */
  async handleMessage(
    messageContent: string,
    messageType: string,
    userId: string,
    stepId: string,
    bot: Bot,
    userProfile: any,
    taskType?: string,
    promptName?: string,
    restoreKeyboard?: object,
    context?: ViberAiContext
  ): Promise<void> {
    const gifUrl = ConfigHelper.getEnv("AI_THINKING_GIF_URL", "").trim();
    const followUpKeyboard = restoreKeyboard ?? buildDismissKeyboard();
    const minApiVersion = resolveUserMinApiVersion(userProfile?.apiVersion);
    let thinkingSent = false;

    if (gifUrl) {
      try {
        const thinking = new (Message.Keyboard as any)(
          buildThinkingKeyboard(gifUrl),
          null,
          null,
          null,
          minApiVersion
        );
        await bot.sendMessage(userProfile, [thinking]);
        thinkingSent = true;
        this.logger.info("ViberAiService - thinking indicator sent", {
          userId,
          stepId,
        });
      } catch (error) {
        this.logger.warn("ViberAiService - failed to send thinking indicator", {
          error: error instanceof Error ? error.message : String(error),
          userId,
          stepId,
        });
      }
    }

    try {
      const response = await this.aiServiceClient.processMessage({
        messageContent,
        messageType,
        userId,
        stepId,
        userProfile: userProfile
          ? {
              id: userProfile.id,
              name: userProfile.name,
              avatar: userProfile.avatar,
            }
          : undefined,
        taskType,
        promptName,
      });

      this.logger.info("ViberAiService - AI response received", {
        userId,
        stepId,
        responseLength: response.response?.length || 0,
      });

      const text =
        response && response.response && response.response.trim()
          ? response.response
          : "";

      if (!text) {
        this.logger.warn("ViberAiService - Empty AI response, not sending", {
          userId,
          stepId,
        });
        if (thinkingSent) {
          try {
            await this.sendRestoreKeyboard(
              bot,
              userProfile,
              followUpKeyboard,
              minApiVersion
            );
          } catch (sendError) {
            this.logger.error("ViberAiService - failed to send AI fallback", {
              error:
                sendError instanceof Error
                  ? sendError.message
                  : String(sendError),
              userId,
              stepId,
            });
          }
        }
        return;
      }

      const locationsDirective = parseAiLocationsDirective(text);
      if (locationsDirective && context) {
        await this.sendLocationsCarousel(
          locationsDirective.place,
          bot,
          userProfile,
          context,
          followUpKeyboard,
          minApiVersion,
          userId,
          stepId
        );
        return;
      }
      if (locationsDirective && !context) {
        this.logger.warn(
          "ViberAiService - locations directive received without context, sending as text",
          { userId, stepId }
        );
      }

      // Carousel directive path: a JSON reply renders as rich media
      const directive = parseAiCarouselDirective(text);
      if (!directive && text.includes('"carousel"')) {
        this.logger.warn(
          "ViberAiService - reply looks like a carousel directive but failed to parse/validate, sending as text",
          {
            userId,
            stepId,
            replyPreview: text.slice(0, 300),
          }
        );
      }
      if (directive) {
        const richMedia = buildRichMediaFromCards(directive.cards);
        const messages: any[] = [];
        if (directive.text) {
          messages.push(
            new (Message.Text as any)(
              directive.text,
              null,
              null,
              null,
              null,
              minApiVersion
            )
          );
        }
        // viber-bot: RichMedia(richMedia, keyboard, trackingData, timestamp, token, altText, minApiVersion)
        messages.push(
          new (Message.RichMedia as any)(
            richMedia,
            followUpKeyboard,
            null,
            null,
            null,
            null,
            minApiVersion
          )
        );
        await bot.sendMessage(userProfile, messages);
        this.logger.info("ViberAiService - AI carousel response sent to user", {
          userId,
          stepId,
          cardCount: directive.cards.length,
        });
        return;
      }

      const reply = new (Message.Text as any)(
        text,
        followUpKeyboard,
        null,
        null,
        null,
        minApiVersion
      );
      await bot.sendMessage(userProfile, [reply]);
      this.logger.info("ViberAiService - AI response sent to user", {
        userId,
        stepId,
      });
    } catch (error) {
      this.logger.error("Failed to process message via AI service", {
        error: error instanceof Error ? error.message : String(error),
        userId,
        stepId,
        messageType,
      });
      if (thinkingSent) {
        try {
          await this.sendRestoreKeyboard(
            bot,
            userProfile,
            followUpKeyboard,
            minApiVersion
          );
        } catch (sendError) {
          this.logger.error("ViberAiService - failed to send AI fallback", {
            error:
              sendError instanceof Error
                ? sendError.message
                : String(sendError),
            userId,
            stepId,
          });
        }
      }
    }
  }

  private async sendLocationsCarousel(
    place: string,
    bot: Bot,
    userProfile: any,
    context: ViberAiContext,
    followUpKeyboard: object,
    minApiVersion: number,
    userId: string,
    stepId: string
  ): Promise<void> {
    const origin = await this.geocodingClient.geocode(place);

    if (!origin) {
      const clarify = new (Message.Text as any)(
        GEOCODE_FAILED_TEXT,
        followUpKeyboard,
        null,
        null,
        null,
        minApiVersion
      );
      await bot.sendMessage(userProfile, [clarify]);
      this.logger.info("ViberAiService - geocode failed, asked to clarify place", {
        userId,
        stepId,
        place,
      });
      return;
    }

    const closest = getNearbyLocations(
      locations,
      origin,
      AI_LOCATIONS_RADIUS_KM
    ).items.slice(0, CLOSEST_COUNT);
    const mapUrl = buildMapUrl(origin.lat, origin.lng);
    const keyboard = resolveNamedKeyboard(
      context.botDataService,
      MAIN_KEYBOARD_NAME,
      context.buttonsPrefix,
      this.logger
    );

    const messages: any[] = [
      new (Message.RichMedia as any)(
        buildNearbyCarousel(origin, closest, mapUrl),
        keyboard ?? followUpKeyboard,
        null,
        null,
        null,
        null,
        minApiVersion
      ),
    ];
    // Same pattern as locationHandler: a dedicated Keyboard message forces
    // the named keyboard to replace the previous one on the client.
    if (keyboard) {
      messages.push(
        new (Message.Keyboard as any)(keyboard, null, null, null, minApiVersion)
      );
    }
    await bot.sendMessage(userProfile, messages);

    this.logger.info("ViberAiService - AI locations carousel sent", {
      userId,
      stepId,
      place,
      lat: origin.lat,
      lng: origin.lng,
      closestCount: closest.length,
      keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
    });
  }

  private async sendRestoreKeyboard(
    bot: Bot,
    userProfile: any,
    keyboard: object,
    minApiVersion: number
  ): Promise<void> {
    const restore = new (Message.Keyboard as any)(
      keyboard,
      null,
      null,
      null,
      minApiVersion
    );
    await bot.sendMessage(userProfile, [restore]);
  }
}
