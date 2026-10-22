/**
 * triggerCarousel custom step handler
 *
 * When a step has `customHandler: "triggerCarousel"`, reads the inbound
 * message, strips the button prefix, and treats the remainder as the trigger
 * (e.g. "product-1"). Sends an intro text, then that named carousel as a
 * rich-media message, together with the admin keyboard named "main".
 */
import { Message } from "viber-bot";
import { CustomStepHandler } from "../types";
import { CarouselConverter } from "../../services/CarouselConverter";
import {
  MAIN_KEYBOARD_NAME,
  resolveNamedKeyboard,
} from "../../services/LocationCarousel";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

const INTRO_TEXT =
  "💚 *Ти избираш. Ние ти помагаме да откриеш подходящия продукт.*\n\nСпоред отговорите ти нашето предложение е:";

/** Remove the button prefix the same way TextMessageHandler does. */
const triggerFromMessage = (
  text: string,
  buttonPrefix: string | null | undefined
): string => {
  if (!buttonPrefix || buttonPrefix.trim() === "") {
    return text.trim();
  }

  const normalizedPrefix = buttonPrefix.toLowerCase();
  const prefixIndex = text.toLowerCase().indexOf(normalizedPrefix);
  if (prefixIndex === -1) {
    return text.trim();
  }

  return (
    text.substring(0, prefixIndex) +
    text.substring(prefixIndex + buttonPrefix.length)
  ).trim();
};

export const triggerCarouselHandler: CustomStepHandler = async (ctx) => {
  const { step, bot, userProfile, botDataService, buttonPrefix, message, logger } = ctx;

  const text = typeof message?.text === "string" ? message.text : "";
  const trigger = triggerFromMessage(text, buttonPrefix);

  if (!trigger) {
    logger.warn("triggerCarousel: no trigger after stripping button prefix, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      hasMessage: Boolean(message),
    });
    return;
  }

  const carouselDTO = botDataService.getCarouselByName(trigger);
  if (!carouselDTO) {
    logger.warn("triggerCarousel: carousel not found in cache, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      trigger,
      availableCarousels: botDataService.getCarousels().map((c) => c.humanReadableName),
    });
    return;
  }

  let richMedia: object;
  try {
    richMedia = new CarouselConverter(logger).convertToViberRichMedia(
      carouselDTO,
      buttonPrefix
    );
  } catch (error) {
    logger.warn("triggerCarousel: failed to convert carousel, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      trigger,
      carouselId: carouselDTO.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const keyboard = resolveNamedKeyboard(
    botDataService,
    MAIN_KEYBOARD_NAME,
    buttonPrefix,
    logger
  );
  const minApiVersion = resolveUserMinApiVersion(userProfile.apiVersion);

  const messages: unknown[] = [
    new (Message.Text as any)(INTRO_TEXT, null, null, null, null, minApiVersion),
    new (Message.RichMedia as any)(
      richMedia,
      keyboard,
      null,
      null,
      null,
      null,
      minApiVersion
    ),
  ];

  // Rich media alone often keeps the previous keyboard on the client.
  if (keyboard) {
    messages.push(
      new (Message.Keyboard as any)(keyboard, null, null, null, minApiVersion)
    );
  }

  await bot.sendMessage(userProfile, messages);

  logger.info("triggerCarousel sent named carousel", {
    stepId: step.id,
    userId: userProfile.id,
    trigger,
    carouselId: carouselDTO.id,
    keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
  });
};
