/**
 * Bot Data Service
 *
 * Application service for fetching and managing bot data (steps, messages, keyboards)
 * from the admin service. This service handles:
 * - Fetching data from admin service
 * - Building efficient indexes for fast lookup
 * - Storing data in memory
 * - Providing access to stored data
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { IAdminServiceClient } from "../../ports/out/IAdminServiceClient";
import { StepsData, MessagesData, KeyboardsData } from "../types/BotData";
import type { StepDTO, MessageDTO, KeyboardDTO } from "../types/DTOs";

/**
 * Bot Data Service
 *
 * Manages fetching and storage of steps, messages, and keyboards:
 * - Fetches data from admin service
 * - Builds indexes for fast lookup (by ID, by trigger)
 * - Stores data in memory
 * - Provides access methods for retrieving stored data
 */
export class BotDataService {
  private adminServiceClient: IAdminServiceClient;
  private stepsData: StepsData | null = null;
  private messagesData: MessagesData | null = null;
  private keyboardsData: KeyboardsData | null = null;

  constructor(adminServiceClient: IAdminServiceClient) {
    this.adminServiceClient = adminServiceClient;
  }

  /**
   * Fetch steps from admin service and store in memory
   *
   * This method:
   * 1. Fetches all non-hidden steps from admin service
   * 2. Builds indexes for fast lookup (by ID and by trigger)
   * 3. Stores data in memory
   *
   * Errors are logged but don't fail initialization
   */
  async fetchAndStoreSteps(): Promise<void> {
    try {
      console.log("Fetching steps from admin service...");
      const stepsArray = await this.adminServiceClient.getSteps();

      // Build storage structure
      const stepsMap = new Map<string, StepDTO>();
      const stepsByTriggerMap = new Map<string, StepDTO[]>();

      // Store steps and build trigger index
      for (const step of stepsArray) {
        stepsMap.set(step.id, step);

        // Index by trigger strings
        for (const trigger of step.trigger) {
          if (!stepsByTriggerMap.has(trigger)) {
            stepsByTriggerMap.set(trigger, []);
          }
          stepsByTriggerMap.get(trigger)!.push(step);
        }
      }

      this.stepsData = {
        steps: stepsMap,
        stepsByTrigger: stepsByTriggerMap,
      };

      console.log(
        `Steps fetched and stored successfully: ${stepsArray.length} steps, ${stepsByTriggerMap.size} unique triggers`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to fetch steps from admin service (non-critical): ${errorMessage}`
      );
      // Initialize with empty data structure
      this.stepsData = {
        steps: new Map(),
        stepsByTrigger: new Map(),
      };
    }
  }

  /**
   * Fetch messages from admin service and store in memory
   *
   * This method:
   * 1. Extracts unique message IDs from all steps
   * 2. Fetches all non-hidden messages from admin service
   * 3. Filters to only messages referenced by steps (optimization)
   * 4. Stores data in memory
   *
   * Errors are logged but don't fail initialization
   */
  async fetchAndStoreMessages(): Promise<void> {
    try {
      console.log("Fetching messages from admin service...");
      const messagesArray = await this.adminServiceClient.getMessages();

      // Extract unique message IDs from steps
      const referencedMessageIds = new Set<string>();
      if (this.stepsData) {
        for (const step of this.stepsData.steps.values()) {
          for (const messageId of step.content) {
            referencedMessageIds.add(messageId);
          }
        }
      }

      // Build storage structure - only store messages referenced by steps
      const messagesMap = new Map<string, MessageDTO>();
      let storedCount = 0;
      let missingCount = 0;

      for (const message of messagesArray) {
        // Only store messages that are referenced by steps (if steps are loaded)
        // If steps are not loaded, store all messages
        if (
          !this.stepsData ||
          referencedMessageIds.size === 0 ||
          referencedMessageIds.has(message.id)
        ) {
          messagesMap.set(message.id, message);
          storedCount++;
        }
      }

      // Check for missing references
      if (this.stepsData && referencedMessageIds.size > 0) {
        for (const messageId of referencedMessageIds) {
          if (!messagesMap.has(messageId)) {
            missingCount++;
            console.warn(
              `Message ID ${messageId} referenced by steps but not found in admin service`
            );
          }
        }
      }

      this.messagesData = {
        messages: messagesMap,
      };

      console.log(
        `Messages fetched and stored successfully: ${storedCount} messages stored${
          missingCount > 0 ? `, ${missingCount} missing references` : ""
        }`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to fetch messages from admin service (non-critical): ${errorMessage}`
      );
      // Initialize with empty data structure
      this.messagesData = {
        messages: new Map(),
      };
    }
  }

  /**
   * Fetch keyboards from admin service and store in memory
   *
   * This method:
   * 1. Extracts unique keyboard IDs from all steps
   * 2. Fetches all non-hidden keyboards from admin service
   * 3. Filters to only keyboards referenced by steps (optimization)
   * 4. Stores data in memory
   *
   * Errors are logged but don't fail initialization
   */
  async fetchAndStoreKeyboards(): Promise<void> {
    try {
      console.log("Fetching keyboards from admin service...");
      const keyboardsArray = await this.adminServiceClient.getKeyboards();

      // Extract unique keyboard IDs from steps
      const referencedKeyboardIds = new Set<string>();
      if (this.stepsData) {
        for (const step of this.stepsData.steps.values()) {
          if (step.keyboard) {
            referencedKeyboardIds.add(step.keyboard);
          }
        }
      }

      // Build storage structure - only store keyboards referenced by steps
      const keyboardsMap = new Map<string, KeyboardDTO>();
      let storedCount = 0;
      let missingCount = 0;

      for (const keyboard of keyboardsArray) {
        // Only store keyboards that are referenced by steps (if steps are loaded)
        // If steps are not loaded, store all keyboards
        if (
          !this.stepsData ||
          referencedKeyboardIds.size === 0 ||
          referencedKeyboardIds.has(keyboard.id)
        ) {
          keyboardsMap.set(keyboard.id, keyboard);
          storedCount++;
        }
      }

      // Check for missing references
      if (this.stepsData && referencedKeyboardIds.size > 0) {
        for (const keyboardId of referencedKeyboardIds) {
          if (!keyboardsMap.has(keyboardId)) {
            missingCount++;
            console.warn(
              `Keyboard ID ${keyboardId} referenced by steps but not found in admin service`
            );
          }
        }
      }

      this.keyboardsData = {
        keyboards: keyboardsMap,
      };

      console.log(
        `Keyboards fetched and stored successfully: ${storedCount} keyboards stored${
          missingCount > 0 ? `, ${missingCount} missing references` : ""
        }`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to fetch keyboards from admin service (non-critical): ${errorMessage}`
      );
      // Initialize with empty data structure
      this.keyboardsData = {
        keyboards: new Map(),
      };
    }
  }

  /**
   * Fetch all bot data (steps, messages, keyboards) from admin service
   *
   * This method orchestrates fetching all data in the correct order:
   * 1. Steps (must be fetched first)
   * 2. Messages (depends on steps to filter referenced messages)
   * 3. Keyboards (depends on steps to filter referenced keyboards)
   *
   * Errors in individual fetches are logged but don't fail the entire operation
   */
  async fetchAllData(): Promise<void> {
    // Fetch steps first (required for filtering messages and keyboards)
    await this.fetchAndStoreSteps();

    // Fetch messages and keyboards in parallel (they both depend on steps)
    await Promise.all([
      this.fetchAndStoreMessages(),
      this.fetchAndStoreKeyboards(),
    ]);
  }

  /**
   * Get steps data
   *
   * @returns StepsData or null if not fetched yet
   */
  getStepsData(): StepsData | null {
    return this.stepsData;
  }

  /**
   * Get messages data
   *
   * @returns MessagesData or null if not fetched yet
   */
  getMessagesData(): MessagesData | null {
    return this.messagesData;
  }

  /**
   * Get keyboards data
   *
   * @returns KeyboardsData or null if not fetched yet
   */
  getKeyboardsData(): KeyboardsData | null {
    return this.keyboardsData;
  }

  /**
   * Get a step by ID
   *
   * @param stepId Step ID to lookup
   * @returns StepDTO or undefined if not found
   */
  getStepById(stepId: string): StepDTO | undefined {
    return this.stepsData?.steps.get(stepId);
  }

  /**
   * Get steps by trigger string
   *
   * @param trigger Trigger string to lookup
   * @returns Array of StepDTO objects that match the trigger, or empty array if none found
   */
  getStepsByTrigger(trigger: string): StepDTO[] {
    return this.stepsData?.stepsByTrigger.get(trigger) || [];
  }

  /**
   * Get a message by ID
   *
   * @param messageId Message ID to lookup
   * @returns MessageDTO or undefined if not found
   */
  getMessageById(messageId: string): MessageDTO | undefined {
    return this.messagesData?.messages.get(messageId);
  }

  /**
   * Get a keyboard by ID
   *
   * @param keyboardId Keyboard ID to lookup
   * @returns KeyboardDTO or undefined if not found
   */
  getKeyboardById(keyboardId: string): KeyboardDTO | undefined {
    return this.keyboardsData?.keyboards.get(keyboardId);
  }

  /**
   * Refresh steps from admin service and update in-memory storage
   *
   * This method re-fetches steps from admin service and rebuilds indexes.
   * Errors are logged but don't throw.
   */
  async refreshSteps(): Promise<void> {
    await this.fetchAndStoreSteps();
  }

  /**
   * Refresh messages from admin service and update in-memory storage
   *
   * This method re-fetches messages from admin service.
   * Errors are logged but don't throw.
   */
  async refreshMessages(): Promise<void> {
    await this.fetchAndStoreMessages();
  }

  /**
   * Refresh keyboards from admin service and update in-memory storage
   *
   * This method re-fetches keyboards from admin service.
   * Errors are logged but don't throw.
   */
  async refreshKeyboards(): Promise<void> {
    await this.fetchAndStoreKeyboards();
  }

  /**
   * Refresh all bot data (steps, messages, keyboards) from admin service
   *
   * This method orchestrates refreshing all data in the correct order:
   * 1. Steps (must be refreshed first, rebuilds indexes)
   * 2. Messages (depends on steps to filter referenced messages)
   * 3. Keyboards (depends on steps to filter referenced keyboards)
   *
   * Errors in individual refreshes are logged but don't fail the entire operation.
   * Can be called via `viberBotService.getBotDataService().refreshAllData()`
   */
  async refreshAllData(): Promise<void> {
    // Refresh steps first (required for filtering messages and keyboards)
    await this.refreshSteps();

    // Refresh messages and keyboards in parallel (they both depend on steps)
    await Promise.all([this.refreshMessages(), this.refreshKeyboards()]);
  }
}
