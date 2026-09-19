import type { AvailableStep } from "@vbar/shared";

export const appendAvailableSteps = (
  parts: string[],
  steps?: AvailableStep[]
): void => {
  if (!steps?.length) return;
  parts.push(
    `Available bot steps (map the user's wording to ONE listed step — exact name, listed trigger, or a clear paraphrase such as "greeting screen" for "Welcome". Then copy that step's FIRST trigger into ActionBody — never the step name. If they name a listed trigger, use that exact trigger. If two steps fit equally or none fit, leave ActionBody ""):\n${JSON.stringify(steps)}`
  );
};
