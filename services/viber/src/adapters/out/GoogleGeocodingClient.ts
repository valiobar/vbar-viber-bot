/**
 * Google Geocoding Client Adapter
 *
 * Resolves a free-text place name to coordinates via the Google Geocoding
 * API. Results (including misses) are cached in memory per normalized
 * query. Transient request failures are not cached.
 *
 * Location: Output Adapters layer (Hexagonal Architecture)
 */

import { ConfigHelper, Logger } from "@vbar/shared";
import type { LatLng } from "@vbar/shared/locations";
import { IGeocodingClient } from "../../ports/out/IGeocodingClient";

const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export class GoogleGeocodingClient implements IGeocodingClient {
  private cache = new Map<string, LatLng | null>();

  constructor(private logger: Logger) {}

  async geocode(query: string): Promise<LatLng | null> {
    const key =
      ConfigHelper.getEnv("GOOGLE_MAPS_GEOCODING_API_KEY", "").trim() ||
      ConfigHelper.getEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "").trim();
    if (!key) {
      this.logger.warn("GoogleGeocodingClient - no API key configured");
      return null;
    }

    const normalized = `${query.trim()}, Bulgaria`.toLowerCase();
    if (this.cache.has(normalized)) {
      return this.cache.get(normalized)!;
    }

    try {
      const url = `${GEOCODE_URL}?address=${encodeURIComponent(
        normalized
      )}&region=bg&language=bg&key=${key}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{
          geometry?: { location?: { lat: number; lng: number } };
        }>;
      };
      const loc = data.results?.[0]?.geometry?.location;
      const result =
        loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)
          ? { lat: loc.lat, lng: loc.lng }
          : null;
      if (!result) {
        this.logger.info("GoogleGeocodingClient - no geocode result", {
          query: normalized,
          status: data.status,
        });
      }
      this.cache.set(normalized, result);
      return result;
    } catch (error) {
      this.logger.warn("GoogleGeocodingClient - geocode request failed", {
        query: normalized,
        error: error instanceof Error ? error.message : String(error),
      });
      return null; // do not cache transient failures
    }
  }
}
