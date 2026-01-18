import { fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import { makeLocationBias } from "../lib/locationUtils";
import { haversineMeters } from "../lib/haversineMeters";
import { extractPosition } from "../lib/requestResponseUtils";

// Strict patterns - must match the actual warehouse club, not gas stations or other businesses
const WAREHOUSE_CLUB_PATTERNS: { query: string; namePattern: RegExp }[] = [
  { query: "Costco Wholesale", namePattern: /\bcostco\b/i },
  { query: "Sam's Club", namePattern: /\bsam'?s\s*club\b/i },
  { query: "BJ's Wholesale Club", namePattern: /\bbj'?s\s*(wholesale)?\s*(club)?\b/i },
];

// Exclude gas stations, fuel centers, and in-store departments
const EXCLUDED_DEPARTMENTS_PATTERN = /\b(gas|fuel|gasoline|filling\s*station|floral|florist|bakery|tire|battery|optical|pharmacy|photo|hearing)\b/i;

export async function getWarehouseClubsPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  const origin = { lat, lng };

  // Text Search for each warehouse club brand
  const allResults: GooglePlacesRaw[] = [];

  await Promise.all(
    WAREHOUSE_CLUB_PATTERNS.map(async ({ query, namePattern }) => {
      const textBody = {
        textQuery: query,
        maxResultCount: 10,
        locationBias: makeLocationBias(lat, lng, radiusMeters),
      };
      const resp = await fetchTextQuery(textBody);
      const data = await resp.json();
      if (Array.isArray(data?.places)) {
        // Only keep results that actually match the brand name
        const matched = data.places.filter((p: GooglePlacesRaw) => {
          const name = FilterService.getName(p);
          return namePattern.test(name);
        });
        allResults.push(...matched);
      }
    })
  );

  // Dedupe by id
  const seenIds = new Set<string>();
  const deduped: GooglePlacesRaw[] = [];
  for (const p of allResults) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      deduped.push(p);
    }
  }

  // Filter by distance (straight-line)
  const withinRadius = deduped.filter((p) => {
    const pos = extractPosition(p.location);
    if (typeof pos.lat !== "number" || typeof pos.lng !== "number") return false;
    const dist = haversineMeters(origin, { lat: pos.lat, lng: pos.lng });
    return dist <= radiusMeters;
  });

  // Filter out gas stations and closed businesses
  return withinRadius.filter((p) => {
    if (FilterService.isClosed(p)) return false;

    const name = FilterService.getName(p);
    const primaryType = (p.primaryType || "").toLowerCase();

    // Exclude gas stations and in-store departments (bakery, floral, tire, etc.)
    if (primaryType === "gas_station") return false;
    if (EXCLUDED_DEPARTMENTS_PATTERN.test(name)) return false;

    return true;
  });
}
