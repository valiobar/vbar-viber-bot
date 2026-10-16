/**
 * AI Locations Directive
 *
 * Parses an AI reply of the shape {"type":"locations","place":"..."}.
 * The place is geocoded by the Viber service (see ViberAiService) and
 * rendered as the same nearby-locations carousel as the GPS locationHandler.
 *
 * Location: Application layer (Hexagonal Architecture)
 */
import { asNonEmptyString, parseJsonObjectLoose } from "./AiCarouselDirective";

export interface AiLocationsDirective {
  place: string;
}

export const parseAiLocationsDirective = (
  text: string
): AiLocationsDirective | null => {
  const parsed = parseJsonObjectLoose(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const candidate = parsed as Record<string, unknown>;
  if (candidate.type !== "locations") {
    return null;
  }
  const place = asNonEmptyString(candidate.place);
  return place ? { place } : null;
};
