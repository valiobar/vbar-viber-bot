/**
 * Message Domain Input Ports (Use Case Interfaces)
 *
 * Exports all use case interfaces for the Message domain.
 * These interfaces define the contracts for use case implementations.
 */

// Message Use Cases
export type {
  CreateMessageInput,
  CreateMessageUseCase,
} from "./CreateMessageUseCase";

export type {
  UpdateMessageInput,
  UpdateMessageUseCase,
} from "./UpdateMessageUseCase";

export type { DeleteMessageUseCase } from "./DeleteMessageUseCase";

export type { GetMessageUseCase } from "./GetMessageUseCase";

export type {
  ListMessagesFilters,
  ListMessagesResult,
  ListMessagesUseCase,
} from "./ListMessagesUseCase";

