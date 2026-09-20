import type { LatLng } from "./types";

export const getDestinationUrl = (
  destination: LatLng,
  origin?: LatLng | null
): string => {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
  });
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};
