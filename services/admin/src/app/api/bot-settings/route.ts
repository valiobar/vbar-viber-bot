/**
 * Bot Settings API Route
 *
 * GET /api/bot-settings - Get bot settings (singleton)
 * PUT /api/bot-settings - Update bot settings (singleton)
 *
 * This is an input adapter following Hexagonal Architecture principles.
 * Authentication is handled by middleware.ts
 * Bot Settings follow a singleton pattern (only one settings document exists).
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@vbar/shared";
import { connectToDatabase } from "@/lib/mongodb";
import { GetBotSettingsUseCaseImpl } from "@/domains/bot-settings/application/use-cases/GetBotSettingsUseCaseImpl";
import { UpdateBotSettingsUseCaseImpl } from "@/domains/bot-settings/application/use-cases/UpdateBotSettingsUseCaseImpl";
import { MongoBotSettingsRepository } from "@/domains/bot-settings/adapters/out/repositories/MongoBotSettingsRepository";
import { BotSettingsModel } from "@/domains/bot-settings/adapters/out/models/BotSettingsModel";
import { MongoStepRepository } from "@/domains/step/adapters/out/repositories/MongoStepRepository";
import { StepModel } from "@/domains/step/adapters/out/models/StepModel";
import type { UpdateBotSettingsInput } from "@/domains/bot-settings/ports/in/UpdateBotSettingsUseCase";
import type { BotSettingsDTO } from "@/domains/bot-settings/application/dto/BotSettingsDTO";
import { publishRefreshEvent } from "@/lib/message-queue-publisher";

/**
 * GET handler for getting bot settings
 *
 * @param request - Next.js Request object
 * @returns NextResponse with bot settings or error
 */
export async function GET(
  request: Request
): Promise<NextResponse<ApiResponse<BotSettingsDTO>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Instantiate repository
    const botSettingsRepository = new MongoBotSettingsRepository(
      BotSettingsModel
    );

    // Instantiate use case
    const getBotSettingsUseCase = new GetBotSettingsUseCaseImpl(
      botSettingsRepository
    );

    // Execute use case
    const botSettingsDTO = await getBotSettingsUseCase.execute();

    // Return success response
    return NextResponse.json<ApiResponse<BotSettingsDTO>>(
      {
        data: botSettingsDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json<ApiResponse<BotSettingsDTO>>(
        {
          error: {
            code: "BOT_SETTINGS_001",
            message: error.message,
          },
        },
        { status: 404 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<BotSettingsDTO>>(
      {
        error: {
          code: "BOT_SETTINGS_001",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while retrieving bot settings",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating bot settings
 *
 * Request body: UpdateBotSettingsInput (all fields optional)
 *
 * @param request - Next.js Request object
 * @returns NextResponse with updated bot settings or error
 */
export async function PUT(
  request: Request
): Promise<NextResponse<ApiResponse<BotSettingsDTO>>> {
  try {
    // Ensure database connection is established
    await connectToDatabase();

    // Parse request body
    const body = await request.json();

    // Build input (all fields are optional for updates)
    const input: UpdateBotSettingsInput = {};
    if (body.avatarURL !== undefined) {
      input.avatarURL = body.avatarURL === null ? null : body.avatarURL.trim();
    }
    if (body.botName !== undefined) {
      input.botName = body.botName?.trim();
    }
    if (body.botViberName !== undefined) {
      input.botViberName =
        body.botViberName === null ? null : body.botViberName.trim();
    }
    if (body.status !== undefined) {
      input.status = body.status;
    }
    if (body.buttonsBackground !== undefined) {
      input.buttonsBackground =
        body.buttonsBackground === null ? null : body.buttonsBackground.trim();
    }
    if (body.buttonsTextColor !== undefined) {
      input.buttonsTextColor =
        body.buttonsTextColor === null ? null : body.buttonsTextColor.trim();
    }
    if (body.buttonsPrefix !== undefined) {
      input.buttonsPrefix =
        body.buttonsPrefix === null ? null : body.buttonsPrefix.trim();
    }
    if (body.welcomeStepId !== undefined) {
      input.welcomeStepId =
        body.welcomeStepId === null ? null : body.welcomeStepId.trim();
    }
    if (body.GAKey !== undefined) {
      input.GAKey = body.GAKey === null ? null : body.GAKey.trim();
    }

    // Instantiate repositories
    const botSettingsRepository = new MongoBotSettingsRepository(
      BotSettingsModel
    );
    const stepRepository = new MongoStepRepository(StepModel);

    // Instantiate use case
    const updateBotSettingsUseCase = new UpdateBotSettingsUseCaseImpl(
      botSettingsRepository,
      stepRepository
    );

    // Execute use case
    const botSettingsDTO = await updateBotSettingsUseCase.execute(input);

    // Notify viber service to refresh cache (fire-and-forget)
    try {
      publishRefreshEvent("bot_settings");
    } catch (error) {
      console.error("Failed to publish refresh event:", error);
    }

    // Return success response
    return NextResponse.json<ApiResponse<BotSettingsDTO>>(
      {
        data: botSettingsDTO,
      },
      { status: 200 }
    );
  } catch (error) {
    // Log the actual error for debugging
    console.error("Error updating bot settings:", error);
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
      return NextResponse.json<ApiResponse<BotSettingsDTO>>(
        {
          error: {
            code: "BOT_SETTINGS_002",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle referenced Step not found errors
    if (
      error instanceof Error &&
      error.message.includes("Step") &&
      error.message.includes("not found")
    ) {
      return NextResponse.json<ApiResponse<BotSettingsDTO>>(
        {
          error: {
            code: "BOT_SETTINGS_003",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    // Handle other errors
    return NextResponse.json<ApiResponse<BotSettingsDTO>>(
      {
        error: {
          code: "BOT_SETTINGS_004",
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred while updating bot settings",
        },
      },
      { status: 500 }
    );
  }
}
