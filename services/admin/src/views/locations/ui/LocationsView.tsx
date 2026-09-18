"use client";

import { Suspense } from "react";
import { LocationMap } from "@/widgets/location-map";

export const LocationsView = () => (
  <Suspense fallback={<p className="p-6 text-gray-600">Зареждане…</p>}>
    <LocationMap />
  </Suspense>
);
