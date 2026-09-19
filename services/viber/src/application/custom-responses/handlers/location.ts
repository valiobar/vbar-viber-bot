/**
 * Location custom response handler
 *
 * When a step has `responseHandler: "locationHandler"`, reads latitude and
 * longitude from a location message, then sends the admin keyboard named
 * "hui" plus a 3×2 rich-media card with "Виж на картата". Tapping the
 * button opens the public /locations map at the shared coordinates.
 *
 * Reuse other admin content the same way:
 *   ctx.botDataService.getKeyboardByName("hui")
 *   ctx.botDataService.getMessageByName("thanks")
 *   ctx.botDataService.getCarouselByName("offers")
 *   ctx.botDataService.getStepByName("welcome")
 */

import { Message } from "viber-bot";
import { ConfigHelper } from "@vbar/shared";
import { CustomResponseContext, CustomResponseHandler } from "../types";
import { KeyboardConverter } from "../../services/KeyboardConverter";

const MIN_API_VERSION = 7;
const MAIN_KEYBOARD_NAME = "hui";
const MAP_BUTTON_TEXT = "Виж на картата";
const MAP_BUTTON_BG = "#0f766e";
const MAP_BUTTON_TEXT_COLOR = "#FFFFFF";

const keyboardConverter = new KeyboardConverter();

const toCoordinate = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readCoordinates = (
  message: CustomResponseContext["message"]
): { lat: number; lng: number } | null => {
  const lat = toCoordinate(message.latitude ?? message.location?.lat);
  const lng = toCoordinate(
    message.longitude ?? message.location?.lon ?? message.location?.lng
  );
  if (
    lat === undefined ||
    lng === undefined ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
};

const publicAppUrl = (): string => {
  const raw =
    ConfigHelper.getEnv("NEXT_PUBLIC_APP_URL", "") ||
    ConfigHelper.getEnv("PUBLIC_URL", "http://localhost:3000");
  return raw.replace(/\/$/, "");
};

const buildMapUrl = (lat: number, lng: number): string => {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  return `${publicAppUrl()}/locations?${params.toString()}`;
};

const buildMapCarousel = (mapUrl: string): object => ({
  Type: "rich_media",
  ButtonsGroupColumns: 3,
  ButtonsGroupRows: 2,
  Buttons: [
    {
      Columns: 3,
      Rows: 2,
      Text: `<font color="${MAP_BUTTON_TEXT_COLOR}"><b>${MAP_BUTTON_TEXT}</b></font>`,
      ActionType: "open-url",
      ActionBody: mapUrl,
      OpenURLType: "internal",
      InternalBrowser: { Mode: "fullscreen-portrait" },
      BgColor: MAP_BUTTON_BG,
      TextSize: "large",
      TextVAlign: "middle",
      TextHAlign: "center",
      Silent: true,
    },
  ],
});

const resolveNamedKeyboard = (
  ctx: CustomResponseContext,
  name: string
): object | undefined => {
  const keyboardDTO = ctx.botDataService.getKeyboardByName(name);
  if (!keyboardDTO) {
    ctx.logger.warn("Named keyboard not found for location handler", {
      keyboardName: name,
      availableKeyboards: ctx.botDataService
        .getKeyboards()
        .map((keyboard) => keyboard.humanReadableName),
      stepId: ctx.step.id,
    });
    return undefined;
  }

  try {
    ctx.logger.info("Resolved named keyboard for location handler", {
      keyboardName: keyboardDTO.humanReadableName,
      keyboardId: keyboardDTO.id,
    });
    return keyboardConverter.convertToViberKeyboard(
      keyboardDTO,
      ctx.buttonPrefix
    );
  } catch (error) {
    ctx.logger.warn("Failed to convert named keyboard for location handler", {
      keyboardId: keyboardDTO.id,
      keyboardName: keyboardDTO.humanReadableName,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
};

export const locationHandler: CustomResponseHandler = async (ctx) => {
  if (ctx.messageType !== "location") {
    return;
  }

  const coords = readCoordinates(ctx.message);
  if (!coords) {
    ctx.logger.warn("locationHandler received a location without valid coordinates", {
      userId: ctx.userProfile.id,
      stepId: ctx.step.id,
    });
    return;
  }

  const mapUrl = buildMapUrl(coords.lat, coords.lng);
  const keyboard = resolveNamedKeyboard(ctx, MAIN_KEYBOARD_NAME);
  const userApiVersion = Number(ctx.userProfile.apiVersion);
  const minApiVersion = Math.max(
    MIN_API_VERSION,
    Number.isFinite(userApiVersion) ? Math.floor(userApiVersion) : MIN_API_VERSION
  );

  const messages: unknown[] = [
    new (Message.RichMedia as any)(
      buildMapCarousel(mapUrl),
      keyboard,
      null,
      null,
      null,
      null,
      minApiVersion
    ),
  ];

  // Rich media alone often keeps the previous keyboard on the client.
  // A dedicated Keyboard message forces the named keyboard to replace it.
  if (keyboard) {
    messages.push(
      new (Message.Keyboard as any)(keyboard, null, null, null, minApiVersion)
    );
  }

  await ctx.bot.sendMessage(ctx.userProfile, messages);

  ctx.logger.info("locationHandler sent map carousel", {
    userId: ctx.userProfile.id,
    stepId: ctx.step.id,
    lat: coords.lat,
    lng: coords.lng,
    mapUrl,
    keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
  });
};
