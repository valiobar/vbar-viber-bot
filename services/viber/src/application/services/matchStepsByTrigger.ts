/**
 * Find steps whose trigger[] matches a normalized (lowercase) trigger.
 *
 * Exact map lookup first, then a case-insensitive scan of all steps.
 * Service-local: it depends on BotDataService, so it stays out of @vbar/shared.
 */

import { StepDTO } from "../types/DTOs";
import { BotDataService } from "./BotDataService";

export function matchStepsByTrigger(
  normalizedTrigger: string,
  botDataService: BotDataService
): StepDTO[] {
  const matchingSteps = botDataService.getStepsByTrigger(normalizedTrigger);
  if (matchingSteps.length === 0) {
    const stepsData = botDataService.getStepsData();
    if (stepsData) {
      for (const step of stepsData.steps.values()) {
        for (const trigger of step.trigger) {
          if (trigger.toLowerCase() === normalizedTrigger) {
            matchingSteps.push(step);
            break;
          }
        }
      }
    }
  }
  return matchingSteps;
}
