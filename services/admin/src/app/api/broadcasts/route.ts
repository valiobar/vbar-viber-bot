/**
 * GET /api/broadcasts — list broadcasts
 * POST /api/broadcasts — create broadcast
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
  parsePagination,
  notifyRefresh,
  requireString,
} from "@/lib/api/routeHelpers";

const createBroadcastService = (): BroadcastService =>
  new BroadcastService(
    new BroadcastRepository(BroadcastModel),
    new StepRepository(StepModel)
  );

export async function GET(request: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(request.url);
    const result = await createBroadcastService().list(
      parsePagination(searchParams)
    );
    return jsonOk(result);
  }, { fallback: "An unexpected error occurred while listing broadcasts" });
}

export async function POST(request: Request) {
  return withDb(
    async () => {
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
        scheduledAt: body.scheduledAt, // undefined = send now
      };
      const broadcast = await createBroadcastService().create(input);
      notifyRefresh("broadcasts");
      return jsonOk(broadcast, 201);
    },
    {
      fallback: "An unexpected error occurred while creating broadcast",
      notFoundIsValidation: true,
    }
  );
}
