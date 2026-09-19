import type { ButtonFrame } from "@vbar/shared";

export const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export const clamp = (n: unknown, min: number, max: number, fallback: number): number => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.min(max, Math.max(min, v));
};

export const hexOrNull = (v: unknown): string | null =>
  typeof v === "string" && HEX_COLOR.test(v) ? v : null;

/**
 * Shared "empty → keep existing" rule for both builders.
 * A valid LLM hex wins; otherwise the matched existing value; otherwise fallback.
 * `existing !== undefined` means the item was matched — a stored `null` bg is kept.
 */
export const pickHex = (
  raw: unknown,
  existing: string | null | undefined,
  fallback: string | null
): string | null => hexOrNull(raw) ?? (existing !== undefined ? existing : fallback);

export const pickNonEmptyString = (
  raw: unknown,
  existing: string | undefined,
  fallback: string
): string => {
  if (typeof raw === "string" && raw.trim()) return raw;
  return existing !== undefined ? existing : fallback;
};

export const pickOptionalString = (
  raw: unknown,
  existing: string | null | undefined,
  fallback: string | null
): string | null => {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return existing !== undefined ? existing : fallback;
};

export const pickClamped = (
  raw: unknown,
  min: number,
  max: number,
  existing: number | undefined,
  fallback: number
): number => clamp(raw, min, max, existing ?? fallback);

/** Lenient outermost-{} extraction — models sometimes add fences or prose. */
export function extractJsonObject<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

/** Frame rules shared by keyboard buttons and carousel CTAs. */
export function normalizeFrame(
  raw: unknown,
  fallback: ButtonFrame | null
): ButtonFrame | null {
  if (!raw || typeof raw !== "object") {
    return fallback;
  }
  const f = raw as { BorderWidth?: unknown; BorderColor?: unknown; CornerRadius?: unknown };
  const BorderColor = hexOrNull(f.BorderColor);
  if (!BorderColor) {
    return fallback;
  }
  return {
    BorderWidth: clamp(f.BorderWidth, 0, 10, 1),
    BorderColor,
    CornerRadius: clamp(f.CornerRadius, 0, 10, 0),
  };
}

/** Omitted / invalid Frame → existing (when matched), otherwise theme fallback. */
export const pickFrame = (
  raw: unknown,
  existing: ButtonFrame | null | undefined,
  fallback: ButtonFrame | null
): ButtonFrame | null =>
  normalizeFrame(raw, existing !== undefined ? existing : fallback);

export const BG_MEDIA_TYPES = ["picture", "gif"] as const;
export type BgMediaTypeValue = (typeof BG_MEDIA_TYPES)[number];
export const BG_MEDIA_SCALE_TYPES = ["fit", "crop", "fill"] as const;

export const pickBgMedia = (
  raw: unknown,
  existing: string | null | undefined
): string | null => pickOptionalString(raw, existing, null);

export const pickBgMediaType = (
  raw: unknown,
  mediaUrl: string | null,
  existing?: BgMediaTypeValue
): BgMediaTypeValue => {
  if (typeof raw === "string" && (BG_MEDIA_TYPES as readonly string[]).includes(raw)) {
    return raw as BgMediaTypeValue;
  }
  if (existing) return existing;
  if (mediaUrl && /\.gif(?:[?#]|$)/i.test(mediaUrl)) return "gif";
  return "picture";
};

export const pickBgMediaScaleType = (raw: unknown, existing?: string): string => {
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "cover") return "fill";
    if (normalized === "contain") return "fit";
    if ((BG_MEDIA_SCALE_TYPES as readonly string[]).includes(normalized)) {
      return normalized;
    }
  }
  return existing ?? "fit";
};

export const pickBgLoop = (raw: unknown, existing?: boolean): boolean => {
  if (typeof raw === "boolean") return raw;
  return existing ?? true;
};
