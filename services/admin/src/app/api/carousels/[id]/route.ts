/**
 * GET /api/carousels/[id] — get carousel
 * PUT /api/carousels/[id] — update carousel
 * DELETE /api/carousels/[id] — delete carousel
 */

import { CarouselRepository } from "@/domains/carousel/CarouselRepository";
import { CarouselModel } from "@/domains/carousel/CarouselModel";
import {
  CarouselService,
  type UpdateCarouselInput,
} from "@/domains/carousel/CarouselService";
import { withDb, jsonOk, requireId, notifyRefresh, noContent } from "@/lib/api/routeHelpers";

const createCarouselService = (): CarouselService =>
  new CarouselService(new CarouselRepository(CarouselModel));

type IdParams = { params: { id: string } };

export async function GET(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Carousel");
    if (idError) return idError;
    return jsonOk(await createCarouselService().get(params.id));
  }, { fallback: "An unexpected error occurred while retrieving carousel" });
}

export async function PUT(request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Carousel");
    if (idError) return idError;

    const body = await request.json();
    const input: UpdateCarouselInput = {};
    if (body.humanReadableName !== undefined) input.humanReadableName = body.humanReadableName.trim();
    if (body.hidden !== undefined) input.hidden = body.hidden;
    if (body.BgColor !== undefined) input.BgColor = body.BgColor;
    if (body.ButtonsGroupColumns !== undefined) input.ButtonsGroupColumns = body.ButtonsGroupColumns;
    if (body.ButtonsGroupRows !== undefined) input.ButtonsGroupRows = body.ButtonsGroupRows;
    if (body.Cards !== undefined) input.Cards = body.Cards;

    const carouselDTO = await createCarouselService().update(params.id, input);
    notifyRefresh("carousels");
    return jsonOk(carouselDTO);
  }, { fallback: "An unexpected error occurred while updating carousel" });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  return withDb(async () => {
    const idError = requireId(params.id, "Carousel");
    if (idError) return idError;
    await createCarouselService().delete(params.id);
    notifyRefresh("carousels");
    return noContent();
  }, { fallback: "An unexpected error occurred while deleting carousel" });
}
