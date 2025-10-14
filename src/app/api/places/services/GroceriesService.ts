import { fetchNearby } from "../googlePlacesUtil";
import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";
import { makeLocationRestriction } from "../lib/locationUtils";

export async function getGroceriesPlaces(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<GooglePlacesRaw[]> {
  const groceriesBody = {
    includedTypes: ["grocery_store", "supermarket"],
    maxResultCount: 20,
    locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
  };
  const resp = await fetchNearby(groceriesBody);
  const data = await resp.json();
  const typeResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];
  return FilterService.filterGroceries(typeResults);
}
