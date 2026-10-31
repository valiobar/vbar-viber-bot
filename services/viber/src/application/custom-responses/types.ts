/**
 * Custom Response Handler Types
 *
 * A custom response handler is a code-defined function that runs while the
 * user is on a step with `responseHandler` set. It receives every inbound
 * message, including prefixed keyboard taps.
 *
 * A handler may:
 * - reply (stops the normal flow),
 * - only save state (the normal flow continues),
 * - intercept a button tap (the normal button flow continues by default).
 *
 * Returning nothing means: a typed reply stops only if the handler sent a
 * message, and a button tap continues. An explicit result ("handled",
 * "continue", or { state, trigger }) overrides that.
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
import { ButtonTap } from "../services/parseButtonTap";
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
  /**
   * Send-tracking proxy around the Viber Bot. A call to sendMessage on this
   * instance is recorded, so a typed reply that sends a message stops the
   * normal flow. Pass this same bot to stepSender.sendStep
   * (`ctx.stepSender.sendStep(..., ctx.bot, ...)`) so that navigation is
   * detected as a send.
   */
  bot: Bot;
  /** Viber user profile of the sender */
  userProfile: any;
  /**
   * Full in-memory bot catalog (steps, messages, keyboards, carousels).
   * Look up by id (`getKeyboardById`) or admin name (`getKeyboardByName`).
   */
  botDataService: BotDataService;
  /**
   * User persistence. Use `findByViberId` to read `user.state`,
   * `updateState` to shallow-merge keys into it (`null` removes a key),
   * `clearState` to wipe it,
   * `updateCurrentStep` for the step pointer.
   */
  userRepository: IUserRepository;
  /**
   * Step sender. Call sendStep with ctx.bot
   * (`ctx.stepSender.sendStep(id, ctx.bot, ...)`) so the send is detected.
   */
  stepSender: StepSender;
  /** Button prefix from bot settings, if configured */
  buttonPrefix?: string | null;
  /**
   * Set only when the message is a prefixed button tap (reply button action body).
   * `payload` is the parsed JSON object, or null for plain-text buttons.
   * By default a tap continues into the normal button flow after the handler runs:
   * payload keys (except `trigger`) are merged into user.state and the `trigger` step opens.
   */
  button: ButtonTap | null;
  logger: Logger;
}

/**
 * Optional explicit outcome. Overrides automatic send detection.
 * - "handled":  stop, do not run the normal flow (for a tap: the button does nothing)
 * - "continue": run the normal flow even if the handler sent something
 * - { state, trigger }: same semantics as a JSON action body
 *     state:   shallow-merged into user.state (null removes a key)
 *     trigger: opens the step whose trigger[] matches (case-insensitive), then stops
 *              (for a tap this REPLACES the original payload's navigation)
 *     state only (no trigger): state is saved, then the normal flow continues
 * Returning nothing means:
 *   typed reply: stop if the handler sent a message, else continue
 *   button tap:  continue
 */
export interface CustomResponseAction {
  state?: Record<string, unknown>;
  trigger?: string;
}

export type CustomResponseResult = "handled" | "continue" | CustomResponseAction;

/**
 * Custom response handler function contract.
 * Returning nothing keeps the default: typed replies stop when a message was
 * sent, button taps continue into the normal button flow.
 */
export type CustomResponseHandler = (
  ctx: CustomResponseContext
) => Promise<void | CustomResponseResult>;
