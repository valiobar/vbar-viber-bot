/**
 * Location custom response handler
 *
 * When a step has `responseHandler: "locationHandler"`, reads latitude and
 * longitude from a location message, then sends the admin keyboard named
 * "hui" plus a rich-media carousel: up to 3 closest pharmacies (name,
 * address, distance, Google Maps directions) and a "Виж всички" card
 * that opens the public /locations map at the shared coordinates.
 *
 * Reuse other admin content the same way:
 *   ctx.botDataService.getKeyboardByName("hui")
 *   ctx.botDataService.getMessageByName("thanks")
 *   ctx.botDataService.getCarouselByName("offers")
 *   ctx.botDataService.getStepByName("welcome")
 */

import { Message } from "viber-bot";
import { ConfigHelper } from "@vbar/shared";
import {
  getDestinationUrl,
  getNearbyLocations,
  locations,
  type LatLng,
  type NearbyLocation,
} from "@vbar/shared/locations";
import { CustomResponseContext, CustomResponseHandler } from "../types";
import { KeyboardConverter } from "../../services/KeyboardConverter";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

const MAIN_KEYBOARD_NAME = "main";
const CLOSEST_COUNT = 3;
const CARD_COLUMNS = 6;
const CARD_ROWS = 6;
const ADDRESS_ROWS = 4;
const MAP_IMAGE_ROWS = 5;
const NAV_BUTTON_TEXT = "Навигация";
const MAP_BUTTON_TEXT = "Виж всички";
const MAP_BG_MEDIA = "https://cdn.kvaba.xyz/bodrost/map.png";
const MAP_BUTTON_BG = "#0f766e";
const MAP_BUTTON_TEXT_COLOR = "#FFFFFF";
const TITLE_COLOR = "#131313";
const DESCRIPTION_COLOR = "#8E8E93";

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
): LatLng | null => {
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

const escapeText = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const destinationAction = (
  item: NearbyLocation,
  origin: LatLng
): { ActionType: "open-url"; ActionBody: string } => ({
  ActionType: "open-url",
  ActionBody: getDestinationUrl(item, origin),
});

const mapPageAction = (
  mapUrl: string
): {
  ActionType: "open-url";
  ActionBody: string;
  OpenURLType: "internal";
  InternalBrowser: { Mode: "fullscreen-portrait" };
} => ({
  ActionType: "open-url",
  ActionBody: mapUrl,
  OpenURLType: "internal",
  InternalBrowser: { Mode: "fullscreen-portrait" },
});

const buildNearbyCarousel = (
  origin: LatLng,
  closest: NearbyLocation[],
  mapUrl: string
): object => {
  const buttons: Record<string, unknown>[] = [];

  for (const item of closest) {
    const openDestination = destinationAction(item, origin);
    buttons.push(
      {
        Columns: CARD_COLUMNS,
        Rows: 1,
        Text: `<font color="${TITLE_COLOR}"><b>${escapeText(item.name)}</b></font>`,
        ...openDestination,
        TextSize: "medium",
        TextVAlign: "middle",
        TextHAlign: "left",
        Silent: true,
      },
      {
        Columns: CARD_COLUMNS,
        Rows: ADDRESS_ROWS,
        Text: `<font color="${DESCRIPTION_COLOR}">${escapeText(item.address)}</font>`,
        ...openDestination,
        BgMedia: MAP_BG_MEDIA,
        BgMediaType: "picture",
        BgMediaScaleType: "crop",
        TextSize: "small",
        TextVAlign: "top",
        TextHAlign: "left",
        Silent: true,
      },
      {
        Columns: CARD_COLUMNS,
        Rows: 1,
        Text: `<font color="${MAP_BUTTON_TEXT_COLOR}"><b>${NAV_BUTTON_TEXT} - ${item.distanceKm.toFixed(1).replace(".", ",")}км</b></font>`,
        ...openDestination,
        BgColor: MAP_BUTTON_BG,
        TextSize: "small",
        TextVAlign: "middle",
        TextHAlign: "center",
        Silent: true,
      }
    );
  }

  const openMapPage = mapPageAction(mapUrl);
  buttons.push(
    {
      Columns: CARD_COLUMNS,
      Rows: MAP_IMAGE_ROWS,
      Text: "",
      ...openMapPage,
      BgMedia: MAP_BG_MEDIA,
      BgMediaType: "picture",
      BgMediaScaleType: "crop",
      Silent: true,
    },
    {
      Columns: CARD_COLUMNS,
      Rows: 1,
      Text: `<font color="${MAP_BUTTON_TEXT_COLOR}"><b>${MAP_BUTTON_TEXT}</b></font>`,
      ...openMapPage,
      BgColor: MAP_BUTTON_BG,
      TextSize: "large",
      TextVAlign: "middle",
      TextHAlign: "center",
      Silent: true,
    }
  );

  return {
    Type: "rich_media",
    ButtonsGroupColumns: CARD_COLUMNS,
    ButtonsGroupRows: CARD_ROWS,
    Buttons: buttons,
  };
};

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
  const closest = getNearbyLocations(locations, coords).items.slice(
    0,
    CLOSEST_COUNT
  );
  const keyboard = resolveNamedKeyboard(ctx, MAIN_KEYBOARD_NAME);
  const minApiVersion = resolveUserMinApiVersion(ctx.userProfile.apiVersion);

  const messages: unknown[] = [
    new (Message.RichMedia as any)(
      buildNearbyCarousel(coords, closest, mapUrl),
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

  ctx.logger.info("locationHandler sent nearby locations carousel", {
    userId: ctx.userProfile.id,
    stepId: ctx.step.id,
    lat: coords.lat,
    lng: coords.lng,
    closestCount: closest.length,
    mapUrl,
    keyboardName: keyboard ? MAIN_KEYBOARD_NAME : null,
  });
};
