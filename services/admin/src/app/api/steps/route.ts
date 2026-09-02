/**
 * GET /api/steps — list steps
 * POST /api/steps — create step
 */

import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import { MessageRepository } from "@/domains/message/MessageRepository";
import { MessageModel } from "@/domains/message/MessageModel";
import { KeyboardRepository } from "@/domains/keyboard/KeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";
import {
  StepService,
  type CreateStepInput,
  type ListStepsFilters,
} from "@/domains/step/StepService";
import {
  withDb,
  jsonOk,
  parsePagination,
  parseBoolParam,
  notifyRefresh,
  requireString,
  requireNonEmptyArray,
} from "@/lib/api/routeHelpers";

const createStepService = (): StepService =>
  new StepService(
    new StepRepository(StepModel),
    new MessageRepository(MessageModel),
    new KeyboardRepository(KeyboardModel)
  );

export async function GET(request: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(request.url);
    const filters: ListStepsFilters = {};

    const hidden = parseBoolParam(searchParams.get("hidden"));
    if (hidden !== undefined) {
      filters.hidden = hidden;
    }
    const isAi = parseBoolParam(searchParams.get("isAi"));
    if (isAi !== undefined) {
      filters.isAi = isAi;
    }
    const triggerParam = searchParams.get("trigger");
    if (triggerParam !== null) {
      filters.trigger = triggerParam;
    }
    const search = searchParams.get("search") || undefined;
    if (search) {
      filters.search = search;
    }

    const result = await createStepService().list(
      filters,
      parsePagination(searchParams)
    );
    return jsonOk(result);
  }, { fallback: "An unexpected error occurred while listing steps" });
}

export async function POST(request: Request) {
  return withDb(
    async () => {
      const body = await request.json();

      const nameError = requireString(
        body.humanReadableName,
        "humanReadableName"
      );
      if (nameError) {
        return nameError;
      }
      const triggerError = requireNonEmptyArray(body.trigger, "trigger");
      if (triggerError) {
        return triggerError;
      }
      const contentError = requireNonEmptyArray(body.content, "content");
      if (contentError) {
        return contentError;
      }

      const input: CreateStepInput = {
        humanReadableName: body.humanReadableName.trim(),
        trigger: body.trigger,
        content: body.content,
        keyboard: body.keyboard ?? null,
        hidden: body.hidden ?? false,
        isAi: body.isAi ?? false,
      };

      const stepDTO = await createStepService().create(input);
      notifyRefresh("steps");
      return jsonOk(stepDTO, 201);
    },
    {
      fallback: "An unexpected error occurred while creating step",
      notFoundIsValidation: true,
    }
  );
}
