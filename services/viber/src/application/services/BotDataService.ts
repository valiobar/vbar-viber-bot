/**
 * Bot Data Service
 *
 * Application service for fetching and managing bot data (steps, messages, keyboards, carousels)
 * from the admin service. This service handles:
 * - Fetching data from admin service
 * - Building efficient indexes for fast lookup
 * - Storing data in memory
 * - Providing access to stored data
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { IAdminServiceClient } from "../../ports/out/IAdminServiceClient";
import { StepsData, MessagesData, KeyboardsData, CarouselsData } from "../types/BotData";
import type { StepDTO, MessageDTO, KeyboardDTO, CarouselDTO } from "../types/DTOs";

/**
 * Bot Data Service
 *
 * Manages fetching and storage of steps, messages, keyboards, and carousels:
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
  private carouselsData: CarouselsData | null = null;

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

      const aiSteps = stepsArray
        .filter((step) => step.isAi)
        .map((step) => `${step.humanReadableName} (${step.id})`);
      console.log(
        `Steps fetched and stored successfully: ${stepsArray.length} steps, ${stepsByTriggerMap.size} unique triggers` +
          (aiSteps.length > 0
            ? `, AI steps: ${aiSteps.join(", ")}`
            : ", AI steps: none")
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
   * 1. Fetches all non-hidden messages from admin service
   * 2. Stores the full catalog (handlers look up by id or name)
   * 3. Warns if a step references a message that is missing
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

      // Store the full catalog so handlers can reuse messages by name,
      // including ones not attached to a step.
      const messagesMap = new Map<string, MessageDTO>();
      let missingCount = 0;

      for (const message of messagesArray) {
        messagesMap.set(message.id, message);
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
        `Messages fetched and stored successfully: ${messagesMap.size} messages stored${
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
   * 1. Fetches all non-hidden keyboards from admin service
   * 2. Stores the full catalog (handlers look up by id or name)
   * 3. Warns if a step references a keyboard that is missing
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

      // Store the full catalog so handlers can reuse keyboards by name,
      // including ones not attached to a step.
      const keyboardsMap = new Map<string, KeyboardDTO>();
      let missingCount = 0;

      for (const keyboard of keyboardsArray) {
        keyboardsMap.set(keyboard.id, keyboard);
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
        `Keyboards fetched and stored successfully: ${keyboardsMap.size} keyboards stored${
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
   * Fetch carousels from admin service and store in memory
   *
   * This method:
   * 1. Fetches all non-hidden carousels from admin service
   * 2. Stores the full catalog (handlers look up by id or name)
   * 3. Warns if a rich-media message references a carousel that is missing
   *
   * Depends on messages being loaded first (referenced IDs live in message content).
   * Errors are logged but don't fail initialization
   */
  async fetchAndStoreCarousels(): Promise<void> {
    try {
      console.log("Fetching carousels from admin service...");
      const carouselsArray = await this.adminServiceClient.getCarousels();

      // Referenced carousel IDs come from rich-media message content
      const referencedCarouselIds = new Set<string>();
      if (this.messagesData) {
        for (const message of this.messagesData.messages.values()) {
          if (message.type === "rich-media") {
            const carouselId = (message.content as any)?.carousel?.id;
            if (carouselId) referencedCarouselIds.add(carouselId);
          }
        }
      }

      const carouselsMap = new Map<string, CarouselDTO>();
      for (const carousel of carouselsArray) {
        carouselsMap.set(carousel.id, carousel);
      }

      for (const carouselId of referencedCarouselIds) {
        if (!carouselsMap.has(carouselId)) {
          console.warn(`Carousel ID ${carouselId} referenced by messages but not found in admin service`);
        }
      }

      this.carouselsData = { carousels: carouselsMap };
      console.log(`Carousels fetched and stored successfully: ${carouselsMap.size} carousels stored`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Failed to fetch carousels from admin service (non-critical): ${errorMessage}`);
      this.carouselsData = { carousels: new Map() };
    }
  }

  /**
   * Fetch all bot data (steps, messages, keyboards, carousels) from admin service
   *
   * This method orchestrates fetching all data in the correct order:
   * 1. Steps (must be fetched first)
   * 2. Messages (depends on steps to filter referenced messages)
   * 3. Keyboards (depends on steps to filter referenced keyboards)
   * 4. Carousels (depends on messages — referenced IDs live in rich-media content)
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
    // Carousels depend on messages (referenced IDs live in rich-media message content)
    await this.fetchAndStoreCarousels();
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
   * Get carousels data
   *
   * @returns CarouselsData or null if not fetched yet
   */
  getCarouselsData(): CarouselsData | null {
    return this.carouselsData;
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
   * Get a carousel by ID
   *
   * @param carouselId Carousel ID to lookup
   * @returns CarouselDTO or undefined if not found
   */
  getCarouselById(carouselId: string): CarouselDTO | undefined {
    return this.carouselsData?.carousels.get(carouselId);
  }

  getSteps(): StepDTO[] {
    return this.stepsData ? [...this.stepsData.steps.values()] : [];
  }

  getMessages(): MessageDTO[] {
    return this.messagesData ? [...this.messagesData.messages.values()] : [];
  }

  getKeyboards(): KeyboardDTO[] {
    return this.keyboardsData
      ? [...this.keyboardsData.keyboards.values()]
      : [];
  }

  getCarousels(): CarouselDTO[] {
    return this.carouselsData
      ? [...this.carouselsData.carousels.values()]
      : [];
  }

  /**
   * Look up a step by `humanReadableName` (case-insensitive, trimmed).
   */
  getStepByName(name: string): StepDTO | undefined {
    return findByHumanReadableName(this.stepsData?.steps.values(), name);
  }

  /**
   * Look up a message by `humanReadableName` (case-insensitive, trimmed).
   */
  getMessageByName(name: string): MessageDTO | undefined {
    return findByHumanReadableName(this.messagesData?.messages.values(), name);
  }

  /**
   * Look up a keyboard by `humanReadableName` (case-insensitive, trimmed).
   */
  getKeyboardByName(name: string): KeyboardDTO | undefined {
    return findByHumanReadableName(
      this.keyboardsData?.keyboards.values(),
      name
    );
  }

  /**
   * Look up a carousel by `humanReadableName` (case-insensitive, trimmed).
   */
  getCarouselByName(name: string): CarouselDTO | undefined {
    return findByHumanReadableName(
      this.carouselsData?.carousels.values(),
      name
    );
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
   * Refresh carousels from admin service and update in-memory storage
   *
   * This method re-fetches carousels from admin service.
   * Errors are logged but don't throw.
   */
  async refreshCarousels(): Promise<void> {
    await this.fetchAndStoreCarousels();
  }

  /**
   * Refresh all bot data (steps, messages, keyboards, carousels) from admin service
   *
   * This method orchestrates refreshing all data in the correct order:
   * 1. Steps (must be refreshed first, rebuilds indexes)
   * 2. Messages (depends on steps to filter referenced messages)
   * 3. Keyboards (depends on steps to filter referenced keyboards)
   * 4. Carousels (depends on messages — referenced IDs live in rich-media content)
   *
   * Errors in individual refreshes are logged but don't fail the entire operation.
   * Can be called via `viberBotService.getBotDataService().refreshAllData()`
   */
  async refreshAllData(): Promise<void> {
    // Refresh steps first (required for filtering messages and keyboards)
    await this.refreshSteps();

    // Refresh messages and keyboards in parallel (they both depend on steps)
    await Promise.all([this.refreshMessages(), this.refreshKeyboards()]);
    await this.refreshCarousels();
  }
}

const normalizeName = (name: string): string => name.trim().toLowerCase();

const findByHumanReadableName = <T extends { humanReadableName: string }>(
  items: Iterable<T> | undefined,
  name: string
): T | undefined => {
  const normalized = normalizeName(name);
  if (!normalized || !items) {
    return undefined;
  }
  for (const item of items) {
    if (normalizeName(item.humanReadableName) === normalized) {
      return item;
    }
  }
  return undefined;
};
