/**
 * GET /api/steps/[id] — get step
 * PUT /api/steps/[id] — update step
 * DELETE /api/steps/[id] — delete step
 */

import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import { MessageRepository } from "@/domains/message/MessageRepository";
import { MessageModel } from "@/domains/message/MessageModel";
import { KeyboardRepository } from "@/domains/keyboard/KeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";
import {
  StepService,
  type UpdateStepInput,
} from "@/domains/step/StepService";
import {
  withDb,
  jsonOk,
  requireId,
  notifyRefresh,
  noContent,
} from "@/lib/api/routeHelpers";

const createStepService = (): StepService =>
  new StepService(
    new StepRepository(StepModel),
    new MessageRepository(MessageModel),
    new KeyboardRepository(KeyboardModel)
  );

type IdParams = { params: { id: string } };

export async function GET(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Step");
    if (idError) {
      return idError;
    }
    const stepDTO = await createStepService().get(params.id);
    return jsonOk(stepDTO);
  }, { fallback: "An unexpected error occurred while retrieving step" });
}

export async function PUT(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Step");
    if (idError) {
      return idError;
    }

    const body = await request.json();
    const input: UpdateStepInput = {};
    if (body.humanReadableName !== undefined) {
      input.humanReadableName = body.humanReadableName.trim();
    }
    if (body.trigger !== undefined) {
      input.trigger = body.trigger;
    }
    if (body.content !== undefined) {
      input.content = body.content;
    }
    if (body.keyboard !== undefined) {
      input.keyboard = body.keyboard;
    }
    if (body.hidden !== undefined) {
      input.hidden = body.hidden;
    }
    if (body.isAi !== undefined && body.isAi !== null) {
      input.isAi = Boolean(body.isAi);
    }

    const stepDTO = await createStepService().update(params.id, input);
    notifyRefresh("steps");
    return jsonOk(stepDTO);
  }, { fallback: "An unexpected error occurred while updating step" });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Step");
    if (idError) {
      return idError;
    }
    await createStepService().delete(params.id);
    notifyRefresh("steps");
    return noContent();
  }, { fallback: "An unexpected error occurred while deleting step" });
}
