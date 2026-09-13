/**
 * AI Provider value object
 * Represents the supported AI model providers
 */
export enum AIProvider {
  OPENAI = "openai",
  OLLAMA = "ollama",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  DEEPSEEK = "deepseek",
}

/**
 * Parse and validate AI provider string
 * @param value - Provider string value
 * @returns Validated AIProvider enum value
 * @throws Error if provider is not supported
 */
export function parseAIProvider(value: string): AIProvider {
  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case "openai":
      return AIProvider.OPENAI;
    case "ollama":
      return AIProvider.OLLAMA;
    case "anthropic":
      return AIProvider.ANTHROPIC;
    case "google":
      return AIProvider.GOOGLE;
    case "deepseek":
      return AIProvider.DEEPSEEK;
    default:
      throw new Error(
        `Unsupported AI provider: ${value}. Supported providers: openai, ollama, anthropic, google, deepseek`
      );
  }
}



