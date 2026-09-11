import { http } from "@/shared";
import type {
  BroadcastDTO,
  CreateBroadcastInput,
  ListBroadcastsResult,
} from "../model/types";

export const listBroadcasts = (
  page = 1,
  limit = 20
): Promise<ListBroadcastsResult> =>
  http<ListBroadcastsResult>(`/api/broadcasts?page=${page}&limit=${limit}`);

export const createBroadcast = (
  input: CreateBroadcastInput
): Promise<BroadcastDTO> =>
  http<BroadcastDTO>("/api/broadcasts", { method: "POST", body: input });

export const cancelBroadcast = (id: string): Promise<BroadcastDTO> =>
  http<BroadcastDTO>(`/api/broadcasts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
