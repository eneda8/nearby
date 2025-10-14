// src/app/api/places/lib/locationUtils.ts
// Utility for building location restriction objects for Google Places API

export function makeLocationRestriction(
  lat: number,
  lng: number,
  radiusMeters: number
) {
  return {
    circle: {
      center: { latitude: lat, longitude: lng },
      radius: radiusMeters,
    },
  };
}

export function makeLocationBias(
  lat: number,
  lng: number,
  radiusMeters: number
) {
  // For textQuery API
  return {
    circle: {
      center: { latitude: lat, longitude: lng },
      radius: radiusMeters,
    },
  };
}
