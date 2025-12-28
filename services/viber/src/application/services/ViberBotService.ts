/**
 * Viber Bot Service
 *
 * Application service for initializing and managing the ViberBot instance.
 * This service orchestrates bot initialization by fetching settings from admin service
 * and configuring the bot with those settings.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { Bot } from "viber-bot";
import { IAdminServiceClient } from "../../ports/out/IAdminServiceClient";
import { AdminServiceClient } from "../../adapters/out/AdminServiceClient";
import { getViberConfig } from "../../config/viber";
import { BotSettings } from "../types/BotSettings";
import { IEventHandler } from "../handlers/IEventHandler";
import { BotDataService } from "./BotDataService";

/**
 * Viber Bot Service
 *
 * Manages ViberBot instance lifecycle:
 * - Fetches bot settings from admin service
 * - Initializes ViberBot with token and settings
 * - Provides bot instance for event handlers
 * - Handles initialization errors gracefully
 */
export class ViberBotService {
  private bot: Bot | null = null;
  private adminServiceClient: IAdminServiceClient;
  private config: ReturnType<typeof getViberConfig>;
  private settings: BotSettings | null = null;
  private initialized: boolean = false;
  private handlers: IEventHandler[] = [];
  private botDataService: BotDataService;

  constructor(adminServiceClient?: IAdminServiceClient) {
    this.adminServiceClient = adminServiceClient || new AdminServiceClient();
    this.config = getViberConfig();
    this.botDataService = new BotDataService(this.adminServiceClient);
  }

  /**
   * Initialize the Viber bot
   *
   * This method:
   * 1. Fetches bot settings from admin service
   * 2. Fetches steps, messages, and keyboards from admin service via BotDataService
   * 3. Initializes ViberBot with token and settings
   * 4. Configures bot with name and avatar
   *
   * @throws Error if settings cannot be fetched or bot initialization fails
   */
  async initializeBot(): Promise<void> {
    // Prevent multiple initializations
    if (this.initialized && this.bot) {
      console.log("Bot already initialized, skipping...");
      return;
    }

    try {
      // Fetch bot settings from admin service (critical - fail if this fails)
      console.log("Fetching bot settings from admin service...");
      this.settings = await this.adminServiceClient.getBotSettings();
      console.log("Bot settings fetched successfully");

      // Fetch steps, messages, and keyboards (non-critical - continue even if fails)
      try {
        await this.botDataService.fetchAllData();
      } catch (error) {
        // Non-critical: log warning but continue initialization
        // BotDataService already handles individual fetch errors gracefully,
        // but catch any unexpected errors here to ensure initialization continues
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Failed to fetch bot data (steps/messages/keyboards) - continuing initialization: ${errorMessage}`
        );
      }

      // Validate required configuration
      if (!this.config.token) {
        throw new Error(
          "Viber bot token not configured. Set VIBER_BOT_TOKEN environment variable."
        );
      }

      // Determine bot name (prefer botViberName, fallback to botName)
      const botName = this.settings.botViberName || this.settings.botName;

      // Initialize ViberBot
      console.log(`Initializing ViberBot with name: ${botName}`);
      this.bot = new Bot({
        authToken: this.config.token,
        name: botName,
        avatar: this.settings.avatarURL || undefined, // ViberBot expects undefined instead of null
      });

      this.initialized = true;
      console.log("ViberBot initialized successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to initialize ViberBot:", errorMessage);

      // Re-throw with context
      throw new Error(`ViberBot initialization failed: ${errorMessage}`);
    }
  }

  /**
   * Get the BotDataService instance
   *
   * Provides access to bot data (steps, messages, keyboards) for other services
   * that need to query this data.
   *
   * @returns BotDataService instance
   */
  getBotDataService(): BotDataService {
    return this.botDataService;
  }

  /**
   * Register webhook URL with Viber API
   *
   * This method calls the Viber API to set the webhook URL.
   * The webhook URL must be publicly accessible and HTTPS.
   *
   * @throws Error if webhook registration fails
   */
  async registerWebhook(): Promise<void> {
    if (!this.bot) {
      throw new Error("Bot not initialized. Call initializeBot() first.");
    }

    if (!this.config.webhookUrl) {
      throw new Error(
        "Webhook URL not configured. Set VIBER_BOT_WEBHOOK_URL or PUBLIC_URL environment variable."
      );
    }

    try {
      console.log(`Registering webhook URL: ${this.config.webhookUrl}`);
      await this.bot.setWebhook(this.config.webhookUrl);
      console.log("Webhook registered successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to register webhook:", errorMessage);
      throw new Error(`Webhook registration failed: ${errorMessage}`);
    }
  }

  /**
   * Register event handlers with the bot
   *
   * This method registers all provided event handlers with the bot instance.
   * Handlers must implement IEventHandler interface.
   *
   * @param handlers Array of event handler instances
   */
  registerEventHandlers(handlers: IEventHandler[]): void {
    if (!this.bot) {
      throw new Error("Bot not initialized. Call initializeBot() first.");
    }

    this.handlers = handlers;

    console.log(`Registering ${handlers.length} event handlers...`);
    handlers.forEach((handler) => {
      try {
        handler.register(this.bot!);
        console.log(`Handler registered: ${handler.constructor.name}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to register handler ${handler.constructor.name}:`,
          errorMessage
        );
        // Continue registering other handlers even if one fails
      }
    });

    console.log("Event handlers registration completed");
  }

  /**
   * Get the ViberBot instance
   *
   * @returns The initialized ViberBot instance
   * @throws Error if bot is not initialized
   */
  getBot(): Bot {
    if (!this.bot) {
      throw new Error("Bot not initialized. Call initializeBot() first.");
    }
    return this.bot;
  }

  /**
   * Get current bot settings
   *
   * @returns Current bot settings or null if not initialized
   */
  getSettings(): BotSettings | null {
    return this.settings;
  }

  /**
   * Refresh bot settings from admin service
   *
   * This method re-fetches settings and updates bot configuration.
   * Note: ViberBot doesn't support runtime name/avatar changes,
   * so this is mainly for updating internal settings reference.
   *
   * @throws Error if settings cannot be fetched
   */
  async refreshSettings(): Promise<void> {
    try {
      console.log("Refreshing bot settings from admin service...");
      this.settings = await this.adminServiceClient.getBotSettings();
      console.log("Bot settings refreshed successfully");

      // Note: ViberBot doesn't support changing name/avatar after initialization
      // If we need to update bot configuration, we would need to reinitialize
      // For now, we just update the internal settings reference
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("Failed to refresh bot settings:", errorMessage);
      throw new Error(`Failed to refresh bot settings: ${errorMessage}`);
    }
  }

  /**
   * Check if bot is initialized
   *
   * @returns true if bot is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized && this.bot !== null;
  }
}
