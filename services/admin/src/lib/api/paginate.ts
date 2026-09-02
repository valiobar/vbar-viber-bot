import type { PaginationParams } from "@vbar/shared";

export interface PaginateResult {
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Shared totalPages math used by content-domain list methods.
 */
export const paginate = (
  total: number,
  pagination?: PaginationParams
): PaginateResult => {
  const page = pagination?.page || 1;
  const limit = pagination?.limit || 10;
  return {
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
