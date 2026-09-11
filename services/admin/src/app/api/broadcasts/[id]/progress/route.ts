/**
 * PATCH /api/broadcasts/[id]/progress — heartbeat / counters / final status (viber worker)
 */

import type { BroadcastProgressUpdate } from "@vbar/shared";
import { BroadcastRepository } from "@/domains/broadcast/BroadcastRepository";
import { BroadcastModel } from "@/domains/broadcast/BroadcastModel";
import { BroadcastService } from "@/domains/broadcast/BroadcastService";
import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import { withDb, jsonOk, requireId, requireString } from "@/lib/api/routeHelpers";

const createBroadcastService = (): BroadcastService =>
  new BroadcastService(
    new BroadcastRepository(BroadcastModel),
    new StepRepository(StepModel)
  );

type IdParams = { params: { id: string } };

export async function PATCH(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Broadcast");
    if (idError) {
      return idError;
    }

    const body = (await request.json()) as BroadcastProgressUpdate;
    const instanceError = requireString(body.instanceId, "instanceId");
    if (instanceError) {
      return instanceError;
    }

    const broadcast = await createBroadcastService().reportProgress(params.id, body);
    return jsonOk(broadcast);
  }, { fallback: "An unexpected error occurred while updating broadcast progress" });
}
