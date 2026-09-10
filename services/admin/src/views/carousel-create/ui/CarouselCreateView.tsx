"use client";

/**
 * Carousel create view
 *
 * Route body for `/carousels/new`. Submits via the carousel entity api.
 */

import { useRouter } from "next/navigation";
import { CarouselForm } from "@/features/carousel-manage";
import {
  createCarousel,
  type CreateCarouselInput,
  type UpdateCarouselInput,
} from "@/entities/carousel";

export const CarouselCreateView = () => {
  const router = useRouter();

  const handleSubmit = async (
    data: CreateCarouselInput | UpdateCarouselInput
  ): Promise<void> => {
    const createData = data as CreateCarouselInput;

    try {
      const created = await createCarousel(createData);
      if (created.id) {
        router.push(`/carousels/${created.id}`);
      } else {
        router.push("/carousels");
      }
      router.refresh();
    } catch (err) {
      console.error("Error creating carousel:", err);
      throw err;
    }
  };

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create Carousel
        </h1>
        <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
          Create a new rich media carousel
        </p>
      </div>

      <CarouselForm onSubmit={handleSubmit} />
    </main>
  );
};
