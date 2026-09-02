/**
 * GET /api/keyboards/[id] — get keyboard
 * PUT /api/keyboards/[id] — update keyboard
 * DELETE /api/keyboards/[id] — delete keyboard
 */

import { KeyboardRepository } from "@/domains/keyboard/KeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";
import { ViberApiValidator } from "@/domains/keyboard/lib/ViberApiValidator";
import {
  KeyboardService,
  type UpdateKeyboardInput,
} from "@/domains/keyboard/KeyboardService";
import {
  withDb,
  jsonOk,
  requireId,
  notifyRefresh,
  noContent,
} from "@/lib/api/routeHelpers";

const createKeyboardService = (): KeyboardService =>
  new KeyboardService(
    new KeyboardRepository(KeyboardModel),
    new ViberApiValidator()
  );

type IdParams = { params: { id: string } };

export async function GET(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Keyboard");
    if (idError) {
      return idError;
    }
    const keyboardDTO = await createKeyboardService().get(params.id);
    return jsonOk(keyboardDTO);
  }, { fallback: "An unexpected error occurred while retrieving keyboard" });
}

export async function PUT(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Keyboard");
    if (idError) {
      return idError;
    }

    const body = await request.json();
    const input: UpdateKeyboardInput = {};
    if (body.Buttons !== undefined) {
      input.Buttons = body.Buttons;
    }
    if (body.DefaultHeight !== undefined) {
      input.DefaultHeight = body.DefaultHeight;
    }
    if (body.InputFieldState !== undefined) {
      input.InputFieldState = body.InputFieldState;
    }
    if (body.BgColor !== undefined) {
      input.BgColor = body.BgColor;
    }
    if (body.humanReadableName !== undefined) {
      input.humanReadableName = body.humanReadableName.trim();
    }
    if (body.title !== undefined) {
      input.title = body.title?.trim() || null;
    }
    if (body.isBroadcast !== undefined) {
      input.isBroadcast = body.isBroadcast;
    }
    if (body.hidden !== undefined) {
      input.hidden = body.hidden;
    }
    if (body.isTemplate !== undefined) {
      input.isTemplate = body.isTemplate;
    }

    const keyboardDTO = await createKeyboardService().update(params.id, input);
    notifyRefresh("keyboards");
    return jsonOk(keyboardDTO);
  }, { fallback: "An unexpected error occurred while updating keyboard" });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Keyboard");
    if (idError) {
      return idError;
    }
    await createKeyboardService().delete(params.id);
    notifyRefresh("keyboards");
    return noContent();
  }, { fallback: "An unexpected error occurred while deleting keyboard" });
}
