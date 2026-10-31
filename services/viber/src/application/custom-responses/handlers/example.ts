/**
 * Example Custom Response Handler
 *
 * Template for writing custom inbound response handlers. When a step has
 * `responseHandler: "example"`, this function runs for every user reply
 * on that step, including prefixed button taps.
 *
 * To add a new custom response handler:
 * 1. Create a file in this folder exporting a CustomResponseHandler function
 * 2. Register it in ../index.ts under a unique name
 * 3. Add the name to CUSTOM_RESPONSE_HANDLER_NAMES in packages/shared/src/types/admin.ts
 * 4. Rebuild the shared package — the name then appears in the admin StepForm select
 *
 * Outcomes (return nothing unless you need to override send detection):
 * Save state only and let the normal flow continue (no sendMessage):
 *   await userRepository.updateState(userProfile.id, { lastReply: message.text ?? null });
 *   return; // or: return "continue";
 * Reply and stop:
 *   await bot.sendMessage(userProfile, [...]); // stops automatically (typed replies only)
 * Force stop without replying (for a button tap: swallow it):
 *   return "handled";
 * Save state and open another step (same as a JSON action body):
 *   return { state: { location: { lat, lng } }, trigger: "welcome" };
 * Save state only, then let the normal flow continue:
 *   return { state: { lastReply: message.text ?? null } };
 * Intercept a button tap, do work, keep the button's normal navigation:
 *   if (ctx.button?.payload?.action === "confirm") {
 *     await userRepository.updateState(userProfile.id, { confirmedAt: Date.now() });
 *   }
 *   // return nothing: payload state is merged and the trigger step opens afterwards
 */

import { Message } from "viber-bot";
import { CustomResponseHandler } from "../types";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

function textMessage(text: string, apiVersion: unknown): Message.Text {
  return new (Message.Text as any)(
    text,
    null,
    null,
    null,
    null,
    resolveUserMinApiVersion(apiVersion)
  );
}

/**
 * Example custom response handler: captures location/contact/picture replies
 * into user.state and echoes what was received; re-prompts on other types.
 */
export const exampleResponseHandler: CustomResponseHandler = async (ctx) => {
  const { message, messageType, step, bot, userProfile, userRepository, logger } =
    ctx;

  // Button taps keep their normal behavior (state merge + open trigger step)
  if (ctx.button) return;

  if (messageType === "location") {
    await userRepository.updateState(userProfile.id, {
      location: { lat: message.latitude, lng: message.longitude },
    });
    await bot.sendMessage(userProfile, [
      textMessage(
        `Location received: ${message.latitude}, ${message.longitude}`,
        userProfile.apiVersion
      ),
    ]);
  } else if (messageType === "contact") {
    await userRepository.updateState(userProfile.id, {
      contact: { name: message.contactName, phone: message.contactPhoneNumber },
    });
    await bot.sendMessage(userProfile, [
      textMessage(
        `Contact received: ${message.contactName ?? ""} ${message.contactPhoneNumber ?? ""}`,
        userProfile.apiVersion
      ),
    ]);
  } else if (messageType === "picture") {
    await userRepository.updateState(userProfile.id, {
      pictureUrl: message.url,
    });
    await bot.sendMessage(userProfile, [
      textMessage("Picture received, thanks!", userProfile.apiVersion),
    ]);
  } else {
    // Re-prompt: any other type (including plain text) is not what we expect
    await bot.sendMessage(userProfile, [
      textMessage(
        "Please share a location, contact, or picture.",
        userProfile.apiVersion
      ),
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
