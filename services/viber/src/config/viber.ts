/**
 * Viber Bot configuration
 */

import { ConfigHelper } from "@vbar/shared";

export interface ViberConfig {
  token: string;
  webhookUrl: string | null; // Optional - can be auto-constructed from public URL
  adminServiceUrl: string;
  adminServiceToken: string | null;
  publicUrl?: string; // Optional public URL for auto-constructing webhook URL
}

/**
 * Get Viber bot configuration from environment variables
 */
export function getViberConfig(): ViberConfig {
  const publicUrl = ConfigHelper.getEnv("PUBLIC_URL", "");
  const webhookUrl = ConfigHelper.getEnv("VIBER_BOT_WEBHOOK_URL", "");

  // Auto-construct webhook URL if not provided but public URL is available
  const finalWebhookUrl =
    webhookUrl || (publicUrl ? `${publicUrl}/webhook/viber` : null);

  return {
    token: ConfigHelper.getEnv("VIBER_BOT_TOKEN"),
    webhookUrl: finalWebhookUrl,
    publicUrl: publicUrl || undefined,
    adminServiceUrl: ConfigHelper.getEnv(
      "ADMIN_SERVICE_URL",
      "http://localhost:3000"
    ),
    adminServiceToken: process.env.ADMIN_SERVICE_TOKEN || null,
  };
}
