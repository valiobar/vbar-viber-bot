/**
 * Step by ID API Route
 *
 * GET /api/steps/[id] - Get step by ID
 * PUT /api/steps/[id] - Update step
 * DELETE /api/steps/[id] - Delete step
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { GetStepUseCaseImpl } from "@/domains/step/application/use-cases/GetStepUseCaseImpl";
import { UpdateStepUseCaseImpl } from "@/domains/step/application/use-cases/UpdateStepUseCaseImpl";
import { DeleteStepUseCaseImpl } from "@/domains/step/application/use-cases/DeleteStepUseCaseImpl";
import { MongoStepRepository } from "@/domains/step/adapters/out/repositories/MongoStepRepository";
import { StepModel } from "@/domains/step/adapters/out/models/StepModel";
import { MongoMessageRepository } from "@/domains/message/adapters/out/repositories/MongoMessageRepository";
import { MessageModel } from "@/domains/message/adapters/out/models/MessageModel";
import { MongoKeyboardRepository } from "@/domains/keyboard/adapters/out/repositories/MongoKeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/adapters/out/models/KeyboardModel";
import type { UpdateStepInput } from "@/domains/step/ports/in/UpdateStepUseCase";
import type { StepDTO } from "@/domains/step/application/dto/StepDTO";

/**
 * GET handler for getting a step by ID
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the step ID
 * @returns NextResponse with step or error
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<StepDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_003",
            message: "Step ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const stepRepository = new MongoStepRepository(StepModel);

    // Instantiate use case
    const getStepUseCase = new GetStepUseCaseImpl(stepRepository);

    // Execute use case
    const stepDTO = await getStepUseCase.execute(id);

    // Return success response
    return NextResponse.json<ApiResponse<StepDTO>>(
      {
        data: stepDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_003",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<StepDTO>>(
      {
        error: {
          code: "STEP_003",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while retrieving step",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a step
 *
 * Request body: UpdateStepInput (all fields optional except those being updated)
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the step ID
 * @returns NextResponse with updated step or error
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<StepDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_004",
            message: "Step ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build input (all fields are optional for updates)
    const input: UpdateStepInput = {};
    if (body.humanReadableName !== undefined) {
      input.humanReadableName = body.humanReadableName.trim();
    }
    if (body.trigger !== undefined) {
      input.trigger = body.trigger;
    }
    if (body.content !== undefined) {
      input.content = body.content;
    }
    if (body.keyboard !== undefined) {
      input.keyboard = body.keyboard;
    }
    if (body.hidden !== undefined) {
      input.hidden = body.hidden;
    }
    if (body.isAi !== undefined) {
      input.isAi = body.isAi;
    }

    // Instantiate repositories
    const stepRepository = new MongoStepRepository(StepModel);
    const messageRepository = new MongoMessageRepository(MessageModel);
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);

    // Instantiate use case
    const updateStepUseCase = new UpdateStepUseCaseImpl(
      stepRepository,
      messageRepository,
      keyboardRepository
    );

    // Execute use case
    const stepDTO = await updateStepUseCase.execute(id, input);

    // Return success response
    return NextResponse.json<ApiResponse<StepDTO>>(
      {
        data: stepDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_004",
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
      return NextResponse.json<ApiResponse<StepDTO>>(
        {
          error: {
            code: "STEP_004",
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
          code: "STEP_004",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while updating step",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a step
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the step ID
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
            code: "STEP_005",
            message: "Step ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const stepRepository = new MongoStepRepository(StepModel);

    // Instantiate use case
    const deleteStepUseCase = new DeleteStepUseCaseImpl(stepRepository);

    // Execute use case
    await deleteStepUseCase.execute(id);

    // Return success response (204 No Content)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "STEP_005",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle errors (e.g., step in use)
    if (
      error instanceof Error &&
      (error.message.includes("in use") || error.message.includes("referenced"))
    ) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "STEP_005",
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
          code: "STEP_005",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while deleting step",
        },
      },
      { status: 500 }
    );
  }
}
