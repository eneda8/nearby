// Types for request payload and API response for /api/places

export type PlacesApiRequest = {
  lat: number;
  lng: number;
  radiusMeters: number;
  includedTypes: string[];
};

export type PlacesApiResponse = {
  origin: { lat: number; lng: number };
  mode: string;
  debugIncludedTypes: string[];
  places: PlaceResponseItem[];
};

export type PlaceResponseItem = {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  types: string[];
  googleMapsUri: string;
  location: { lat: number; lng: number };
  directDistanceMeters: number | null;
};

// Internal type for Google Places API result (raw)
export type GooglePlacesRaw = {
  id: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?:
    | { latLng?: { latitude?: number; longitude?: number } }
    | { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  googleMapsUri?: string;
  directDistanceMeters?: number;
};
