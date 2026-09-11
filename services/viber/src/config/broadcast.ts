/**
 * Broadcast worker configuration
 */

import { ConfigHelper } from "@vbar/shared";

export interface BroadcastConfig {
  pollIntervalMs: number;
  usersPerBatch: number;
  batchIntervalMs: number;
}

/**
 * Get broadcast worker configuration from environment variables
 */
export function getBroadcastConfig(): BroadcastConfig {
  return {
    pollIntervalMs: ConfigHelper.getEnvNumber("BROADCAST_POLL_INTERVAL_MS", 30000),
    usersPerBatch: ConfigHelper.getEnvNumber("BROADCAST_USERS_PER_BATCH", 300),
    batchIntervalMs: ConfigHelper.getEnvNumber("BROADCAST_BATCH_INTERVAL_MS", 600),
  };
}
