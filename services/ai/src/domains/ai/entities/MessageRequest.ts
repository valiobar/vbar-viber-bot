/**
 * Message Request domain entity
 * Represents a request to process a message through the AI service
 */
export class MessageRequest {
  public readonly messageContent: string;
  public readonly messageType: string;
  public readonly userId: string;
  public readonly stepId: string;
  public readonly userProfile?: {
    id: string;
    name: string;
    avatar?: string;
  };

  constructor(
    messageContent: string,
    messageType: string,
    userId: string,
    stepId: string,
    userProfile?: { id: string; name: string; avatar?: string }
  ) {
    // Validate required fields
    if (!messageContent || messageContent.trim().length === 0) {
      throw new Error("Message content is required");
    }
    if (!messageType || messageType.trim().length === 0) {
      throw new Error("Message type is required");
    }
    if (!userId || userId.trim().length === 0) {
      throw new Error("User ID is required");
    }
    if (!stepId || stepId.trim().length === 0) {
      throw new Error("Step ID is required");
    }

    this.messageContent = messageContent.trim();
    this.messageType = messageType.trim();
    this.userId = userId.trim();
    this.stepId = stepId.trim();
    this.userProfile = userProfile;
  }
}

