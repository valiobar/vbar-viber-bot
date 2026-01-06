/**
 * Conversation Context domain entity
 * Represents the conversation history and context for a user
 */
export class ConversationContext {
  public readonly userId: string;
  public readonly messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  public readonly metadata?: Record<string, any>;

  constructor(
    userId: string,
    messages: Array<{
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }> = [],
    metadata?: Record<string, any>
  ) {
    // Validate required fields
    if (!userId || userId.trim().length === 0) {
      throw new Error("User ID is required");
    }

    this.userId = userId.trim();
    this.messages = messages;
    this.metadata = metadata;
  }

  /**
   * Add a message to the conversation history
   * @param role - Message role (user or assistant)
   * @param content - Message content
   */
  public addMessage(role: "user" | "assistant", content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error("Message content is required");
    }

    this.messages.push({
      role,
      content: content.trim(),
      timestamp: new Date(),
    });
  }

  /**
   * Get recent messages from conversation history
   * @param count - Number of recent messages to retrieve
   * @returns Array of recent messages (role and content only)
   */
  public getRecentMessages(
    count: number
  ): Array<{ role: string; content: string }> {
    if (count <= 0) {
      return [];
    }

    const recentMessages = this.messages.slice(-count);
    return recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}


