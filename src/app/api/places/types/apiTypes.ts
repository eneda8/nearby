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

/**
 * Represents a single place result returned to the client.
 */
export type PlaceResponseItem = {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  types: string[];
  googleMapsUri: string;
  websiteUri?: string;
  location: { lat: number; lng: number };
  directDistanceMeters: number | null;
  rating?: number; // Star rating (0-5)
  openNow?: boolean; // Is the place open now?
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: any[];
    weekdayDescriptions?: string[];
  };
};

/**
 * Raw result from Google Places API (internal use).
 */
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
  websiteUri?: string;
  directDistanceMeters?: number;
  rating?: number; // Star rating (0-5)
  openNow?: boolean; // Is the place open now?
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: any[];
    weekdayDescriptions?: string[];
  };
};
