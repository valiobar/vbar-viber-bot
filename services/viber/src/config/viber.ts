/**
 * Viber Bot configuration
 */

import { ConfigHelper } from "@vbar/shared";

export interface ViberConfig {
  token: string;
  webhookUrl: string;
}

/**
 * Get Viber bot configuration from environment variables
 */
export function getViberConfig(): ViberConfig {
  return {
    token: ConfigHelper.getEnv("VIBER_BOT_TOKEN"),
    webhookUrl: ConfigHelper.getEnv("VIBER_BOT_WEBHOOK_URL"),
  };
}

