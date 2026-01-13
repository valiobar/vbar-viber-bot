/**
 * Culture Detection Service
 *
 * Domain service for detecting if a message is related to Bulgarian culture.
 * Provides keyword-based detection for both Bulgarian and English text.
 */
export class CultureDetectionService {
  private static readonly BULGARIAN_KEYWORDS = [
    // Bulgarian (Cyrillic)
    "българия",
    "български",
    "българин",
    "българка",
    "традиция",
    "традиции",
    "култура",
    "културен",
    "празник",
    "празници",
    "обичай",
    "обичаи",
    "история",
    "исторически",
    "фолклор",
    "фолклорен",
    // English
    "bulgaria",
    "bulgarian",
    "bulgarians",
    "tradition",
    "traditions",
    "cultural",
    "culture",
    "holiday",
    "holidays",
    "custom",
    "customs",
    "history",
    "historical",
    "folklore",
    "folk",
  ];

  /**
   * Check if a message is related to Bulgarian culture
   * @param message - The message to check
   * @returns true if the message is related to Bulgarian culture
   */
  static isBulgarianCultureRelated(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return this.BULGARIAN_KEYWORDS.some((keyword) =>
      lowerMessage.includes(keyword)
    );
  }
}
