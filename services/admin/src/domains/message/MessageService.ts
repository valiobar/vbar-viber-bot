/**
 * Message application service
 *
 * Route → service → repository for message CRUD.
 */

import { PaginationParams } from "@vbar/shared";
import { paginate } from "@/lib/api/paginate";
import { Message } from "./Message";
import { MessageContent } from "./MessageContent";
import { MessageType } from "./types";
import { MessageRepository, MessageFilters } from "./MessageRepository";
import { MessageDTO } from "./MessageDTO";

export interface CreateMessageInput {
  type: MessageType;
  content: object;
  url?: string | null;
  humanReadableName: string;
  hidden?: boolean;
}

export interface UpdateMessageInput {
  type?: MessageType;
  content?: object;
  url?: string | null;
  humanReadableName?: string;
  hidden?: boolean;
}

export interface ListMessagesFilters {
  hidden?: boolean;
  type?: MessageType;
  search?: string;
}

export interface ListMessagesResult {
  messages: MessageDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MessageService {
  constructor(private readonly messageRepository: MessageRepository) {}

  async list(
    filters?: ListMessagesFilters,
    pagination?: PaginationParams
  ): Promise<ListMessagesResult> {
    const repositoryFilters: MessageFilters = {
      hidden: filters?.hidden,
      type: filters?.type,
      search: filters?.search,
    };

    const result = await this.messageRepository.findAll(
      repositoryFilters,
      pagination
    );

    return {
      messages: result.messages.map((message) => MessageDTO.fromEntity(message)),
      total: result.total,
      ...paginate(result.total, pagination),
    };
  }

  async get(id: string): Promise<MessageDTO> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new Error(`Message with ID ${id} not found`);
    }
    return MessageDTO.fromEntity(message);
  }

  async create(input: CreateMessageInput): Promise<MessageDTO> {
    const message = Message.create({
      type: input.type,
      content: input.content,
      url: input.url ?? null,
      humanReadableName: input.humanReadableName,
      hidden: input.hidden ?? false,
    });
    const saved = await this.messageRepository.create(message);
    return MessageDTO.fromEntity(saved);
  }

  async update(id: string, input: UpdateMessageInput): Promise<MessageDTO> {
    const existing = await this.messageRepository.findById(id);
    if (!existing) {
      throw new Error(`Message with ID ${id} not found`);
    }

    const updatedType = input.type ?? existing.type;
    const updatedContent =
      input.content !== undefined
        ? new MessageContent(updatedType, input.content)
        : existing.content;

    const updated = new Message({
      id: existing.id,
      type: updatedType,
      content: updatedContent,
      url: input.url !== undefined ? input.url : existing.url,
      humanReadableName: input.humanReadableName ?? existing.humanReadableName,
      hidden: input.hidden ?? existing.hidden,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });

    const saved = await this.messageRepository.update(id, updated);
    return MessageDTO.fromEntity(saved);
  }

  /**
   * Deletes a message by ID.
   *
   * Orphan step references are allowed: a step may keep a deleted message ID
   * in `content`. Viber's in-memory cache already skips missing messages, so
   * blocking delete would add coupling without a user-facing failure mode.
   */
  async delete(id: string): Promise<void> {
    const message = await this.messageRepository.findById(id);
    if (!message) {
      throw new Error(`Message with ID ${id} not found`);
    }
    await this.messageRepository.delete(id);
  }
}
