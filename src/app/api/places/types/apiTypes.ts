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

export type PlaceOpeningTime = {
  day?: number;
  hour?: number;
  minute?: number;
};

export type PlaceOpeningPeriod = {
  open?: PlaceOpeningTime;
  close?: PlaceOpeningTime;
};

export type PlaceOpeningHours = {
  openNow?: boolean;
  periods?: PlaceOpeningPeriod[];
  weekdayDescriptions?: string[];
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
  currentOpeningHours?: PlaceOpeningHours;
};

/**
 * Raw result from Google Places API (internal use).
 */
export type PlaceLocation =
  | {
      latLng?: { latitude?: number; longitude?: number };
    }
  | { latitude?: number; longitude?: number }
  | { lat?: number; lng?: number };

export type GooglePlacesRaw = {
  id: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?: PlaceLocation;
  primaryType?: string;
  types?: string[];
  googleMapsUri?: string;
  websiteUri?: string;
  directDistanceMeters?: number;
  rating?: number; // Star rating (0-5)
  userRatingCount?: number; // Number of user ratings
  businessStatus?: string; // OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY
  openNow?: boolean; // Is the place open now?
  currentOpeningHours?: PlaceOpeningHours;
};
