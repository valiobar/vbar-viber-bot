/**
 * Keyboard by ID API Route
 *
 * GET /api/keyboards/[id] - Get keyboard by ID
 * PUT /api/keyboards/[id] - Update keyboard
 * DELETE /api/keyboards/[id] - Delete keyboard
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { GetKeyboardUseCaseImpl } from "@/domains/keyboard/application/use-cases/GetKeyboardUseCase";
import { UpdateKeyboardUseCaseImpl } from "@/domains/keyboard/application/use-cases/UpdateKeyboardUseCase";
import { DeleteKeyboardUseCaseImpl } from "@/domains/keyboard/application/use-cases/DeleteKeyboardUseCase";
import { MongoKeyboardRepository } from "@/domains/keyboard/adapters/out/repositories/MongoKeyboardRepository";
import { KeyboardModel } from "@/domains/keyboard/adapters/out/models/KeyboardModel";
import { ViberApiValidator } from "@/domains/keyboard/services/ViberApiValidator";
import type { UpdateKeyboardInput } from "@/domains/keyboard/ports/in/UpdateKeyboardUseCase";
import type { KeyboardDTO } from "@/domains/keyboard/application/dto/KeyboardDTO";

/**
 * GET handler for getting a keyboard by ID
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the keyboard ID
 * @returns NextResponse with keyboard or error
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<KeyboardDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_003",
            message: "Keyboard ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);

    // Instantiate use case
    const getKeyboardUseCase = new GetKeyboardUseCaseImpl(keyboardRepository);

    // Execute use case
    const keyboardDTO = await getKeyboardUseCase.execute(id);

    // Return success response
    return NextResponse.json<ApiResponse<KeyboardDTO>>(
      {
        data: keyboardDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_003",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<KeyboardDTO>>(
      {
        error: {
          code: "KEYBOARD_003",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while retrieving keyboard",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a keyboard
 *
 * Request body: UpdateKeyboardInput (all fields optional except those being updated)
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the keyboard ID
 * @returns NextResponse with updated keyboard or error
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse<KeyboardDTO>>> {
  try {
    const { id } = params;

    // Validate ID
    if (!id) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_004",
            message: "Keyboard ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Build input (all fields are optional for updates)
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

    // Instantiate repositories and services
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);
    const viberApiValidator = new ViberApiValidator();

    // Instantiate use case
    const updateKeyboardUseCase = new UpdateKeyboardUseCaseImpl(
      keyboardRepository,
      viberApiValidator
    );

    // Execute use case
    const keyboardDTO = await updateKeyboardUseCase.execute(id, input);

    // Return success response
    return NextResponse.json<ApiResponse<KeyboardDTO>>(
      {
        data: keyboardDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_004",
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
      return NextResponse.json<ApiResponse<KeyboardDTO>>(
        {
          error: {
            code: "KEYBOARD_004",
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
          code: "KEYBOARD_004",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while updating keyboard",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a keyboard
 *
 * @param request - Next.js Request object
 * @param params - Route parameters containing the keyboard ID
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
            code: "KEYBOARD_005",
            message: "Keyboard ID is required",
          },
        },
        { status: 400 }
      );
    }

    // Instantiate repository
    const keyboardRepository = new MongoKeyboardRepository(KeyboardModel);

    // Instantiate use case
    const deleteKeyboardUseCase = new DeleteKeyboardUseCaseImpl(
      keyboardRepository
    );

    // Execute use case
    await deleteKeyboardUseCase.execute(id);

    // Return success response (204 No Content)
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "KEYBOARD_005",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle errors (e.g., keyboard in use)
    if (
      error instanceof Error &&
      (error.message.includes("in use") || error.message.includes("referenced"))
    ) {
      return NextResponse.json<ApiResponse<void>>(
        {
          error: {
            code: "KEYBOARD_005",
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
          code: "KEYBOARD_005",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while deleting keyboard",
        },
      },
      { status: 500 }
    );
  }
}
