/**
 * Message Response domain entity
 * Represents the response from the AI service after processing a message
 */
export class MessageResponse {
  public readonly response: string;
  public readonly model?: string;
  public readonly tokensUsed?: number;
  public readonly processingTimeMs?: number;

  constructor(
    response: string,
    model?: string,
    tokensUsed?: number,
    processingTimeMs?: number
  ) {
    // Validate required fields
    if (!response || response.trim().length === 0) {
      throw new Error("Response is required");
    }

    this.response = response.trim();
    this.model = model;
    this.tokensUsed = tokensUsed;
    this.processingTimeMs = processingTimeMs;
  }
}

