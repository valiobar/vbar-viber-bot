/**
 * Broadcast Sender Service
 *
 * Builds raw Viber message JSON from a cached step (same resolution as StepSender)
 * and sends it via pa/broadcast_message in recipient batches.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Logger, ConsoleLogger } from "@vbar/shared";
import type { BroadcastFailedEntry } from "@vbar/shared";
import { BotDataService } from "./BotDataService";
import { MessageConverter } from "./MessageConverter";
import { KeyboardConverter } from "./KeyboardConverter";
import { CarouselConverter } from "./CarouselConverter";
import { FALLBACK_MIN_API_VERSION } from "./resolveUserMinApiVersion";
import { getViberConfig } from "../../config/viber";
import { getBroadcastConfig } from "../../config/broadcast";

const BROADCAST_URL = "https://chatapi.viber.com/pa/broadcast_message";

export interface BatchResult {
  sentCount: number;
  failed: BroadcastFailedEntry[];
}

/**
 * Broadcast Sender Service
 *
 * Converts a cached step into raw Viber payloads and broadcasts them
 * to recipient pages. Calls onBatchDone after every batch (progress + heartbeat).
 */
export class BroadcastSender {
  private readonly messageConverter: MessageConverter;
  private readonly keyboardConverter: KeyboardConverter;
  private readonly carouselConverter: CarouselConverter;
  private readonly logger: Logger;

  constructor(logger: Logger = new ConsoleLogger("BroadcastSender")) {
    this.logger = logger;
    this.messageConverter = new MessageConverter(this.logger);
    this.keyboardConverter = new KeyboardConverter(this.logger);
    this.carouselConverter = new CarouselConverter(this.logger);
  }

  /**
   * Build raw message payloads once per broadcast — same resolution logic as StepSender.
   */
  buildRawMessages(
    stepId: string,
    botDataService: BotDataService,
    buttonPrefix?: string | null
  ): object[] {
    const step = botDataService.getStepById(stepId);
    if (!step) throw new Error(`Broadcast step ${stepId} not found in bot data cache`);

    const messageDTOs = step.content
      .map((id) => botDataService.getMessageById(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .map((dto) => {
        if (dto.type !== "rich-media") return dto;
        const carouselId = (dto.content as { carousel?: { id?: string } })?.carousel
          ?.id;
        const carouselDTO = carouselId
          ? botDataService.getCarouselById(carouselId)
          : undefined;
        if (!carouselDTO) return null;
        const richMedia = this.carouselConverter.convertToViberRichMedia(
          carouselDTO,
          buttonPrefix
        );
        return { ...dto, content: { ...(dto.content as object), richMedia } };
      })
      .filter((dto): dto is NonNullable<typeof dto> => dto !== null);

    if (messageDTOs.length === 0) {
      throw new Error(`Broadcast step ${stepId} has no sendable messages`);
    }

    let keyboard: unknown;
    if (step.keyboard) {
      const keyboardDTO = botDataService.getKeyboardById(step.keyboard);
      if (keyboardDTO) {
        keyboard = this.keyboardConverter.convertToViberKeyboard(
          keyboardDTO,
          buttonPrefix
        );
      }
    }

    // Same converter StepSender uses; keyboard is attached to the last message.
    // One payload for every recipient, so there is no single user apiVersion.
    const sdkMessages = this.messageConverter.convertToViberMessages(
      messageDTOs,
      keyboard,
      FALLBACK_MIN_API_VERSION
    );
    if (sdkMessages.length === 0) {
      throw new Error(`Broadcast step ${stepId} has no sendable messages`);
    }
    // toJson() is body-only (type/text/media). bot.sendMessage() copies
    // message.keyboard and minApiVersion onto the request separately — we
    // must do the same for pa/broadcast_message or Viber drops the keyboard.
    return sdkMessages.map((message) => this.toBroadcastPayload(message));
  }

  private toBroadcastPayload(message: object): object {
    const sdkMessage = message as {
      toJson: () => object;
      keyboard?: unknown;
      minApiVersion?: number;
    };
    const payload: Record<string, unknown> = { ...sdkMessage.toJson() };
    if (sdkMessage.keyboard) {
      payload.keyboard = sdkMessage.keyboard;
    }
    if (sdkMessage.minApiVersion != null) {
      payload.min_api_version = sdkMessage.minApiVersion;
    }
    return payload;
  }

  /**
   * Send raw messages to recipients in batches. Calls onBatchDone after every
   * batch (progress + heartbeat). Returns aggregate counts.
   */
  async sendToRecipients(
    rawMessages: object[],
    recipients: string[],
    onBatchDone: (result: BatchResult) => Promise<void>
  ): Promise<void> {
    const { usersPerBatch, batchIntervalMs } = getBroadcastConfig();
    const token = getViberConfig().token;

    for (let offset = 0; offset < recipients.length; offset += usersPerBatch) {
      const batch = recipients.slice(offset, offset + usersPerBatch);
      const failedIds = new Set<string>();
      const failed: BroadcastFailedEntry[] = [];

      for (const rawMessage of rawMessages) {
        const response = await fetch(BROADCAST_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Viber-Auth-Token": token,
          },
          body: JSON.stringify({ ...rawMessage, broadcast_list: batch }),
        });
        const result = (await response.json()) as {
          status: number;
          status_message?: string;
          failed_list?: {
            receiver: string;
            status: number;
            status_message: string;
          }[];
        };
        if (result.status !== 0) {
          throw new Error(
            `broadcast_message failed: ${result.status_message ?? result.status}`
          );
        }
        for (const f of result.failed_list ?? []) {
          if (!failedIds.has(f.receiver)) {
            failedIds.add(f.receiver);
            failed.push({ viberId: f.receiver, reason: f.status_message });
          }
        }
      }

      await onBatchDone({ sentCount: batch.length - failed.length, failed });

      const isLastBatch = offset + usersPerBatch >= recipients.length;
      if (!isLastBatch) {
        await new Promise((resolve) => setTimeout(resolve, batchIntervalMs));
      }
    }
  }
}
