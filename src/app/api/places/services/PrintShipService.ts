import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";
import { haversineMeters } from "../lib/haversineMeters";
import { extractPosition } from "../lib/requestResponseUtils";
import { PACK_SHIP_BRANDS } from "../brands";

export async function getPrintShipPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  // 1. Nearby Search for post_office type
  const nearbyBody = {
    includedTypes: ["post_office"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(nearbyBody);
  const data = await resp.json();
  const typeResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];

  // 2. Text Search for pack/ship brands (UPS Store, FedEx Office, Staples)
  const textResults: GooglePlacesRaw[] = [];
  await Promise.all(
    PACK_SHIP_BRANDS.map(async (brand: string) => {
      const textBody = {
        textQuery: brand + " near " + lat + "," + lng,
        maxResultCount: 10,
        locationBias: makeLocationBias(lat, lng, radiusMeters),
      };
      const resp = await fetchTextQuery(textBody);
      const data = await resp.json();
      if (Array.isArray(data?.places)) {
        textResults.push(...data.places);
      }
    })
  );

  // 3. Merge, deduplicate by place ID, and filter by radius
  const all = [...typeResults, ...textResults];
  const seen = new Set<string>();
  const deduped = all.filter((place: GooglePlacesRaw) => {
    if (!place.id || seen.has(place.id)) return false;
    seen.add(place.id);

    // Filter by radius using haversine distance
    const { lat: placeLat, lng: placeLng } = extractPosition(place.location);
    if (typeof placeLat !== "number" || typeof placeLng !== "number") {
      return false;
    }
    const dist = haversineMeters({ lat, lng }, { lat: placeLat, lng: placeLng });
    return dist <= radiusMeters;
  });

  // 4. Filter out access points, drop boxes, etc.
  return FilterService.filterPrintShip(deduped);
}
