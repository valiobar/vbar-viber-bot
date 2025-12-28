/**
 * Messages API Route
 *
 * GET /api/messages - List messages with filters and pagination
 * POST /api/messages - Create new message
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse, PaginationParams } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import { CreateMessageUseCaseImpl } from "@/domains/message/application/use-cases/CreateMessageUseCaseImpl";
import { ListMessagesUseCaseImpl } from "@/domains/message/application/use-cases/ListMessagesUseCaseImpl";
import { MongoMessageRepository } from "@/domains/message/adapters/out/repositories/MongoMessageRepository";
import { MessageModel } from "@/domains/message/adapters/out/models/MessageModel";
import type { CreateMessageInput } from "@/domains/message/ports/in/CreateMessageUseCase";
import type { ListMessagesFilters } from "@/domains/message/ports/in/ListMessagesUseCase";
import type { MessageDTO } from "@/domains/message/application/dto/MessageDTO";
import type { ListMessagesResult } from "@/domains/message/ports/in/ListMessagesUseCase";

/**
 * GET handler for listing messages
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - hidden: Filter by hidden status (true/false)
 * - type: Filter by message type
 * - search: Search term for humanReadableName
 *
 * @param request - Next.js Request object
 * @returns NextResponse with list of messages or error
 */
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<ListMessagesResult>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const hiddenParam = searchParams.get("hidden");
    const typeParam = searchParams.get("type");
    const search = searchParams.get("search") || undefined;

    // Build filters
    const filters: ListMessagesFilters = {};
    if (hiddenParam !== null) {
      filters.hidden = hiddenParam === "true";
    }
    if (typeParam !== null) {
      filters.type = typeParam as any; // MessageType will be validated by domain
    }
    if (search) {
      filters.search = search;
    }

    // Build pagination
    const pagination: PaginationParams = {
      page: page > 0 ? page : 1,
      limit: limit > 0 && limit <= 100 ? limit : 10,
    };

    // Instantiate repository
    const messageRepository = new MongoMessageRepository(MessageModel);

    // Instantiate use case
    const listMessagesUseCase = new ListMessagesUseCaseImpl(messageRepository);

    // Execute use case
    const result = await listMessagesUseCase.execute(filters, pagination);

    // Return success response
    return NextResponse.json<ApiResponse<ListMessagesResult>>(
      {
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle errors
    return NextResponse.json<ApiResponse<ListMessagesResult>>(
      {
        error: {
          code: "MESSAGE_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while listing messages",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new message
 *
 * Request body: CreateMessageInput
 *
 * @param request - Next.js Request object
 * @returns NextResponse with created message or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<MessageDTO>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.type) {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_002",
            message: "type is required",
          },
        },
        { status: 400 }
      );
    }

    if (!body.content || typeof body.content !== "object") {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_002",
            message: "content is required and must be an object",
          },
        },
        { status: 400 }
      );
    }

    if (!body.humanReadableName || typeof body.humanReadableName !== "string") {
      return NextResponse.json<ApiResponse<MessageDTO>>(
        {
          error: {
            code: "MESSAGE_002",
            message: "humanReadableName is required and must be a string",
          },
        },
        { status: 400 }
      );
    }

    // Build input
    const input: CreateMessageInput = {
      type: body.type,
      content: body.content,
      url: body.url ?? null,
      humanReadableName: body.humanReadableName.trim(),
      hidden: body.hidden ?? false,
    };

    // Instantiate repository
    const messageRepository = new MongoMessageRepository(MessageModel);

    // Instantiate use case
    const createMessageUseCase = new CreateMessageUseCaseImpl(
      messageRepository
    );

    // Execute use case
    const messageDTO = await createMessageUseCase.execute(input);

    // Return success response
    return NextResponse.json<ApiResponse<MessageDTO>>(
      {
        data: messageDTO,
      },
      { status: 201 }
    );
  } catch (error) {
    // Log the actual error for debugging
    console.error("Error creating message:", error);
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
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
            code: "MESSAGE_002",
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
          code: "MESSAGE_002",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while creating message",
        },
      },
      { status: 500 }
    );
  }
}
