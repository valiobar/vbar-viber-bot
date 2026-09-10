"use client";

/**
 * Carousel edit view
 *
 * Route body for `/carousels/[id]`. Fetches the carousel, then submits via entity api.
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CarouselForm } from "@/features/carousel-manage";
import { HttpError } from "@/shared";
import {
  deleteCarousel,
  getCarousel,
  updateCarousel,
  type CarouselDTO,
  type CreateCarouselInput,
  type UpdateCarouselInput,
} from "@/entities/carousel";

export const CarouselEditView = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [carousel, setCarousel] = useState<CarouselDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCarousel = async () => {
      try {
        setIsLoading(true);
        const data = await getCarousel(id);
        setCarousel(data);
      } catch (err) {
        console.error("Error fetching carousel:", err);
        if (err instanceof HttpError && err.status === 404) {
          setError("Carousel not found");
        } else {
          setError("Failed to load carousel");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCarousel();
    }
  }, [id]);

  const handleSubmit = async (
    data: CreateCarouselInput | UpdateCarouselInput
  ): Promise<void> => {
    try {
      await updateCarousel(id, data as UpdateCarouselInput);
      router.push("/carousels");
      router.refresh();
    } catch (err) {
      console.error("Error updating carousel:", err);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!carousel) return;

    if (
      !confirm(
        `Are you sure you want to delete "${carousel.humanReadableName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteCarousel(id);
      router.push("/carousels");
      router.refresh();
    } catch (err) {
      console.error("Error deleting carousel:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete carousel"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  if (error && !carousel) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      </main>
    );
  }

  if (!carousel) {
    return (
      <main className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">Carousel not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Carousel
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Update carousel settings and cards
          </p>
        </div>
        <button
          type="button"
          aria-label={`Delete ${carousel.humanReadableName}`}
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-red-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <CarouselForm initialData={carousel} onSubmit={handleSubmit} />
    </main>
  );
};
