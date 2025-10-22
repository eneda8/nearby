// Utility for validating and extracting request parameters
import { haversineMeters } from "./haversineMeters";
import type {
  PlacesApiRequest,
  PlaceResponseItem,
  GooglePlacesRaw,
  PlaceOpeningHours,
  PlaceLocation,
} from "../types/apiTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function validateRequestBody(body: unknown): PlacesApiRequest {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object");
  }

  const { lat, lng, radiusMeters, includedTypes } = body;
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof radiusMeters !== "number"
  ) {
    throw new Error("lat, lng, radiusMeters required");
  }
  if (!Array.isArray(includedTypes) || includedTypes.length === 0) {
    throw new Error("includedTypes required");
  }
  return { lat, lng, radiusMeters, includedTypes };
}

// Utility for mapping, sorting, and slicing places for response
export const extractPosition = (location?: PlaceLocation) => {
  if (location && "latLng" in location && location.latLng) {
    const { latitude, longitude } = location.latLng;
    return {
      lat: typeof latitude === "number" ? latitude : undefined,
      lng: typeof longitude === "number" ? longitude : undefined,
    };
  }

  if (location && "latitude" in location) {
    return {
      lat: typeof location.latitude === "number" ? location.latitude : undefined,
      lng: typeof location.longitude === "number" ? location.longitude : undefined,
    };
  }

  if (location && "lat" in location) {
    return {
      lat: typeof location.lat === "number" ? location.lat : undefined,
      lng: typeof location.lng === "number" ? location.lng : undefined,
    };
  }

  return { lat: undefined, lng: undefined };
};

export function shapePlacesResponse(
  places: GooglePlacesRaw[],
  origin: { lat: number; lng: number },
  maxResults: number = 20
): PlaceResponseItem[] {
  return places
    .map((p: GooglePlacesRaw): PlaceResponseItem => {
      const { lat, lng } = extractPosition(p.location);
      const position = {
        lat: typeof lat === "number" ? lat : 0,
        lng: typeof lng === "number" ? lng : 0,
      };

      const currentOpeningHours = p.currentOpeningHours as PlaceOpeningHours | undefined;

      return {
        id: p.id,
        name:
          typeof p.displayName === "string"
            ? p.displayName
            : p.displayName?.text ?? "Unknown",
        address: p.formattedAddress ?? "",
        primaryType: p.primaryType ?? "",
        types: p.types ?? [],
        googleMapsUri: p.googleMapsUri ?? "",
        websiteUri: p.websiteUri ?? undefined,
        location: position,
        directDistanceMeters:
          p.directDistanceMeters !== undefined
            ? p.directDistanceMeters
            : haversineMeters(origin, position),
        rating: p.rating ?? undefined,
        openNow: p.currentOpeningHours?.openNow ?? undefined,
        currentOpeningHours,
      };
    })
    .sort(
      (a, b) => (a.directDistanceMeters ?? 0) - (b.directDistanceMeters ?? 0)
    )
    .slice(0, maxResults);
}
