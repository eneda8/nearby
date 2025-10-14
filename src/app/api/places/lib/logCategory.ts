// src/app/api/places/lib/logCategory.ts
// Utility to log category results in a consistent way
import type { GooglePlacesRaw } from "../types/apiTypes";

export function logCategory(label: string, places: GooglePlacesRaw[]) {
  // For production, consider using a robust logger like 'winston' or 'pino'.
  // This is a simple console logger for development/debugging.
  console.log(
    label,
    places.length,
    places
      .slice(0, 3)
      .map((p: GooglePlacesRaw) =>
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || ""
      )
  );
}
