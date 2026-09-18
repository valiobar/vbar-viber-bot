/**
 * Custom Response Handler Types
 *
 * A custom response handler is a code-defined function that intercepts the
 * user's reply while they are on a step with `responseHandler` set. It
 * receives every inbound message type except prefixed keyboard taps.
 *
 * Handlers receive the raw viber-bot message plus everything needed to
 * reply, store state, and advance the flow.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Bot } from "viber-bot";
import { Logger } from "@vbar/shared";
import { StepDTO } from "../types/DTOs";
import { BotDataService } from "../services/BotDataService";
import { IUserRepository } from "../../ports/out/IUserRepository";
import { StepSender } from "../services/StepSender";

/** Viber inbound message type as resolved by MessageHandler.getMessageType */
export type InboundMessageType =
  | "text"
  | "location"
  | "contact"
  | "picture"
  | "video"
  | "file"
  | "sticker"
  | "url"
  | "unknown";

/**
 * Context passed to every custom response handler
 */
export interface CustomResponseContext {
  /** Raw viber-bot message instance (Message.Text, Message.Location, ...) */
  message: any;
  /** Resolved message type string */
  messageType: InboundMessageType;
  /** The step the user is currently on (has responseHandler set) */
  step: StepDTO;
  /** Viber Bot instance for sending replies */
  bot: Bot;
  /** Viber user profile of the sender */
  userProfile: any;
  /** Bot data lookups (steps, messages, keyboards, carousels) */
  botDataService: BotDataService;
  /**
   * User persistence. Use `findByViberId` to read `user.state`,
   * `updateState` to shallow-merge keys into it, `clearState` to wipe it,
   * `updateCurrentStep` for the step pointer.
   */
  userRepository: IUserRepository;
  /** Step sender — call sendStep(...) to move the user to a next step */
  stepSender: StepSender;
  /** Button prefix from bot settings, if configured */
  buttonPrefix?: string | null;
  logger: Logger;
}

/**
 * Custom response handler function contract
 */
export type CustomResponseHandler = (
  ctx: CustomResponseContext
) => Promise<void>;
