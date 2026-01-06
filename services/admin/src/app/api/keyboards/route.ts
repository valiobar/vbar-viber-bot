/**
 * Keyboards API Route
 *
 * GET /api/keyboards - List keyboards with filters and pagination
 * POST /api/keyboards - Create new keyboard
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse, PaginationParams } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import { CreateKeyboardUseCaseImpl } from "@/domains/keyboard/application/use-cases/CreateKeyboardUseCase";
import { ListKeyboardsUseCaseImpl } from "@/domains/keyboard/application/use-cases/ListKeyboardsUseCase";
import { MongoKeyboardRepository } from "@/domains/keyboard/adapters/out/repositories/MongoKeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/adapters/out/models/KeyboardModel";
import { ViberApiValidator } from "@/domains/keyboard/services/ViberApiValidator";
import type { CreateKeyboardInput } from "@/domains/keyboard/ports/in/CreateKeyboardUseCase";
import type { ListKeyboardsFilters } from "@/domains/keyboard/ports/in/ListKeyboardsUseCase";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";
import type { ListKeyboardsResult } from "@/domains/keyboard/ports/in/ListKeyboardsUseCase";
import { publishRefreshEvent } from "@/lib/message-queue-publisher";

/**
 * GET handler for listing keyboards
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - hidden: Filter by hidden status (true/false)
 * - isBroadcast: Filter by broadcast status (true/false)
 * - search: Search term for humanReadableName or title
 *
 * @param request - Next.js Request object
 * @returns NextResponse with list of keyboards or error
 */
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<ListKeyboardsResult>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const hiddenParam = searchParams.get("hidden");
    const isBroadcastParam = searchParams.get("isBroadcast");
    const search = searchParams.get("search") || undefined;

    // Build filters
    const filters: ListKeyboardsFilters = {};
    if (hiddenParam !== null) {
      filters.hidden = hiddenParam === "true";
    }
    if (isBroadcastParam !== null) {
      filters.isBroadcast = isBroadcastParam === "true";
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
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);

    // Instantiate use case
    const listKeyboardsUseCase = new ListKeyboardsUseCaseImpl(
      keyboardRepository
    );

    // Execute use case
    const result = await listKeyboardsUseCase.execute(filters, pagination);

    // Return success response
    return NextResponse.json<ApiResponse<ListKeyboardsResult>>(
      {
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle errors
    return NextResponse.json<ApiResponse<ListKeyboardsResult>>(
      {
        error: {
          code: "KEYBOARD_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while listing keyboards",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new keyboard
 *
 * Request body: CreateKeyboardInput
 *
 * @param request - Next.js Request object
 * @returns NextResponse with created keyboard or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<KeyboardDTO>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.humanReadableName) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_002",
            message: "humanReadableName is required",
          },
        },
        { status: 400 }
      );
    }

    if (!body.Buttons || !Array.isArray(body.Buttons)) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_002",
            message: "Buttons array is required",
          },
        },
        { status: 400 }
      );
    }

    // Build input
    const input: CreateKeyboardInput = {
      Buttons: body.Buttons,
      DefaultHeight: body.DefaultHeight ?? false,
      InputFieldState: body.InputFieldState ?? "hidden",
      BgColor: body.BgColor ?? null,
      humanReadableName: body.humanReadableName.trim(),
      title: body.title?.trim() || null,
      isBroadcast: body.isBroadcast ?? false,
      hidden: body.hidden ?? false,
    };

    // Instantiate repositories and services
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);
    const viberApiValidator = new ViberApiValidator();

    // Instantiate use case
    const createKeyboardUseCase = new CreateKeyboardUseCaseImpl(
      keyboardRepository,
      viberApiValidator
    );

    // Execute use case
    const keyboardDTO = await createKeyboardUseCase.execute(input);

    // Notify viber service to refresh cache (fire-and-forget)
    try {
      publishRefreshEvent("keyboards");
    } catch (error) {
      // Log error but don't fail the operation
      console.error("Failed to publish refresh event:", error);
    }

    // Return success response
    return NextResponse.json<ApiResponse<KeyboardDTO>>(
      {
        data: keyboardDTO,
      },
      { status: 201 }
    );
  } catch (error) {
    // Log the actual error for debugging
    console.error("Error creating keyboard:", error);
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
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_002",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<KeyboardDTO>>(
      {
        error: {
          code: "KEYBOARD_002",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while creating keyboard",
        },
      },
      { status: 500 }
    );
  }
}
