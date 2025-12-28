/**
 * Steps API Route
 *
 * GET /api/steps - List steps with filters and pagination
 * POST /api/steps - Create new step
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse, PaginationParams } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import { CreateStepUseCaseImpl } from "@/domains/step/application/use-cases/CreateStepUseCaseImpl";
import { ListStepsUseCaseImpl } from "@/domains/step/application/use-cases/ListStepsUseCaseImpl";
import { MongoStepRepository } from "@/domains/step/adapters/out/repositories/MongoStepRepository";
import { StepModel } from "@/domains/step/adapters/out/models/StepModel";
import { MongoMessageRepository } from "@/domains/message/adapters/out/repositories/MongoMessageRepository";
import { MessageModel } from "@/domains/message/adapters/out/models/MessageModel";
import { MongoKeyboardRepository } from "@/domains/keyboard/adapters/out/repositories/MongoKeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/adapters/out/models/KeyboardModel";
import type { CreateStepInput } from "@/domains/step/ports/in/CreateStepUseCase";
import type { ListStepsFilters } from "@/domains/step/ports/in/ListStepsUseCase";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";
import type { ListStepsResult } from "@/domains/step/ports/in/ListStepsUseCase";

/**
 * GET handler for listing steps
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - hidden: Filter by hidden status (true/false)
 * - search: Search term for humanReadableName
 * - trigger: Filter by trigger string
 *
 * @param request - Next.js Request object
 * @returns NextResponse with list of steps or error
 */
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<ListStepsResult>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const hiddenParam = searchParams.get("hidden");
    const triggerParam = searchParams.get("trigger");
    const search = searchParams.get("search") || undefined;

    // Build filters
    const filters: ListStepsFilters = {};
    if (hiddenParam !== null) {
      filters.hidden = hiddenParam === "true";
    }
    if (triggerParam !== null) {
      filters.trigger = triggerParam;
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
    const stepRepository = new MongoStepRepository(StepModel);

    // Instantiate use case
    const listStepsUseCase = new ListStepsUseCaseImpl(stepRepository);

    // Execute use case
    const result = await listStepsUseCase.execute(filters, pagination);

    // Return success response
    return NextResponse.json<ApiResponse<ListStepsResult>>(
      {
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle errors
    return NextResponse.json<ApiResponse<ListStepsResult>>(
      {
        error: {
          code: "STEP_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while listing steps",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new step
 *
 * Request body: CreateStepInput
 *
 * @param request - Next.js Request object
 * @returns NextResponse with created step or error
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<StepDTO>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.humanReadableName || typeof body.humanReadableName !== "string") {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_002",
            message: "humanReadableName is required and must be a string",
          },
        },
        { status: 400 }
      );
    }

    if (
      !body.trigger ||
      !Array.isArray(body.trigger) ||
      body.trigger.length === 0
    ) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_002",
            message: "trigger is required and must be a non-empty array",
          },
        },
        { status: 400 }
      );
    }

    if (
      !body.content ||
      !Array.isArray(body.content) ||
      body.content.length === 0
    ) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_002",
            message: "content is required and must be a non-empty array",
          },
        },
        { status: 400 }
      );
    }

    // Build input
    const input: CreateStepInput = {
      humanReadableName: body.humanReadableName.trim(),
      trigger: body.trigger,
      content: body.content,
      keyboard: body.keyboard ?? null,
      hidden: body.hidden ?? false,
      isAi: body.isAi ?? false,
    };

    // Instantiate repositories
    const stepRepository = new MongoStepRepository(StepModel);
    const messageRepository = new MongoMessageRepository(MessageModel);
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);

    // Instantiate use case
    const createStepUseCase = new CreateStepUseCaseImpl(
      stepRepository,
      messageRepository,
      keyboardRepository
    );

    // Execute use case
    const stepDTO = await createStepUseCase.execute(input);

    // Return success response
    return NextResponse.json<ApiResponse<StepDTO>>(
      {
        data: stepDTO,
      },
      { status: 201 }
    );
  } catch (error) {
    // Log the actual error for debugging
    console.error("Error creating step:", error);
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
        error.message.includes("required") ||
        error.message.includes("not found"))
    ) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_002",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<StepDTO>>(
      {
        error: {
          code: "STEP_002",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while creating step",
        },
      },
      { status: 500 }
    );
  }
}
