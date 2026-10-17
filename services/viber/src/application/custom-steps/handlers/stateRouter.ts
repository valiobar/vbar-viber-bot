/**
 * stateRouter custom step handler
 *
 * When a step has `customHandler: "stateRouter"`, reads STATE_PROP from the
 * user's state. Values look like "improvment1", "improvment2", ... The trailing
 * number selects both the message and the keyboard by admin humanReadableName:
 * `question4-<n>` (e.g. improvment3 -> question4-3).
 */
import { CustomStepHandler } from "../types";
import { MessageConverter } from "../../services/MessageConverter";
import { resolveNamedKeyboard } from "../../services/LocationCarousel";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

/** State prop whose value carries the improvement index, e.g. "improvment2". */
const STATE_PROP = "improvment";

/** Shared name stem. Message and keyboard are both `${CONTENT_PREFIX}<n>`. */
const CONTENT_PREFIX = "question4-";

const indexFromValue = (value: string): string | undefined => {
  const match = value.trim().match(/(\d+)$/);
  return match?.[1];
};

export const stateRouterHandler: CustomStepHandler = async (ctx) => {
  const { step, bot, userProfile, botDataService, userRepository, buttonPrefix, logger } = ctx;

  const user = await userRepository.findByViberId(userProfile.id);
  const rawValue = (user?.state ?? {})[STATE_PROP];
  const value = rawValue == null ? "" : String(rawValue);
  const index = indexFromValue(value);

  if (!index) {
    logger.warn("stateRouter: improvment value has no trailing number, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      stateProp: STATE_PROP,
      value,
    });
    return;
  }

  const contentName = `${CONTENT_PREFIX}${index}`;
  const messageDTO = botDataService.getMessageByName(contentName);
  if (!messageDTO) {
    logger.warn("stateRouter: message not found in cache, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      stateProp: STATE_PROP,
      value,
      messageName: contentName,
      availableMessages: botDataService.getMessages().map((m) => m.humanReadableName),
    });
    return;
  }

  const minApiVersion = resolveUserMinApiVersion(userProfile.apiVersion);
  const keyboard = resolveNamedKeyboard(botDataService, contentName, buttonPrefix, logger);

  const converter = new MessageConverter(logger);
  const viberMessages = converter.convertToViberMessages([messageDTO], keyboard, minApiVersion);

  await bot.sendMessage(userProfile, viberMessages);

  logger.info("stateRouter sent state-driven message", {
    stepId: step.id,
    userId: userProfile.id,
    stateProp: STATE_PROP,
    value,
    index,
    messageName: contentName,
    keyboardName: contentName,
  });
};
