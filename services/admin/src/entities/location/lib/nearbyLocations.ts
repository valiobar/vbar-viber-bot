import type { LatLng, NearbyLocationsResult, Location } from "../model/types";

export const DEFAULT_RADIUS_KM = 10;
export const FALLBACK_COUNT = 15;
export const RADIUS_OPTIONS_KM = [2, 5, 10, 15, 25, 50] as const;
export type RadiusKm = (typeof RADIUS_OPTIONS_KM)[number];

const toRad = (deg: number) => (deg * Math.PI) / 180;

export const haversineKm = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const getNearbyLocations = (
  locations: Location[],
  origin: LatLng,
  radiusKm = DEFAULT_RADIUS_KM
): NearbyLocationsResult => {
  const ranked = locations
    .map((item) => ({ ...item, distanceKm: haversineKm(origin, item) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  const within = ranked.filter((item) => item.distanceKm <= radiusKm);
  if (within.length > 0) return { items: within, usedFallback: false };
  return { items: ranked.slice(0, FALLBACK_COUNT), usedFallback: true };
};
