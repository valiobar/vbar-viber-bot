/**
 * Custom Step Handler Types
 *
 * A custom step handler is a code-defined function that fully replaces the
 * normal step sending (messages/keyboard) when a step has `customHandler` set.
 *
 * Handlers receive everything StepSender.sendStep has, so they can send any
 * messages, look up bot data, or update users as needed.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Bot } from "viber-bot";
import { Logger } from "@vbar/shared";
import { StepDTO } from "../types/DTOs";
import { BotDataService } from "../services/BotDataService";
import { IUserRepository } from "../../ports/out/IUserRepository";

/**
 * Context passed to every custom step handler
 */
export interface CustomStepContext {
  /** The step being executed (contains trigger, content, keyboard, etc.) */
  step: StepDTO;
  /** Viber Bot instance for sending messages */
  bot: Bot;
  /** Viber user profile of the recipient (must have id property) */
  userProfile: any;
  /** Bot data lookups (steps, messages, keyboards, carousels) */
  botDataService: BotDataService;
  /** User persistence (e.g. updateCurrentStep) */
  userRepository: IUserRepository;
  /** Button prefix from bot settings, if configured */
  buttonPrefix?: string | null;
  /** Logger scoped to the step sender */
  logger: Logger;
}

/**
 * Custom step handler function contract
 */
export type CustomStepHandler = (ctx: CustomStepContext) => Promise<void>;
