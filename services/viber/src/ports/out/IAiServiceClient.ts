/**
 * Output port interface for AI Service Client
 *
 * Defines the contract for communicating with the AI Service via gRPC.
 * This is a port in the Hexagonal Architecture pattern.
 */
export interface IAiServiceClient {
  /**
   * Process a message through the AI service
   *
   * @param data - Message data to process
   * @param data.messageContent - Extracted content from the message (text, URL, etc.)
   * @param data.messageType - Type of message (text, picture, video, file, location, contact, sticker, url)
   * @param data.userId - Viber user ID
   * @param data.stepId - Current step ID
   * @param data.userProfile - User profile (optional)
   * @param data.taskType - Task type: "simple", "rag", or "custom" (optional)
   * @returns Promise resolving to AI service response
   * @throws Error if request fails or processing cannot be completed
   */
  processMessage(data: {
    messageContent: string;
    messageType: string;
    userId: string;
    stepId: string;
    userProfile?: {
      id: string;
      name: string;
      avatar?: string;
    };
    taskType?: string;
  }): Promise<{ response: string }>;
}
