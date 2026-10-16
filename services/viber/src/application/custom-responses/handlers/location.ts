/**
 * Location custom response handler
 *
 * When a step has `responseHandler: "locationHandler"`, reads latitude and
 * longitude from a location message, then sends the admin keyboard named
 * "main" plus a rich-media carousel: a "Виж на картата" card first, then
 * up to 3 pharmacies within DEFAULT_RADIUS_KM (name, address, distance,
 * Google Maps directions). The map card opens the public /locations page
 * at the shared coordinates.
 *
 * Carousel builders live in LocationCarousel so the AI locations path can
 * reuse the same layout.
 *
 * Reuse other admin content the same way:
 *   ctx.botDataService.getKeyboardByName("hui")
 *   ctx.botDataService.getMessageByName("thanks")
 *   ctx.botDataService.getCarouselByName("offers")
 *   ctx.botDataService.getStepByName("welcome")
 */

import { Message } from "viber-bot";
import {
  DEFAULT_RADIUS_KM,
  getNearbyLocations,
  locations,
  type LatLng,
} from "@vbar/shared/locations";
import { CustomResponseContext, CustomResponseHandler } from "../types";
import {
  buildMapUrl,
  buildNearbyCarousel,
  CLOSEST_COUNT,
  MAIN_KEYBOARD_NAME,
  resolveNamedKeyboard,
} from "../../services/LocationCarousel";
import { resolveUserMinApiVersion } from "../../services/resolveUserMinApiVersion";

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
  const closest = getNearbyLocations(
    locations,
    coords,
    DEFAULT_RADIUS_KM
  ).items.slice(0, CLOSEST_COUNT);
  const keyboard = resolveNamedKeyboard(
    ctx.botDataService,
    MAIN_KEYBOARD_NAME,
    ctx.buttonPrefix,
    ctx.logger
  );
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
