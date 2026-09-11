/**
 * GET /api/broadcasts/[id] — get broadcast
 * PUT /api/broadcasts/[id] — update scheduled broadcast
 * DELETE /api/broadcasts/[id] — cancel scheduled broadcast (history is kept)
 */

import { BroadcastRepository } from "@/domains/broadcast/BroadcastRepository";
import { BroadcastModel } from "@/domains/broadcast/BroadcastModel";
import {
  BroadcastService,
  type CreateBroadcastInput,
} from "@/domains/broadcast/BroadcastService";
import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import {
  withDb,
  jsonOk,
  requireId,
  requireString,
  notifyRefresh,
} from "@/lib/api/routeHelpers";

const createBroadcastService = (): BroadcastService =>
  new BroadcastService(
    new BroadcastRepository(BroadcastModel),
    new StepRepository(StepModel)
  );

type IdParams = { params: { id: string } };

export async function GET(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Broadcast");
    if (idError) {
      return idError;
    }
    return jsonOk(await createBroadcastService().get(params.id));
  }, { fallback: "An unexpected error occurred while retrieving broadcast" });
}

export async function PUT(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Broadcast");
    if (idError) {
      return idError;
    }

    const body = await request.json();
    const nameError = requireString(body.name, "name");
    if (nameError) {
      return nameError;
    }
    const stepError = requireString(body.stepId, "stepId");
    if (stepError) {
      return stepError;
    }

    const input: CreateBroadcastInput = {
      name: body.name,
      stepId: body.stepId,
      sendToAll: body.sendToAll ?? false,
      testViberIds: body.testViberIds ?? [],
      scheduledAt: body.scheduledAt,
    };
    const broadcast = await createBroadcastService().update(params.id, input);
    notifyRefresh("broadcasts");
    return jsonOk(broadcast);
  }, { fallback: "An unexpected error occurred while updating broadcast" });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Broadcast");
    if (idError) {
      return idError;
    }
    const broadcast = await createBroadcastService().cancel(params.id);
    return jsonOk(broadcast);
  }, { fallback: "An unexpected error occurred while canceling broadcast" });
}
