/**
 * Shared last-visited state update used by saveLastVisited and recordLastVisited.
 *
 * Reads lastTitle, lastImage, and lastTrigger from user state, prepends
 * { title, image, trigger } to lastVisited, then removes those three fields.
 * A repeat of the same trigger is moved to the front. Only the first 6
 * entries are kept. When any of the three fields is missing, state is left
 * unchanged and the current lastVisited list is returned.
 */
import { IUserRepository } from "../../../ports/out/IUserRepository";

const TITLE_PROP = "lastTitle";
const IMAGE_PROP = "lastImage";
const TRIGGER_PROP = "lastTrigger";
const VISITED_PROP = "lastVisited";

const MAX_VISITED = 6;

export interface LastVisitedEntry {
  title: string;
  image: string;
  trigger: string;
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
  if (value == null) return "";
  return String(value);
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

export async function saveLastVisitedToState(
  userRepository: IUserRepository,
  userId: string,
  state: Record<string, any> | undefined
): Promise<SaveLastVisitedResult> {
  const current = state ?? {};
  const title = asString(current[TITLE_PROP]).trim();
  const image = asString(current[IMAGE_PROP]).trim();
  const trigger = asString(current[TRIGGER_PROP]).trim();
  const existing = Array.isArray(current[VISITED_PROP]) ? current[VISITED_PROP] : [];

  if (!title || !image || !trigger) {
    return { saved: false, title, image, trigger, lastVisited: existing };
  }

  const entry: LastVisitedEntry = { title, image, trigger };
  const lastVisited = [
    entry,
    ...existing.filter((item: unknown) => {
      if (!item || typeof item !== "object") return true;
      return asString((item as { trigger?: unknown }).trigger).trim() !== trigger;
    }),
  ].slice(0, MAX_VISITED);

  await userRepository.updateState(userId, {
    [VISITED_PROP]: lastVisited,
    [TITLE_PROP]: null,
    [IMAGE_PROP]: null,
    [TRIGGER_PROP]: null,
  });

  return { saved: true, title, image, trigger, lastVisited };
}
