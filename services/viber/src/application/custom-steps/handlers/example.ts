/**
 * Example Custom Step Handler
 *
 * Template for writing custom step handlers. When a step has
 * `customHandler: "example"`, this function runs INSTEAD of the normal
 * message/keyboard sending.
 *
 * To add a new custom step handler:
 * 1. Create a file in this folder exporting a CustomStepHandler function
 * 2. Register it in ../index.ts under a unique name
 * 3. Add the name to CUSTOM_STEP_HANDLER_NAMES in packages/shared/src/types/admin.ts
 * 4. Rebuild the shared package — the name then appears in the admin StepForm select
 */

import { Message } from "viber-bot";
import { CustomStepHandler } from "../types";

/**
 * Sends a runtime-built text message greeting the user by name.
 */
export const exampleHandler: CustomStepHandler = async (ctx) => {
  const { step, bot, userProfile, logger } = ctx;

  const userName = userProfile.name || "there";
  const text = `Hello ${userName}! This is the "example" custom step handler (step: ${step.humanReadableName}).`;

  await bot.sendMessage(userProfile, [new Message.Text(text)]);

  logger.info("Example custom step handler executed", {
    stepId: step.id,
    userId: userProfile.id,
  });
};
