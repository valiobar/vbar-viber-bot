import type { AvailableStep } from "@vbar/shared";
import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import { MessageRepository } from "@/domains/message/MessageRepository";
import { MessageModel } from "@/domains/message/MessageModel";
import { KeyboardRepository } from "@/domains/keyboard/KeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";
import { StepService } from "@/domains/step/StepService";
import { connectToDatabase } from "@/lib/mongodb";

const MAX_STEPS_IN_PROMPT = 200;
const AVAILABLE_STEPS_TTL_MS = 15 * 60 * 1000;

type CatalogCache = { steps: AvailableStep[]; expiresAt: number };

let catalogCache: CatalogCache | null = null;

const createStepService = (): StepService =>
  new StepService(
    new StepRepository(StepModel),
    new MessageRepository(MessageModel),
    new KeyboardRepository(KeyboardModel)
  );

export const invalidateAvailableStepsCache = (): void => {
  catalogCache = null;
};

const fetchAvailableSteps = async (): Promise<AvailableStep[]> => {
  const { steps } = await createStepService().list(undefined, {
    page: 1,
    limit: MAX_STEPS_IN_PROMPT,
  });
  return steps
    .map((step) => ({
      name: step.humanReadableName,
      triggers: step.trigger,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const loadAvailableSteps = async (): Promise<AvailableStep[]> => {
  if (catalogCache && Date.now() < catalogCache.expiresAt) {
    return catalogCache.steps;
  }
  await connectToDatabase();
  const steps = await fetchAvailableSteps();
  catalogCache = { steps, expiresAt: Date.now() + AVAILABLE_STEPS_TTL_MS };
  return steps;
};

export const withAvailableSteps = async <T extends Record<string, unknown>>(
  body: T
): Promise<T & { availableSteps: AvailableStep[] }> => {
  let availableSteps: AvailableStep[] = [];
  try {
    availableSteps = await loadAvailableSteps();
  } catch (error) {
    console.error("Failed to load steps for AI builder catalog", error);
  }
  return { ...body, availableSteps };
};
