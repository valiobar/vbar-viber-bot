/**
 * Admin Service Client Adapter
 *
 * Output adapter for communicating with the Admin Service API.
 * This adapter implements the IAdminServiceClient port interface
 * following Hexagonal Architecture principles.
 *
 * Location: Output Adapters layer (Hexagonal Architecture)
 */

import { IAdminServiceClient } from "../../ports/out/IAdminServiceClient";
import { BotSettings } from "../../application/types/BotSettings";
import { getViberConfig } from "../../config/viber";
import type { ApiResponse } from "@vbar/shared";
import type {
  StepDTO,
  MessageDTO,
  KeyboardDTO,
} from "../../application/types/DTOs";

/**
 * Admin Service Client
 *
 * Implements HTTP client for admin service communication with:
 * - Service-to-service authentication using X-Service-Token header
 * - Error handling for network, HTTP, and parsing errors
 * - Retry logic with exponential backoff for transient failures
 */
export class AdminServiceClient implements IAdminServiceClient {
  private readonly baseUrl: string;
  private readonly serviceToken: string | null;
  private readonly timeout: number = 30000; // 30 seconds

  constructor() {
    const config = getViberConfig();
    this.baseUrl = config.adminServiceUrl.replace(/\/$/, ""); // Remove trailing slash
    this.serviceToken = config.adminServiceToken;
  }

  /**
   * Fetch bot settings from admin service
   *
   * @returns Bot settings including name, avatar, and configuration
   * @throws Error if request fails or settings cannot be retrieved
   */
  async getBotSettings(): Promise<BotSettings> {
    const url = `${this.baseUrl}/api/bot-settings`;
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: "GET",
          headers: this.buildHeaders(),
        });

        // Handle HTTP errors
        if (!response.ok) {
          const error = await this.handleHttpError(
            response,
            attempt,
            maxRetries
          );
          if (error.shouldRetry && attempt < maxRetries) {
            await this.waitBeforeRetry(attempt);
            continue;
          }
          throw error.error;
        }

        // Parse response
        const data = (await response.json()) as ApiResponse<BotSettings>;

        // Validate response structure
        if (!data.data) {
          if (data.error) {
            throw new Error(
              `Admin service error: ${data.error.message} (code: ${data.error.code})`
            );
          }
          throw new Error("Invalid response from admin service: missing data");
        }

        return data.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a retryable error
        if (this.isRetryableError(lastError) && attempt < maxRetries) {
          console.warn(
            `Admin service request failed (attempt ${attempt + 1}/${
              maxRetries + 1
            }):`,
            lastError.message
          );
          await this.waitBeforeRetry(attempt);
          continue;
        }

        // Non-retryable error or max retries reached
        throw lastError;
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error("Failed to fetch bot settings");
  }

  /**
   * Fetch all non-hidden steps from admin service
   *
   * @returns Array of StepDTO objects
   * @throws Error if request fails or steps cannot be retrieved
   */
  async getSteps(): Promise<StepDTO[]> {
    return this.fetchPaginatedData<StepDTO>(
      "/api/steps",
      "steps",
      "Failed to fetch steps"
    );
  }

  /**
   * Fetch all non-hidden messages from admin service
   *
   * @returns Array of MessageDTO objects
   * @throws Error if request fails or messages cannot be retrieved
   */
  async getMessages(): Promise<MessageDTO[]> {
    return this.fetchPaginatedData<MessageDTO>(
      "/api/messages",
      "messages",
      "Failed to fetch messages"
    );
  }

  /**
   * Fetch all non-hidden keyboards from admin service
   *
   * @returns Array of KeyboardDTO objects
   * @throws Error if request fails or keyboards cannot be retrieved
   */
  async getKeyboards(): Promise<KeyboardDTO[]> {
    return this.fetchPaginatedData<KeyboardDTO>(
      "/api/keyboards",
      "keyboards",
      "Failed to fetch keyboards"
    );
  }

  /**
   * Helper method to fetch paginated data from admin service
   * Handles pagination automatically to fetch all items
   *
   * @param endpoint - API endpoint path
   * @param dataKey - Key in the response data object (e.g., "steps", "messages", "keyboards")
   * @param errorMessage - Error message prefix for failures
   * @returns Array of all items across all pages
   * @throws Error if request fails
   */
  private async fetchPaginatedData<T>(
    endpoint: string,
    dataKey: "steps" | "messages" | "keyboards",
    errorMessage: string
  ): Promise<T[]> {
    const maxRetries = 3;
    const pageLimit = 100; // Maximum limit per page (admin service max)
    let allItems: T[] = [];
    let currentPage = 1;
    let hasMorePages = true;
    let lastError: Error | null = null;

    while (hasMorePages) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const extra = dataKey === "keyboards" ? "&isTemplate=false" : "";
          const url = `${this.baseUrl}${endpoint}?hidden=false${extra}&page=${currentPage}&limit=${pageLimit}`;
          const response = await this.fetchWithTimeout(url, {
            method: "GET",
            headers: this.buildHeaders(),
          });

          // Handle HTTP errors
          if (!response.ok) {
            const error = await this.handleHttpError(
              response,
              attempt,
              maxRetries
            );
            if (error.shouldRetry && attempt < maxRetries) {
              await this.waitBeforeRetry(attempt);
              continue;
            }
            throw error.error;
          }

          // Parse response - response structure varies by endpoint
          const data = (await response.json()) as ApiResponse<
            | {
                steps: T[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
              }
            | {
                messages: T[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
              }
            | {
                keyboards: T[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
              }
          >;

          // Validate response structure
          if (!data.data) {
            if (data.error) {
              throw new Error(
                `Admin service error: ${data.error.message} (code: ${data.error.code})`
              );
            }
            throw new Error(
              `Invalid response from admin service: missing data`
            );
          }

          // Extract items from response based on dataKey
          let items: T[] = [];
          let totalPages = 0;

          if (dataKey === "steps" && "steps" in data.data) {
            items = data.data.steps as T[];
            totalPages = data.data.totalPages;
          } else if (dataKey === "messages" && "messages" in data.data) {
            items = data.data.messages as T[];
            totalPages = data.data.totalPages;
          } else if (dataKey === "keyboards" && "keyboards" in data.data) {
            items = data.data.keyboards as T[];
            totalPages = data.data.totalPages;
          } else {
            throw new Error(
              `Invalid response structure: expected ${dataKey} in response data`
            );
          }

          allItems = allItems.concat(items);

          // Check if there are more pages
          hasMorePages = currentPage < totalPages;
          if (hasMorePages) {
            currentPage++;
          }

          // Successfully fetched this page, break retry loop
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Check if this is a retryable error
          if (this.isRetryableError(lastError) && attempt < maxRetries) {
            console.warn(
              `${errorMessage} (attempt ${attempt + 1}/${maxRetries + 1}):`,
              lastError.message
            );
            await this.waitBeforeRetry(attempt);
            continue;
          }

          // Non-retryable error or max retries reached
          throw lastError;
        }
      }
    }

    return allItems;
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Service-Name": "viber",
    };

    // Add service token if configured
    if (this.serviceToken) {
      headers["X-Service-Token"] = this.serviceToken;
    }

    return headers;
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleHttpError(
    response: Response,
    attempt: number,
    maxRetries: number
  ): Promise<{ error: Error; shouldRetry: boolean }> {
    const status = response.status;
    let errorMessage: string;
    let shouldRetry = false;

    try {
      const errorData = (await response.json()) as ApiResponse;
      if (errorData.error) {
        errorMessage = `Admin service error: ${errorData.error.message} (code: ${errorData.error.code})`;
      } else {
        errorMessage = `Admin service returned status ${status}`;
      }
    } catch {
      // If we can't parse the error response, use status text
      errorMessage = `Admin service returned status ${status}: ${response.statusText}`;
    }

    switch (status) {
      case 401:
        // Unauthorized - don't retry
        return {
          error: new Error(
            "Admin service authentication failed. Check ADMIN_SERVICE_TOKEN configuration."
          ),
          shouldRetry: false,
        };

      case 404:
        // Not found - don't retry
        return {
          error: new Error("Bot settings not found in admin service"),
          shouldRetry: false,
        };

      case 429:
        // Rate limited - retry with backoff
        shouldRetry = attempt < maxRetries;
        return {
          error: new Error(
            `Admin service rate limit exceeded: ${errorMessage}`
          ),
          shouldRetry,
        };

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors - retry
        shouldRetry = attempt < maxRetries;
        return {
          error: new Error(`Admin service unavailable: ${errorMessage}`),
          shouldRetry,
        };

      default:
        // Other client errors (4xx) - don't retry
        return {
          error: new Error(errorMessage),
          shouldRetry: false,
        };
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      "timeout",
      "network",
      "connection",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
    ];

    return retryableMessages.some((msg) =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Wait before retry with exponential backoff
   */
  private async waitBeforeRetry(attempt: number): Promise<void> {
    // Exponential backoff: 1s, 2s, 4s
    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
