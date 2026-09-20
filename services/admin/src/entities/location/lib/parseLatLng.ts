import type { LatLng } from "@vbar/shared/locations";

export const parseLatLng = (
  latRaw: string | null,
  lngRaw: string | null
): LatLng | null => {
  if (latRaw == null || lngRaw == null) return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
};
