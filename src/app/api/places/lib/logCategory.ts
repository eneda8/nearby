// src/app/api/places/lib/logCategory.ts
// Utility to log category results in a consistent way
import type { GooglePlacesRaw } from "../types/apiTypes";

export function logCategory(label: string, places: GooglePlacesRaw[]) {
  if (process.env.NODE_ENV === "production") return;
  const preview = places
    .slice(0, 3)
    .map((place) =>
      typeof place.displayName === "string"
        ? place.displayName
        : place.displayName?.text ?? ""
    )
    .filter(Boolean);
  console.debug(`[places] ${label}`, {
    total: places.length,
    preview,
  });
}
