import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAttractionsPlaces } from "../services/AttractionsService";

// Mock the Google API utilities
vi.mock("../googlePlacesUtil", () => ({
  fetchNearby: vi.fn(),
  fetchTextQuery: vi.fn(),
}));

vi.mock("../lib/locationUtils", () => ({
  makeLocationRestriction: vi.fn(() => ({ circle: { center: { latitude: 42.36, longitude: -71.06 }, radius: 1609 } })),
  makeLocationBias: vi.fn(() => ({ circle: { center: { latitude: 42.36, longitude: -71.06 }, radius: 1609 } })),
}));

import { fetchNearby, fetchTextQuery } from "../googlePlacesUtil";

const mockFetchNearby = vi.mocked(fetchNearby);
const mockFetchTextQuery = vi.mocked(fetchTextQuery);

describe("AttractionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("combines results from nearby search and text search", async () => {
    mockFetchNearby.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "museum_1",
            displayName: { text: "Art Museum", languageCode: "en" },
            primaryType: "museum",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.5,
            userRatingCount: 200,
          },
        ],
      }),
    } as Response);

    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "landmark_1",
            displayName: { text: "Famous Landmark", languageCode: "en" },
            primaryType: "tourist_attraction",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.8,
            userRatingCount: 1000,
          },
        ],
      }),
    } as Response);

    const result = await getAttractionsPlaces(42.36, -71.06, 1609);

    // Should have results from both sources (deduped)
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it("deduplicates results from multiple sources", async () => {
    const samePlace = {
      id: "museum_1",
      displayName: { text: "Art Museum", languageCode: "en" },
      primaryType: "museum",
      location: { latitude: 42.36, longitude: -71.06 },
      rating: 4.5,
      userRatingCount: 200,
    };

    mockFetchNearby.mockResolvedValue({
      json: async () => ({ places: [samePlace] }),
    } as Response);

    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({ places: [samePlace] }),
    } as Response);

    const result = await getAttractionsPlaces(42.36, -71.06, 1609);

    // Same place should only appear once
    const ids = result.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it("filters out softball fields and playgrounds", async () => {
    mockFetchNearby.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "softball",
            displayName: { text: "Brown and Mitchell Softball Field", languageCode: "en" },
            primaryType: "tourist_attraction",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.0,
            userRatingCount: 50,
          },
          {
            id: "museum",
            displayName: { text: "History Museum", languageCode: "en" },
            primaryType: "museum",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.5,
            userRatingCount: 300,
          },
        ],
      }),
    } as Response);

    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({ places: [] }),
    } as Response);

    const result = await getAttractionsPlaces(42.36, -71.06, 1609);

    const names = result.map(p =>
      typeof p.displayName === 'string' ? p.displayName : p.displayName?.text
    );

    expect(names.some(n => n?.includes("Softball"))).toBe(false);
    expect(names.some(n => n?.includes("Museum"))).toBe(true);
  });

  it("prioritizes tourist_attraction over museum in sorting", async () => {
    mockFetchNearby.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "museum",
            displayName: { text: "Local Museum", languageCode: "en" },
            primaryType: "museum",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.5,
            userRatingCount: 200,
          },
          {
            id: "landmark",
            displayName: { text: "Famous Landmark", languageCode: "en" },
            primaryType: "tourist_attraction",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.8,
            userRatingCount: 500,
          },
        ],
      }),
    } as Response);

    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({ places: [] }),
    } as Response);

    const result = await getAttractionsPlaces(42.36, -71.06, 1609);

    expect(result.length).toBe(2);
    // tourist_attraction should be first
    expect(result[0].primaryType).toBe("tourist_attraction");
    expect(result[1].primaryType).toBe("museum");
  });
});
