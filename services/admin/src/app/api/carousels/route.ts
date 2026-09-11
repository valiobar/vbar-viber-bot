/**
 * GET /api/carousels — list carousels
 * POST /api/carousels — create carousel
 */

import { CarouselRepository } from "@/domains/carousel/CarouselRepository";
import { CarouselModel } from "@/domains/carousel/CarouselModel";
import {
  CarouselService,
  type CreateCarouselInput,
  type ListCarouselsFilters,
} from "@/domains/carousel/CarouselService";
import {
  withDb,
  jsonOk,
  jsonError,
  parsePagination,
  parseBoolParam,
  notifyRefresh,
  ErrorCode,
} from "@/lib/api/routeHelpers";

const createCarouselService = (): CarouselService =>
  new CarouselService(new CarouselRepository(CarouselModel));

export async function GET(request: Request) {
  return withDb(async () => {
    const { searchParams } = new URL(request.url);
    const filters: ListCarouselsFilters = {};
    const hidden = parseBoolParam(searchParams.get("hidden"));
    if (hidden !== undefined) filters.hidden = hidden;
    const isTemplate = parseBoolParam(searchParams.get("isTemplate"));
    if (isTemplate !== undefined) filters.isTemplate = isTemplate;
    const search = searchParams.get("search") || undefined;
    if (search) filters.search = search;

    const result = await createCarouselService().list(
      filters,
      parsePagination(searchParams)
    );
    return jsonOk(result);
  }, { fallback: "An unexpected error occurred while listing carousels" });
}

export async function POST(request: Request) {
  return withDb(async () => {
    const body = await request.json();
    if (!body.humanReadableName) {
      return jsonError(ErrorCode.VALIDATION, "humanReadableName is required", 400);
    }
    if (!body.Cards || !Array.isArray(body.Cards)) {
      return jsonError(ErrorCode.VALIDATION, "Cards array is required", 400);
    }

    const input: CreateCarouselInput = {
      humanReadableName: body.humanReadableName.trim(),
      hidden: body.hidden ?? false,
      isTemplate: body.isTemplate ?? false,
      BgColor: body.BgColor ?? null,
      ButtonsGroupColumns: body.ButtonsGroupColumns ?? 6,
      ButtonsGroupRows: body.ButtonsGroupRows ?? 7,
      Cards: body.Cards,
    };

    const carouselDTO = await createCarouselService().create(input);
    notifyRefresh("carousels");
    return jsonOk(carouselDTO, 201);
  }, { fallback: "An unexpected error occurred while creating carousel" });
}
