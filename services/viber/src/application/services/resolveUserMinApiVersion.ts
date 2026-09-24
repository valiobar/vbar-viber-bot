/**
 * Fixed min_api_version for every outgoing Viber message.
 * Viber requires an integer. 7 covers InputFieldState and carousel layout.
 */
export const MIN_API_VERSION = 7;

export const FALLBACK_MIN_API_VERSION = MIN_API_VERSION;

export function resolveUserMinApiVersion(_apiVersion?: unknown): number {
  return MIN_API_VERSION;
}
