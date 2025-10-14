import { FilterService } from "../FilterService";
import type { GooglePlacesRaw } from "../types/apiTypes";

// Handler for jewelry places
export function getJewelryPlaces(raw: GooglePlacesRaw[]): GooglePlacesRaw[] {
  return FilterService.filterJewelry(raw);
}
