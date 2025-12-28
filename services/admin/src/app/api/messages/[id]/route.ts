/**
 * Message by ID API Route
 *
 * GET /api/messages/[id] - Get message by ID
 * PUT /api/messages/[id] - Update message
 * DELETE /api/messages/[id] - Delete message
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { GetMessageUseCaseImpl } from "@/domains/message/application/use-cases/GetMessageUseCaseImpl";
import { UpdateMessageUseCaseImpl } from "@/domains/message/application/use-cases/UpdateMessageUseCaseImpl";
import { DeleteMessageUseCaseImpl } from "@/domains/message/application/use-cases/DeleteMessageUseCaseImpl";
import { MongoMessageRepository } from "@/domains/message/adapters/out/repositories/MongoMessageRepository";
import { MessageModel } from "@/domains/message/adapters/out/models/MessageModel";
import type { UpdateMessageInput } from "@/domains/message/ports/in/UpdateMessageUseCase";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";

/**
 * GET handler for getting a message by ID
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the message ID
 * @returns NextResponse with message or error
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<MessageDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_003",
            message: "Message ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const messageRepository = new MongoMessageRepository(MessageModel);

    // Instantiate use case
    const getMessageUseCase = new GetMessageUseCaseImpl(messageRepository);

    // Execute use case
    const messageDTO = await getMessageUseCase.execute(id);

    // Return success response
    return NextResponse.json<ApiResponse<MessageDTO>>(
      {
        data: messageDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_003",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<MessageDTO>>(
      {
        error: {
          code: "MESSAGE_003",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while retrieving message",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a message
 *
 * Request body: UpdateMessageInput (all fields optional except those being updated)
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the message ID
 * @returns NextResponse with updated message or error
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<MessageDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_004",
            message: "Message ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build input (all fields are optional for updates)
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

    // Instantiate repository
    const messageRepository = new MongoMessageRepository(MessageModel);

    // Instantiate use case
    const updateMessageUseCase = new UpdateMessageUseCaseImpl(
      messageRepository
    );

    // Execute use case
    const messageDTO = await updateMessageUseCase.execute(id, input);

    // Return success response
    return NextResponse.json<ApiResponse<MessageDTO>>(
      {
        data: messageDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_004",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle validation errors
    if (
      error instanceof Error &&
      (error.message.includes("validation") ||
        error.message.includes("invalid") ||
        error.message.includes("required"))
    ) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_004",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<MessageDTO>>(
      {
        error: {
          code: "MESSAGE_004",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while updating message",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a message
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the message ID
 * @returns NextResponse with success or error
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<void>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "MESSAGE_005",
            message: "Message ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const messageRepository = new MongoMessageRepository(MessageModel);

    // Instantiate use case
    const deleteMessageUseCase = new DeleteMessageUseCaseImpl(
      messageRepository
    );

    // Execute use case
    await deleteMessageUseCase.execute(id);

    // Return success response (204 No Content)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "MESSAGE_005",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle errors (e.g., message in use)
    if (
      error instanceof Error &&
      (error.message.includes("in use") || error.message.includes("referenced"))
    ) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "MESSAGE_005",
            message: error.message,
          },
        },
        { status: 409 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<void>>(
      {
        error: {
          code: "MESSAGE_005",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while deleting message",
        },
      },
      { status: 500 }
    );
  }
}
