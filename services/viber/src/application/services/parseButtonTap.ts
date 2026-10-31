/**
 * Prefixed button-tap parsing.
 *
 * Detects a buttons prefix case-insensitively, strips it, and parses a
 * JSON object action body when the remaining text is one. Service-local:
 * only the viber message flow uses it, so it stays out of @vbar/shared.
 */

export interface ButtonTap {
  /** Full message text including the prefix */
  raw: string;
  /** Text with the prefix removed and trimmed */
  text: string;
  /** Parsed JSON object action body, null for plain-text buttons */
  payload: Record<string, any> | null;
}

/**
 * Parse text as a JSON object payload.
 * Returns the object, or null if the text is not valid JSON or not a plain object.
 */
export function parseJsonPayload(text: string): Record<string, any> | null {
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, any>)
      : null;
  } catch {
    return null;
  }
}

/** Returns null when prefix is empty or the text does not contain it (case-insensitive) */
export function parseButtonTap(text: string, prefix?: string | null): ButtonTap | null {
  if (!prefix || prefix.trim() === "") return null;
  const index = text.toLowerCase().indexOf(prefix.toLowerCase());
  if (index === -1) return null;
  const stripped = (text.substring(0, index) + text.substring(index + prefix.length)).trim();
  return { raw: text, text: stripped, payload: parseJsonPayload(stripped) };
}
