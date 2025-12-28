/**
 * Base interface for Viber bot event handlers
 *
 * All event handlers must implement this interface to ensure
 * consistent registration and behavior.
 *
 * Location: Application Layer (Hexagonal Architecture)
 */
import { Bot } from "viber-bot";

export interface IEventHandler {
  /**
   * Register this handler with the Viber bot instance
   *
   * This method should set up event listeners on the bot
   * instance using bot.onMessage(), bot.onSubscribe(), etc.
   *
   * @param bot The ViberBot instance to register handlers with
   */
  register(bot: Bot): void;

  /**
   * Get the name of this handler for logging purposes
   *
   * @returns Handler name (typically the class name)
   */
  getName(): string;
}
