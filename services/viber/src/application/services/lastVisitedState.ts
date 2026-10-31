/**
 * Shared last-visited list update.
 *
 * buildLastVisited prepends { title, image, trigger } onto state.lastVisited.
 * A repeat of the same trigger is moved to the front. Only the first 6
 * entries are kept. When any of the three fields is missing, the list is
 * left unchanged.
 *
 * Callers pass the visit explicitly. This module does not read lastTitle,
 * lastImage, or lastTrigger from user state, and it does not write state.
 * The saveLastVisited response handler returns the built list so
 * MessageHandler applies one patch.
 */

const VISITED_PROP = "lastVisited";

const MAX_VISITED = 6;

export interface LastVisitedEntry {
  title: string;
  image: string;
  trigger: string;
}

export interface LastVisitedInput {
  title: unknown;
  image: unknown;
  trigger: unknown;
}

export interface SaveLastVisitedResult {
  saved: boolean;
  title: string;
  image: string;
  trigger: string;
  lastVisited: unknown[];
}

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return "";
};

export const isLastVisitedEntry = (item: unknown): item is LastVisitedEntry => {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<LastVisitedEntry>;
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim() !== "" &&
    typeof candidate.image === "string" &&
    candidate.image.trim() !== "" &&
    typeof candidate.trigger === "string" &&
    candidate.trigger.trim() !== ""
  );
};

export function buildLastVisited(
  state: Record<string, unknown> | undefined,
  entry: LastVisitedInput
): SaveLastVisitedResult {
  const current = state ?? {};
  const title = asString(entry.title).trim();
  const image = asString(entry.image).trim();
  const trigger = asString(entry.trigger).trim();
  const existing: unknown[] = Array.isArray(current[VISITED_PROP])
    ? (current[VISITED_PROP] as unknown[])
    : [];

  if (!title || !image || !trigger) {
    return { saved: false, title, image, trigger, lastVisited: existing };
  }

  const visit: LastVisitedEntry = { title, image, trigger };
  const lastVisited = [
    visit,
    ...existing.filter((item: unknown) => {
      if (!item || typeof item !== "object") return true;
      return asString((item as { trigger?: unknown }).trigger).trim() !== trigger;
    }),
  ].slice(0, MAX_VISITED);

  return { saved: true, title, image, trigger, lastVisited };
}
