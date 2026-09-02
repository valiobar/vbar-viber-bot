/**
 * GET /api/messages/[id] — get message
 * PUT /api/messages/[id] — update message
 * DELETE /api/messages/[id] — delete message
 */

import { MessageRepository } from "@/domains/message/MessageRepository";
import { MessageModel } from "@/domains/message/MessageModel";
import {
  MessageService,
  type UpdateMessageInput,
} from "@/domains/message/MessageService";
import {
  withDb,
  jsonOk,
  requireId,
  notifyRefresh,
  noContent,
} from "@/lib/api/routeHelpers";

const createMessageService = (): MessageService =>
  new MessageService(new MessageRepository(MessageModel));

type IdParams = { params: { id: string } };

export async function GET(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Message");
    if (idError) {
      return idError;
    }
    const messageDTO = await createMessageService().get(params.id);
    return jsonOk(messageDTO);
  }, { fallback: "An unexpected error occurred while retrieving message" });
}

export async function PUT(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Message");
    if (idError) {
      return idError;
    }

    const body = await request.json();
    const input: UpdateMessageInput = {};
    if (body.type !== undefined) {
      input.type = body.type;
    }
    if (body.content !== undefined) {
      input.content = body.content;
    }
    if (body.url !== undefined) {
      input.url = body.url;
    }
    if (body.humanReadableName !== undefined) {
      input.humanReadableName = body.humanReadableName.trim();
    }
    if (body.hidden !== undefined) {
      input.hidden = body.hidden;
    }

    const messageDTO = await createMessageService().update(params.id, input);
    notifyRefresh("messages");
    return jsonOk(messageDTO);
  }, { fallback: "An unexpected error occurred while updating message" });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Message");
    if (idError) {
      return idError;
    }
    await createMessageService().delete(params.id);
    notifyRefresh("messages");
    return noContent();
  }, { fallback: "An unexpected error occurred while deleting message" });
}
