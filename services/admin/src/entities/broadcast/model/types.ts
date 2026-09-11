import type { BroadcastDTO } from "@vbar/shared/types";

export type { BroadcastDTO, BroadcastStatus } from "@vbar/shared/types";

export interface CreateBroadcastInput {
  name: string;
  stepId: string;
  sendToAll: boolean;
  testViberIds: string[];
  scheduledAt?: string; // ISO; omitted = send now
}

export interface ListBroadcastsResult {
  broadcasts: BroadcastDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
