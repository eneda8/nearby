import type { GooglePlacesRaw } from "../types/apiTypes";

/**
 * Factory function to create mock place data for testing
 */
export function createMockPlace(overrides: Partial<GooglePlacesRaw> & {
  name?: string;
  businessStatus?: string;
  userRatingCount?: number;
}): GooglePlacesRaw {
  const {
    name = "Test Place",
    businessStatus,
    userRatingCount,
    ...rest
  } = overrides;

  return {
    id: `place_${Math.random().toString(36).substr(2, 9)}`,
    displayName: { text: name, languageCode: "en" },
    formattedAddress: "123 Test St, Boston, MA 02101, USA",
    location: { latitude: 42.3601, longitude: -71.0589 },
    types: [],
    primaryType: "",
    rating: 4.5,
    ...(businessStatus && { businessStatus }),
    ...(userRatingCount !== undefined && { userRatingCount }),
    ...rest,
  } as GooglePlacesRaw;
}

/**
 * Create multiple mock places at once
 */
export function createMockPlaces(configs: Array<Partial<GooglePlacesRaw> & {
  name?: string;
  businessStatus?: string;
  userRatingCount?: number;
}>): GooglePlacesRaw[] {
  return configs.map(createMockPlace);
}
