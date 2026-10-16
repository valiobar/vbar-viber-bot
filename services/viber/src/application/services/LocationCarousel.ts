/**
 * Location carousel builder
 *
 * Shared rich-media carousel for nearby pharmacies: a map card first, then
 * up to CLOSEST_COUNT location cards (name, address, distance, directions).
 * Used by the GPS locationHandler; the AI locations path reuses the same
 * builders without a CustomResponseContext.
 *
 * Location: Application layer (Hexagonal Architecture)
 */

import { ConfigHelper, Logger } from "@vbar/shared";
import {
  getDestinationUrl,
  type LatLng,
  type NearbyLocation,
} from "@vbar/shared/locations";
import { BotDataService } from "./BotDataService";
import { KeyboardConverter } from "./KeyboardConverter";

export const MAIN_KEYBOARD_NAME = "main";
export const AI_KEYBOARD_NAME = "ai keyboard";
export const CLOSEST_COUNT = 3;
const CARD_COLUMNS = 6;
const CARD_ROWS = 6;
const ADDRESS_ROWS = 4;
const MAP_IMAGE_ROWS = 5;
const NAV_BUTTON_TEXT = "Навигация";
const MAP_BUTTON_TEXT = "Виж на картата";
const MAP_BG_MEDIA = "https://cdn.kvaba.xyz/bodrost/map.png";
const MAP_BUTTON_BG = "#0f766e";
const MAP_BUTTON_TEXT_COLOR = "#FFFFFF";
const TITLE_COLOR = "#131313";
const DESCRIPTION_COLOR = "#8E8E93";

const keyboardConverter = new KeyboardConverter();

const publicAppUrl = (): string => {
  const raw =
    ConfigHelper.getEnv("NEXT_PUBLIC_APP_URL", "") ||
    ConfigHelper.getEnv("PUBLIC_URL", "http://localhost:3000");
  return raw.replace(/\/$/, "");
};

export const buildMapUrl = (lat: number, lng: number): string => {
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

export const buildNearbyCarousel = (
  origin: LatLng,
  closest: NearbyLocation[],
  mapUrl: string
): object => {
  const buttons: Record<string, unknown>[] = [];
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

  return {
    Type: "rich_media",
    ButtonsGroupColumns: CARD_COLUMNS,
    ButtonsGroupRows: CARD_ROWS,
    Buttons: buttons,
  };
};

/** ctx-free version of the location handler's named-keyboard lookup */
export const resolveNamedKeyboard = (
  botDataService: BotDataService,
  name: string,
  buttonPrefix: string | null | undefined,
  logger: Logger
): object | undefined => {
  const keyboardDTO = botDataService.getKeyboardByName(name);
  if (!keyboardDTO) {
    logger.warn("Named keyboard not found for location carousel", {
      keyboardName: name,
      availableKeyboards: botDataService
        .getKeyboards()
        .map((keyboard) => keyboard.humanReadableName),
    });
    return undefined;
  }
  try {
    return keyboardConverter.convertToViberKeyboard(keyboardDTO, buttonPrefix);
  } catch (error) {
    logger.warn("Failed to convert named keyboard for location carousel", {
      keyboardId: keyboardDTO.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
};
