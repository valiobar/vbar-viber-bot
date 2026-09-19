import type { AvailableStep } from "@vbar/shared";

export const resolveTriggerValue = (
  raw: string,
  steps: AvailableStep[] | undefined
): string => {
  const value = raw.trim();
  if (!value || !steps?.length) return value;
  const lower = value.toLowerCase();
  for (const step of steps) {
    const hit = step.triggers.find((trigger) => trigger.toLowerCase() === lower);
    if (hit) return hit;
  }
  const byName = steps.find((step) => step.name.toLowerCase() === lower);
  return byName?.triggers[0] ?? value;
};

export const resolveReplyActionBody = (
  actionBody: string,
  isJson: boolean,
  steps?: AvailableStep[]
): string => {
  if (!isJson) return resolveTriggerValue(actionBody, steps);
  try {
    const parsed: unknown = JSON.parse(actionBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return actionBody;
    }
    const obj = parsed as { trigger?: unknown };
    if (typeof obj.trigger === "string") {
      obj.trigger = resolveTriggerValue(obj.trigger, steps);
      return JSON.stringify(obj);
    }
  } catch {
    return actionBody;
  }
  return actionBody;
};
