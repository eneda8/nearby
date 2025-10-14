// Utility for validating and extracting request parameters
import type {
  PlacesApiRequest,
  PlaceResponseItem,
  GooglePlacesRaw,
} from "../types/apiTypes";

export function validateRequestBody(body: any): PlacesApiRequest {
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
export function shapePlacesResponse(
  places: GooglePlacesRaw[],
  origin: { lat: number; lng: number },
  maxResults: number = 20
): PlaceResponseItem[] {
  return places
    .map((p: GooglePlacesRaw): PlaceResponseItem => {
      const ll = (p.location as any)?.latLng ?? p.location;
      const position = {
        lat: Number(ll?.latitude ?? ll?.lat ?? 0),
        lng: Number(ll?.longitude ?? ll?.lng ?? 0),
      };
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
        location: position,
        directDistanceMeters:
          p.directDistanceMeters !== undefined
            ? p.directDistanceMeters
            : require("../lib/haversineMeters").haversineMeters(
                origin,
                position
              ),
        rating: p.rating ?? undefined,
        openNow: p.currentOpeningHours?.openNow ?? undefined,
        currentOpeningHours: p.currentOpeningHours,
      };
    })
    .sort(
      (a, b) => (a.directDistanceMeters ?? 0) - (b.directDistanceMeters ?? 0)
    )
    .slice(0, maxResults);
}
