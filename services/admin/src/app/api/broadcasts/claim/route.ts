/**
 * POST /api/broadcasts/claim — atomic claim of one due broadcast (viber worker)
 */

import { ConfigHelper } from "@vbar/shared";
import { BroadcastRepository } from "@/domains/broadcast/BroadcastRepository";
import { BroadcastModel } from "@/domains/broadcast/BroadcastModel";
import { BroadcastService } from "@/domains/broadcast/BroadcastService";
import { StepRepository } from "@/domains/step/StepRepository";
import { StepModel } from "@/domains/step/StepModel";
import { withDb, jsonOk, requireString } from "@/lib/api/routeHelpers";

const createBroadcastService = (): BroadcastService =>
  new BroadcastService(
    new BroadcastRepository(BroadcastModel),
    new StepRepository(StepModel)
  );

export async function POST(request: Request) {
  return withDb(async () => {
    const body = await request.json();
    const idError = requireString(body.instanceId, "instanceId");
    if (idError) {
      return idError;
    }

    const staleMs = ConfigHelper.getEnvNumber("BROADCAST_STALE_MS", 5 * 60 * 1000);
    const broadcast = await createBroadcastService().claim(body.instanceId, staleMs);
    return jsonOk({ broadcast });
  }, { fallback: "An unexpected error occurred while claiming broadcast" });
}
