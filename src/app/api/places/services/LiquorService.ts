import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import { LIQUOR_BRANDS } from "../brands";
import type { GooglePlacesRaw } from "../types/apiTypes";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";
import { haversineMeters } from "../lib/haversineMeters";
import { extractPosition } from "../lib/requestResponseUtils";

export async function getLiquorPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  const origin = { lat, lng };

  // Nearby Search for liquor stores
  const nearbyBody = {
    includedTypes: ["liquor_store"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(nearbyBody);
  const data = await resp.json();
  const nearbyResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];

  // TextQuery for major brands
  const textResults: GooglePlacesRaw[] = [];
  await Promise.all(
    LIQUOR_BRANDS.map(async (brand: string) => {
      const textBody = {
        textQuery: brand,
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

  // Combine and dedupe by id
  const seenIds = new Set<string>();
  const combined: GooglePlacesRaw[] = [];
  for (const p of [...nearbyResults, ...textResults]) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      combined.push(p);
    }
  }

  // Filter by distance - strict radius enforcement (straight-line)
  const withinRadius = combined.filter((p) => {
    const pos = extractPosition(p.location);
    if (typeof pos.lat !== "number" || typeof pos.lng !== "number") return false;
    const dist = haversineMeters(origin, { lat: pos.lat, lng: pos.lng });
    return dist <= radiusMeters;
  });

  return FilterService.filterLiquor(withinRadius);
}
