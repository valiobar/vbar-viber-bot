/**
 * min_api_version for an outgoing Viber message.
 * Prefer the recipient's client apiVersion. Use 8 when it is missing.
 * Viber requires an integer.
 */
export const FALLBACK_MIN_API_VERSION = 8;

export function resolveUserMinApiVersion(apiVersion: unknown): number {
  const parsed = typeof apiVersion === "number" ? apiVersion : Number(apiVersion);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return FALLBACK_MIN_API_VERSION;
  }
  return Math.floor(parsed);
}
