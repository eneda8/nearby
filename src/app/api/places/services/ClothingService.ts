import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";

// Handler for clothing places
export function getClothingPlaces(raw: GooglePlacesRaw[]): GooglePlacesRaw[] {
  return FilterService.filterClothing(raw);
}
