import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";

export async function getBarPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  // Nearby Search for bar-related types
  const nearbyBody = {
    includedTypes: ["bar", "pub", "wine_bar", "cocktail_bar", "sports_bar"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(nearbyBody);
  const data = await resp.json();
  const nearbyResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];

  // TextQuery for better coverage (Nearby Search often returns 0 for bars)
  const textBody = {
    textQuery: "bars",
    maxResultCount: 20,
    locationBias: makeLocationBias(lat, lng, radiusMeters),
  };
  const textResp = await fetchTextQuery(textBody);
  const textData = await textResp.json();
  const textResults: GooglePlacesRaw[] = Array.isArray(textData?.places)
    ? textData.places
    : [];

  // Combine and dedupe by id
  const seenIds = new Set<string>();
  const combined: GooglePlacesRaw[] = [];
  for (const p of [...nearbyResults, ...textResults]) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      combined.push(p);
    }
  }

  // Filter out venue-type results and sort by tier then distance
  return FilterService.filterBar(combined, { lat, lng });
}
