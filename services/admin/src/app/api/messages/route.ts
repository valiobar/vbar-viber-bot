/**
 * GET /api/messages — list messages
 * POST /api/messages — create message
 */

import { MessageRepository } from "@/domains/message/MessageRepository";
import { MessageModel } from "@/domains/message/MessageModel";
import {
  MessageService,
  type CreateMessageInput,
  type ListMessagesFilters,
} from "@/domains/message/MessageService";
import {
  withDb,
  jsonOk,
  jsonError,
  parsePagination,
  parseBoolParam,
  notifyRefresh,
  ErrorCode,
  requireString,
} from "@/lib/api/routeHelpers";

const createMessageService = (): MessageService =>
  new MessageService(new MessageRepository(MessageModel));

export async function GET(request: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(request.url);
    const filters: ListMessagesFilters = {};

    const hidden = parseBoolParam(searchParams.get("hidden"));
    if (hidden !== undefined) {
      filters.hidden = hidden;
    }
    const typeParam = searchParams.get("type");
    if (typeParam !== null) {
      filters.type = typeParam as ListMessagesFilters["type"];
    }
    const search = searchParams.get("search") || undefined;
    if (search) {
      filters.search = search;
    }

    const result = await createMessageService().list(
      filters,
      parsePagination(searchParams)
    );
    return jsonOk(result);
  }, { fallback: "An unexpected error occurred while listing messages" });
}

export async function POST(request: Request) {
  return withDb(async () => {
    const body = await request.json();

    if (!body.type) {
      return jsonError(ErrorCode.VALIDATION, "type is required", 400);
    }
    if (!body.content || typeof body.content !== "object") {
      return jsonError(
        ErrorCode.VALIDATION,
        "content is required and must be an object",
        400
      );
    }
    const nameError = requireString(body.humanReadableName, "humanReadableName");
    if (nameError) {
      return nameError;
    }

    const input: CreateMessageInput = {
      type: body.type,
      content: body.content,
      url: body.url ?? null,
      humanReadableName: body.humanReadableName.trim(),
      hidden: body.hidden ?? false,
    };

    const messageDTO = await createMessageService().create(input);
    notifyRefresh("messages");
    return jsonOk(messageDTO, 201);
  }, { fallback: "An unexpected error occurred while creating message" });
}
