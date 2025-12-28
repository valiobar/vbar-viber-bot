/**
 * In-Memory Storage Types for Bot Data
 *
 * Defines TypeScript interfaces for storing steps, messages, and keyboards
 * in memory for fast access during bot operations.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { StepDTO, MessageDTO, KeyboardDTO } from "./DTOs";

/**
 * Steps Data Structure
 *
 * Stores steps in two indexes:
 * - `steps`: Direct lookup by step ID (O(1) access)
 * - `stepsByTrigger`: Lookup by trigger string, returns array of matching steps
 */
export interface StepsData {
  /**
   * Map of steps indexed by step ID
   * Key: step ID (string)
   * Value: StepDTO object
   */
  steps: Map<string, StepDTO>;

  /**
   * Map of steps indexed by trigger string
   * Key: trigger string
   * Value: array of StepDTO objects that match this trigger
   */
  stepsByTrigger: Map<string, StepDTO[]>;
}

/**
 * Messages Data Structure
 *
 * Stores messages indexed by message ID for fast lookup.
 */
export interface MessagesData {
  /**
   * Map of messages indexed by message ID
   * Key: message ID (string)
   * Value: MessageDTO object
   */
  messages: Map<string, MessageDTO>;
}

/**
 * Keyboards Data Structure
 *
 * Stores keyboards indexed by keyboard ID for fast lookup.
 */
export interface KeyboardsData {
  /**
   * Map of keyboards indexed by keyboard ID
   * Key: keyboard ID (string)
   * Value: KeyboardDTO object
   */
  keyboards: Map<string, KeyboardDTO>;
}
