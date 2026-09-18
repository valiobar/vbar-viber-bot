/**
 * Example Custom Response Handler
 *
 * Template for writing custom inbound response handlers. When a step has
 * `responseHandler: "example"`, this function runs for every user reply
 * on that step (any message type except prefixed keyboard taps).
 *
 * To add a new custom response handler:
 * 1. Create a file in this folder exporting a CustomResponseHandler function
 * 2. Register it in ../index.ts under a unique name
 * 3. Add the name to CUSTOM_RESPONSE_HANDLER_NAMES in packages/shared/src/types/admin.ts
 * 4. Rebuild the shared package — the name then appears in the admin StepForm select
 */

import { Message } from "viber-bot";
import { CustomResponseHandler } from "../types";

/**
 * Example custom response handler: captures location/contact/picture replies
 * into user.state and echoes what was received; re-prompts on other types.
 */
export const exampleResponseHandler: CustomResponseHandler = async (ctx) => {
  const { message, messageType, step, bot, userProfile, userRepository, logger } =
    ctx;

  if (messageType === "location") {
    await userRepository.updateState(userProfile.id, {
      location: { lat: message.latitude, lng: message.longitude },
    });
    await bot.sendMessage(userProfile, [
      new Message.Text(
        `Location received: ${message.latitude}, ${message.longitude}`
      ),
    ]);
  } else if (messageType === "contact") {
    await userRepository.updateState(userProfile.id, {
      contact: { name: message.contactName, phone: message.contactPhoneNumber },
    });
    await bot.sendMessage(userProfile, [
      new Message.Text(
        `Contact received: ${message.contactName ?? ""} ${message.contactPhoneNumber ?? ""}`
      ),
    ]);
  } else if (messageType === "picture") {
    await userRepository.updateState(userProfile.id, {
      pictureUrl: message.url,
    });
    await bot.sendMessage(userProfile, [
      new Message.Text("Picture received, thanks!"),
    ]);
  } else {
    // Re-prompt: any other type (including plain text) is not what we expect
    await bot.sendMessage(userProfile, [
      new Message.Text("Please share a location, contact, or picture."),
    ]);
  }

  logger.info("Example custom response handler executed", {
    stepId: step.id,
    userId: userProfile.id,
    messageType,
  });

  // To advance the flow instead of staying on this step:
  // await ctx.stepSender.sendStep(nextStepId, bot, userProfile, ctx.botDataService, ctx.buttonPrefix, { source: "trigger" });
};
