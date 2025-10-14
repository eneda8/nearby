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
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[Groceries] Request body:",
      JSON.stringify(groceriesBody, null, 2)
    );
  }
  const resp = await fetchNearby(groceriesBody);
  if (process.env.NODE_ENV !== "production") {
    console.log("[Groceries] API response status:", resp.status);
  }
  const data = await resp.json();
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[Groceries] API response data:",
      JSON.stringify(data, null, 2)
    );
  }
  const typeResults: GooglePlacesRaw[] = Array.isArray(data?.places)
    ? data.places
    : [];
  return FilterService.filterGroceries(typeResults);
}
