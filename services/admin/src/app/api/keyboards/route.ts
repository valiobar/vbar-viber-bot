/**
 * GET /api/keyboards — list keyboards
 * POST /api/keyboards — create keyboard
 */

import { KeyboardRepository } from "@/domains/keyboard/KeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/KeyboardModel";
import { ViberApiValidator } from "@/domains/keyboard/lib/ViberApiValidator";
import {
  KeyboardService,
  type CreateKeyboardInput,
  type ListKeyboardsFilters,
} from "@/domains/keyboard/KeyboardService";
import {
  withDb,
  jsonOk,
  jsonError,
  parsePagination,
  parseBoolParam,
  notifyRefresh,
  ErrorCode,
} from "@/lib/api/routeHelpers";

const createKeyboardService = (): KeyboardService =>
  new KeyboardService(
    new KeyboardRepository(KeyboardModel),
    new ViberApiValidator()
  );

export async function GET(request: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(request.url);
    const filters: ListKeyboardsFilters = {};

    const hidden = parseBoolParam(searchParams.get("hidden"));
    if (hidden !== undefined) {
      filters.hidden = hidden;
    }
    const isBroadcast = parseBoolParam(searchParams.get("isBroadcast"));
    if (isBroadcast !== undefined) {
      filters.isBroadcast = isBroadcast;
    }
    const isTemplate = parseBoolParam(searchParams.get("isTemplate"));
    if (isTemplate !== undefined) {
      filters.isTemplate = isTemplate;
    }
    const search = searchParams.get("search") || undefined;
    if (search) {
      filters.search = search;
    }

    const result = await createKeyboardService().list(
      filters,
      parsePagination(searchParams)
    );
    return jsonOk(result);
  }, { fallback: "An unexpected error occurred while listing keyboards" });
}

export async function POST(request: Request) {
  return withDb(async () => {
    const body = await request.json();

    if (!body.humanReadableName) {
      return jsonError(
        ErrorCode.VALIDATION,
        "humanReadableName is required",
        400
      );
    }
    if (!body.Buttons || !Array.isArray(body.Buttons)) {
      return jsonError(ErrorCode.VALIDATION, "Buttons array is required", 400);
    }

    const input: CreateKeyboardInput = {
      Buttons: body.Buttons,
      DefaultHeight: body.DefaultHeight ?? false,
      InputFieldState: body.InputFieldState ?? "hidden",
      BgColor: body.BgColor ?? null,
      humanReadableName: body.humanReadableName.trim(),
      title: body.title?.trim() || null,
      isBroadcast: body.isBroadcast ?? false,
      hidden: body.hidden ?? false,
      isTemplate: body.isTemplate ?? false,
    };

    const keyboardDTO = await createKeyboardService().create(input);
    notifyRefresh("keyboards");
    return jsonOk(keyboardDTO, 201);
  }, { fallback: "An unexpected error occurred while creating keyboard" });
}
