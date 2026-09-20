export type LatLng = { lat: number; lng: number };

export type Location = {
  id: string;
  chain: string;
  name: string;
  district: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
};

export type NearbyLocation = Location & { distanceKm: number };

export type NearbyLocationsResult = {
  items: NearbyLocation[];
  usedFallback: boolean;
};
