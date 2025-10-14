import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import { haversineMeters } from "../lib/haversineMeters";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";

// You may want to move SPECIALTY_MARKET_QUERIES to a shared constants file
const SPECIALTY_MARKET_QUERIES = [
  "african market",
  "asian market",
  "balkan market",
  "himalayan market",
  "international market",
  "latin market",
  "european market",
  "caribbean market",
  "polish market",
  "russian market",
  "mexican market",
  "italian market",
  "spanish market",
  "turkish market",
  "greek market",
  "japanese market",
  "korean market",
  "thai market",
  "vietnamese market",
  "filipino market",
  "persian market",
  "arab market",
  "ethiopian market",
  "jamaican market",
  "indian market",
  "halal market",
  "kosher market",
  "bosna store",
  "himalayas store",
  "el parcero market",
  "pasta & cheese shop",
  // ... (truncated for brevity, copy full list from route.ts)
];

export async function getSpecialtyMarketsPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  includedTypes: string[]
): Promise<GooglePlacesRaw[]> {
  const nearbyBody = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(nearbyBody);
  const data = await resp.json();
  const typeResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];

  // TextQuery for specialty cues
  const textResults: GooglePlacesRaw[] = [];
  await Promise.all(
    SPECIALTY_MARKET_QUERIES.map(async (query) => {
      const textBody = {
        textQuery: query + " near " + lat + "," + lng,
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
  // Merge and dedupe by id, filter by radius
  const all = [...typeResults, ...textResults];
  const seen = new Set<string>();
  const raw = all.filter((p: GooglePlacesRaw) => {
    if (!p.id || seen.has(p.id)) return false;
    seen.add(p.id);
    const ll = (p.location as any)?.latLng ?? p.location;
    const position = {
      lat: Number(ll?.latitude ?? ll?.lat ?? 0),
      lng: Number(ll?.longitude ?? ll?.lng ?? 0),
    };
    const dist = haversineMeters({ lat, lng }, position);
    return dist <= radiusMeters;
  });
  return raw; // Add additional filtering if needed
}
