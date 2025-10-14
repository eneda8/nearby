import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import { GAS_BRANDS } from "../brands";
import type { GooglePlacesRaw } from "../types/apiTypes";
import { haversineMeters } from "../lib/haversineMeters";
import {
  makeLocationRestriction,
  makeLocationBias,
} from "../lib/locationUtils";

export async function getGasEvPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  const nearbyBody = {
    includedTypes: ["gas_station", "ev_charging_station"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(nearbyBody);
  const data = await resp.json();
  const typeResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];

  // TextQuery for major brands
  const textResults: GooglePlacesRaw[] = [];
  await Promise.all(
    GAS_BRANDS.map(async (brand: string) => {
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
  return FilterService.filterGasEv([...typeResults, ...textResults]);
}
