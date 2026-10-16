import type { LatLng } from "@vbar/shared/locations";

/**
 * Outbound port: resolve a free-text place name to coordinates.
 * Returns null when the place cannot be resolved (missing key, no
 * results, network error) — callers must handle the null fallback.
 */
export interface IGeocodingClient {
  geocode(query: string): Promise<LatLng | null>;
}
