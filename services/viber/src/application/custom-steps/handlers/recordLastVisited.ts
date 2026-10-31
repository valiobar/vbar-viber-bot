/**
 * recordLastVisited custom step handler
 *
 * When a step has `customHandler: "recordLastVisited"`, reads
 * state.lastVisited and sends those entries as a product-card carousel
 * with the main keyboard. With no visits yet, a short Bulgarian notice is
 * sent with the same keyboard. This handler does not update user state.
 */
import { Message } from "viber-bot";
import { CustomStepHandler } from "../types";
import {
  MAIN_KEYBOARD_NAME,
  resolveNamedKeyboard,
} from "../../services/LocationCarousel";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";
import {
  LastVisitedEntry,
  isLastVisitedEntry,
} from "../../services/lastVisitedState";

const CARD_COLUMNS = 6;
const CARD_ROWS = 7;
const TITLE_BG = "#b1c6d2";
const TITLE_COLOR = "#27333a";
const IMAGE_BG = "#b1c6d2";
const CTA_BG = "#a6bac6";
const CTA_COLOR = "#ffffff";
const CTA_TEXT = "Информация за продукта";
const EMPTY_VISITS_TEXT = "Все още нямате разгледани продукти.";

const escapeText = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const font = (color: string, text: string): string =>
  `<font color="${color}">${escapeText(text)}</font>`;

/** Same JSON body the product-card patch writes onto "Информация за продукта". */
const visitActionBody = (visit: LastVisitedEntry, buttonPrefix?: string | null): string => {
  const body = visit.trigger
  return buttonPrefix ? `${buttonPrefix}${body}` : body;
};

const cardButtons = (
  visit: LastVisitedEntry,
  buttonPrefix?: string | null
): Record<string, unknown>[] => [
  {
    Columns: CARD_COLUMNS,
    Rows: 1,
    Text: font(TITLE_COLOR, visit.title),
    BgColor: TITLE_BG,
    ActionType: "none",
    ActionBody: "none",
    TextVAlign: "middle",
    TextHAlign: "center",
    TextSize: "regular",
    Silent: true,
  },
  {
    Columns: CARD_COLUMNS,
    Rows: 5,
    Text: font("#ffffff", ""),
    BgColor: IMAGE_BG,
    BgMedia: visit.image,
    BgMediaType: "picture",
    BgMediaScaleType: "fit",
    BgLoop: true,
    ActionType: "none",
    ActionBody: "none",
    TextVAlign: "middle",
    TextHAlign: "left",
    TextSize: "regular",
    Silent: true,
    Frame: {
      BorderWidth: 0,
      BorderColor: "#000000",
      CornerRadius: 0,
    },
  },
  {
    Columns: CARD_COLUMNS,
    Rows: 1,
    Text: font(CTA_COLOR, CTA_TEXT),
    BgColor: CTA_BG,
    ActionType: "reply",
    ActionBody: visitActionBody(visit, buttonPrefix),
    TextVAlign: "middle",
    TextHAlign: "center",
    TextSize: "large",
    Silent: true,
  },
];

const visitedCarousel = (
  visits: LastVisitedEntry[],
  buttonPrefix?: string | null
): Record<string, unknown> => ({
  Type: "rich_media",
  ButtonsGroupColumns: CARD_COLUMNS,
  ButtonsGroupRows: CARD_ROWS,
  Buttons: visits.flatMap((visit) => cardButtons(visit, buttonPrefix)),
});

export const recordLastVisitedHandler: CustomStepHandler = async (ctx) => {
  const { step, bot, userProfile, botDataService, userRepository, buttonPrefix, logger } =
    ctx;

  const user = await userRepository.findByViberId(userProfile.id);
  if (!user) {
    logger.warn("recordLastVisited: user not found, skipping", {
      stepId: step.id,
      userId: userProfile.id,
    });
    return;
  }

  const stored = user.state?.lastVisited;
  const visits = (Array.isArray(stored) ? stored : []).filter(isLastVisitedEntry);
  const keyboard = resolveNamedKeyboard(
    botDataService,
    MAIN_KEYBOARD_NAME,
    buttonPrefix,
    logger
  );
  const minApiVersion = resolveUserMinApiVersion(userProfile.apiVersion);

  if (visits.length === 0) {
    await bot.sendMessage(userProfile, [
      new (Message.Text as any)(
        EMPTY_VISITS_TEXT,
        keyboard ?? null,
        null,
        null,
        null,
        minApiVersion
      ),
    ]);

    logger.info("recordLastVisited sent empty-visits notice", {
      stepId: step.id,
      userId: userProfile.id,
      keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
    });
    return;
  }

  await bot.sendMessage(userProfile, [
    new (Message.RichMedia as any)(
      visitedCarousel(visits, buttonPrefix),
      keyboard ?? null,
      null,
      null,
      null,
      null,
      minApiVersion
    ),
  ]);

  logger.info("recordLastVisited sent carousel", {
    stepId: step.id,
    userId: userProfile.id,
    lastVisitedCount: visits.length,
    keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
  });
};
