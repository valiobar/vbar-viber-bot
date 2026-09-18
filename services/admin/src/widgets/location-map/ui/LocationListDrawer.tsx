"use client";

import { useEffect } from "react";
import type { ChangeEvent } from "react";
import {
  getDestinationUrl,
  RADIUS_OPTIONS_KM,
  type LatLng,
  type NearbyLocation,
  type RadiusKm,
} from "@/entities/location";
import { CloseIcon, DestinationIcon } from "@/shared";

type LocationListDrawerProps = {
  isOpen: boolean;
  items: NearbyLocation[];
  usedFallback: boolean;
  selected: NearbyLocation | null;
  selectedId: string | null;
  radiusKm: RadiusKm;
  origin: LatLng;
  onClose: () => void;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  onRadiusChange: (radiusKm: RadiusKm) => void;
};

export const LocationListDrawer = ({
  isOpen,
  items,
  usedFallback,
  selected,
  selectedId,
  radiusKm,
  origin,
  onClose,
  onSelect,
  onClearSelection,
  onRadiusChange,
}: LocationListDrawerProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  const handleRadiusChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextRadiusKm = Number(event.target.value);
    if (!RADIUS_OPTIONS_KM.includes(nextRadiusKm as RadiusKm)) return;
    onRadiusChange(nextRadiusKm as RadiusKm);
  };

  return (
    <aside
      id="location-drawer"
      data-testid="location-drawer"
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex h-[40vh] max-h-[40vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:max-h-none lg:w-[24rem] lg:rounded-none"
      aria-label="Списък с локации наблизо"
    >
        <header className="flex shrink-0 flex-col gap-2 border-b border-gray-100 p-3 lg:gap-3 lg:p-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-semibold lg:text-xl">Локации наблизо</h1>
            <button
              type="button"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Скрий списъка с локации"
              onClick={onClose}
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <label
            className="flex items-center justify-between gap-3 text-sm text-gray-700"
            htmlFor="location-radius"
          >
            <span>Радиус</span>
            <select
              id="location-radius"
              data-testid="location-radius"
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
              value={radiusKm}
              onChange={handleRadiusChange}
            >
              {RADIUS_OPTIONS_KM.map((optionKm) => (
                <option key={optionKm} value={optionKm}>
                  {optionKm} км
                </option>
              ))}
            </select>
          </label>
        </header>
        {usedFallback ? (
          <p data-testid="location-map-fallback" className="shrink-0 px-3 pt-2 text-sm text-gray-700 lg:px-4 lg:pt-3">
            Няма локации в радиус {radiusKm} км. Показани са най-близките.
          </p>
        ) : null}
        {selected ? (
          <article className="relative mx-3 mt-2 shrink-0 rounded-md border border-gray-200 p-3 pr-10 lg:mx-4 lg:mt-3">
            <button
              type="button"
              className="absolute right-2 top-2 rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Затвори прегледа на локацията"
              data-testid="location-preview-close"
              onClick={onClearSelection}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
            <h2 className="font-medium">{selected.name}</h2>
            <p className="text-sm text-gray-700">{selected.chain}</p>
            <p className="text-sm text-gray-700">
              {selected.address}, {selected.city}
            </p>
            <p className="text-sm text-gray-700">
              {selected.distanceKm.toFixed(1)} км
            </p>
            <a
              href={getDestinationUrl(selected, origin)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
              data-testid="location-destination-link"
              aria-label={`Отвори маршрут до ${selected.name} в Google Maps`}
            >
              <DestinationIcon className="h-4 w-4" />
              Маршрут
            </a>
          </article>
        ) : null}
        <ol
          data-testid="location-list"
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3 lg:p-4"
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center rounded-md ${
                item.id === selectedId
                  ? "bg-teal-50 text-teal-900"
                  : "hover:bg-gray-50"
              }`}
            >
              <button
                type="button"
                className={`min-w-0 flex-1 px-3 py-2 text-left text-sm ${
                  item.id === selectedId ? "font-medium" : ""
                }`}
                aria-pressed={item.id === selectedId}
                aria-label={`${item.name}, ${item.distanceKm.toFixed(1)} километра`}
                onClick={() => handleSelect(item.id)}
              >
                {item.name} · {item.distanceKm.toFixed(1)} км
              </button>
              <a
                href={getDestinationUrl(item, origin)}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md p-2 text-teal-700 hover:bg-teal-100"
                aria-label={`Отвори маршрут до ${item.name} в Google Maps`}
              >
                <DestinationIcon className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ol>
    </aside>
  );
};
