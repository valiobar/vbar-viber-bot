/**
 * recordLastVisited custom step handler
 *
 * When a step has `customHandler: "recordLastVisited"`, reads lastTitle,
 * lastImage, and lastTrigger from user state (written by a JSON button
 * action body) and prepends `{ title, image, trigger }` to state.lastVisited.
 *
 * A repeat of the same trigger is moved to the front instead of duplicated.
 * Only the first 6 entries are kept. Those entries are then sent as a
 * product-card carousel with the main keyboard.
 */
import { Message } from "viber-bot";
import { CustomStepHandler } from "../types";
import {
  MAIN_KEYBOARD_NAME,
  resolveNamedKeyboard,
} from "../../services/LocationCarousel";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

const TITLE_PROP = "lastTitle";
const IMAGE_PROP = "lastImage";
const TRIGGER_PROP = "lastTrigger";
const VISITED_PROP = "lastVisited";

const MAX_VISITED = 6;
const CARD_COLUMNS = 6;
const CARD_ROWS = 7;
const TITLE_BG = "#b1c6d2";
const TITLE_COLOR = "#27333a";
const IMAGE_BG = "#b1c6d2";
const CTA_BG = "#a6bac6";
const CTA_COLOR = "#ffffff";
const CTA_TEXT = "Информация за продукта";

interface LastVisitedEntry {
  title: string;
  image: string;
  trigger: string;
}

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
};

const escapeText = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const font = (color: string, text: string): string =>
  `<font color="${color}">${escapeText(text)}</font>`;

const isVisit = (item: unknown): item is LastVisitedEntry => {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<LastVisitedEntry>;
  return (
    typeof candidate.title === "string" &&
    candidate.title.trim() !== "" &&
    typeof candidate.image === "string" &&
    candidate.image.trim() !== "" &&
    typeof candidate.trigger === "string" &&
    candidate.trigger.trim() !== ""
  );
};

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

  const state = user.state ?? {};
  const title = asString(state[TITLE_PROP]).trim();
  const image = asString(state[IMAGE_PROP]).trim();
  const trigger = asString(state[TRIGGER_PROP]).trim();

  if (!title || !image || !trigger) {
    logger.warn("recordLastVisited: lastTitle, lastImage, or lastTrigger is empty, skipping", {
      stepId: step.id,
      userId: userProfile.id,
      hasLastTitle: Boolean(title),
      hasLastImage: Boolean(image),
      hasLastTrigger: Boolean(trigger),
    });
    return;
  }

  const entry: LastVisitedEntry = { title, image, trigger };
  const existing = Array.isArray(state[VISITED_PROP]) ? state[VISITED_PROP] : [];
  const lastVisited = [
    entry,
    ...existing.filter((item) => {
      if (!item || typeof item !== "object") return true;
      return asString((item as { trigger?: unknown }).trigger).trim() !== trigger;
    }),
  ].slice(0, MAX_VISITED);

  await userRepository.updateState(userProfile.id, { [VISITED_PROP]: lastVisited });

  const visits = lastVisited.filter(isVisit);
  const keyboard = resolveNamedKeyboard(
    botDataService,
    MAIN_KEYBOARD_NAME,
    buttonPrefix,
    logger
  );
  const richMedia = visitedCarousel(visits, buttonPrefix);
  const minApiVersion = resolveUserMinApiVersion(userProfile.apiVersion);

  await bot.sendMessage(userProfile, [
    new (Message.RichMedia as any)(
      richMedia,
      keyboard ?? null,
      null,
      null,
      null,
      null,
      minApiVersion
    ),
  ]);

  logger.info("recordLastVisited saved visit and sent carousel", {
    stepId: step.id,
    userId: userProfile.id,
    trigger,
    lastVisitedCount: visits.length,
    keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
  });
};
