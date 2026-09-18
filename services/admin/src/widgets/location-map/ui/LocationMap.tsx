"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";
import {
  DEFAULT_RADIUS_KM,
  getNearbyLocations,
  parseLatLng,
  locations,
  type NearbyLocation,
  type RadiusKm,
} from "@/entities/location";
import { ListIcon } from "@/shared";
import { LocationListDrawer } from "./LocationListDrawer";

export const LocationMap = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const originFromUrl = parseLatLng(
    searchParams.get("lat"),
    searchParams.get("lng")
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(DEFAULT_RADIUS_KM);

  useEffect(() => {
    if (originFromUrl || geoError) return;
    if (!navigator.geolocation) {
      setGeoError(
        "Браузърът не поддържа геолокация. Отворете страницата с ?lat=&lng=."
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        router.replace(`/locations?lat=${lat}&lng=${lng}`);
      },
      () => {
        setGeoError(
          "Няма достъп до локацията. Разрешете достъп или добавете ?lat=&lng= в адреса."
        );
      }
    );
  }, [originFromUrl, geoError, router]);

  const nearby = useMemo(
    () =>
      originFromUrl
        ? getNearbyLocations(locations, originFromUrl, radiusKm)
        : null,
    [originFromUrl, radiusKm]
  );

  const handleSelectLocation = (id: string) => {
    setSelectedId(id);
    setIsDrawerOpen(true);
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const handleRadiusChange = (nextRadiusKm: RadiusKm) => {
    setRadiusKm(nextRadiusKm);
  };

  const handleClearSelection = () => {
    setSelectedId(null);
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!apiKey) {
    return (
      <p data-testid="location-map-error" className="p-6">
        Липсва NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
      </p>
    );
  }
  if (geoError) {
    return (
      <p data-testid="location-map-error" className="p-6">
        {geoError}
      </p>
    );
  }
  if (!originFromUrl || !nearby) {
    return <p className="p-6 text-gray-600">Определяне на локация…</p>;
  }

  const selected = nearby.items.find((item) => item.id === selectedId) ?? null;

  return (
    <main className="relative h-screen overflow-hidden">
      <div className="h-full w-full" data-testid="location-map">
        <APIProvider apiKey={apiKey}>
          <Map
            className="h-full w-full"
            defaultCenter={originFromUrl}
            defaultZoom={13}
            mapId="location-map"
            gestureHandling="greedy"
          >
            <AdvancedMarker
              position={originFromUrl}
              title="Вашето местоположение"
            >
              <Pin
                background="#2563eb"
                borderColor="#1d4ed8"
                glyphColor="#ffffff"
              />
            </AdvancedMarker>
            {nearby.items.map((item: NearbyLocation) => (
              <AdvancedMarker
                key={item.id}
                position={{ lat: item.lat, lng: item.lng }}
                title={item.name}
                onClick={() => handleSelectLocation(item.id)}
              >
                <Pin
                  background={item.id === selectedId ? "#0f766e" : "#dc2626"}
                  borderColor={item.id === selectedId ? "#115e59" : "#b91c1c"}
                  glyphColor="#ffffff"
                />
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>
      {!isDrawerOpen ? (
        <button
          type="button"
          className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-2 ring-white hover:bg-teal-800"
          aria-expanded={false}
          aria-controls="location-drawer"
          data-testid="location-drawer-open"
          onClick={handleOpenDrawer}
        >
          <ListIcon className="h-5 w-5" />
          Локации ({nearby.items.length})
        </button>
      ) : null}
      <LocationListDrawer
        isOpen={isDrawerOpen}
        items={nearby.items}
        usedFallback={nearby.usedFallback}
        selected={selected}
        selectedId={selectedId}
        radiusKm={radiusKm}
        origin={originFromUrl}
        onClose={handleCloseDrawer}
        onSelect={handleSelectLocation}
        onClearSelection={handleClearSelection}
        onRadiusChange={handleRadiusChange}
      />
    </main>
  );
};
