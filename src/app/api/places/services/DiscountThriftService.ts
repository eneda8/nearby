import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";
import { haversineMeters } from "../lib/haversineMeters";
import { extractPosition } from "../lib/requestResponseUtils";

const DISCOUNT_THRIFT_QUERIES = [
  "Dollar General",
  "Dollar Tree",
  "Family Dollar",
  "Five Below",
  "Goodwill",
  "Savers",
  "Salvation Army thrift",
  "Value Village",
  "thrift store",
  "consignment shop",
];

export async function getDiscountThriftPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  const origin = { lat, lng };

  // Nearby Search for discount stores
  const nearbyBody = {
    includedTypes: ["discount_store"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const nearbyResp = await fetchNearby(nearbyBody);
  const nearbyData = await nearbyResp.json();
  const nearbyResults: GooglePlacesRaw[] = Array.isArray(nearbyData?.places)
    ? nearbyData.places
    : [];

  // Text Search for specific brands and store types
  const textResults: GooglePlacesRaw[] = [];
  await Promise.all(
    DISCOUNT_THRIFT_QUERIES.map(async (query: string) => {
      const textBody = {
        textQuery: query,
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

  // Filter by distance (straight-line)
  const withinRadius = combined.filter((p) => {
    const pos = extractPosition(p.location);
    if (typeof pos.lat !== "number" || typeof pos.lng !== "number") return false;
    const dist = haversineMeters(origin, { lat: pos.lat, lng: pos.lng });
    return dist <= radiusMeters;
  });

  // Apply global filters
  return withinRadius.filter((p) => {
    if (FilterService.isClosed(p)) return false;
    if (FilterService.isLowQuality(p)) return false;
    return true;
  });
}
