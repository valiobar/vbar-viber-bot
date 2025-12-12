/**
 * Types for AI Service
 */

/**
 * AI Process Message Request
 */
export interface ProcessMessageRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
    userPreferences?: Record<string, string>;
  };
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * AI Process Message Response
 */
export interface ProcessMessageResponse {
  response: string;
  intent?: {
    name: string;
    confidence: number;
  };
  entities?: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
  processingTimeMs: number;
  model: string;
}

/**
 * Detect Intent Request
 */
export interface DetectIntentRequest {
  message: string;
  userId?: string;
}

/**
 * Detect Intent Response
 */
export interface DetectIntentResponse {
  intent: {
    name: string;
    confidence: number;
  };
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
  }>;
}

/**
 * Batch Process Request
 */
export interface BatchProcessRequest {
  messages: Array<{
    message: string;
    userId: string;
    conversationId?: string;
  }>;
  options?: {
    model?: string;
    temperature?: number;
  };
}

/**
 * Batch Process Response
 */
export interface BatchProcessResponse {
  results: Array<ProcessMessageResponse>;
}

