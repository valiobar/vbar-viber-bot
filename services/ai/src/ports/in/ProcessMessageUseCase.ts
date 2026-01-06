import { MessageRequest, MessageResponse } from "../../domains/ai/entities";

/**
 * Port interface for processing messages through the AI service
 * This is an inbound port (use case) that defines the contract for message processing
 */
export interface ProcessMessageUseCase {
  /**
   * Execute message processing
   * @param request - Message request containing user message and context
   * @returns Promise resolving to message response with AI-generated content
   */
  execute(request: MessageRequest): Promise<MessageResponse>;
}

