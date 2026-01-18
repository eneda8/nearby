import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWarehouseClubsPlaces } from "../services/WarehouseClubsService";

// Mock the Google API utilities
vi.mock("../googlePlacesUtil", () => ({
  fetchTextQuery: vi.fn(),
}));

// Mock the location utilities
vi.mock("../lib/locationUtils", () => ({
  makeLocationBias: vi.fn(() => ({ circle: { center: { latitude: 42.36, longitude: -71.06 }, radius: 1609 } })),
}));

import { fetchTextQuery } from "../googlePlacesUtil";

const mockFetchTextQuery = vi.mocked(fetchTextQuery);

describe("WarehouseClubsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns Costco stores", async () => {
    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "costco_1",
            displayName: { text: "Costco Wholesale", languageCode: "en" },
            primaryType: "warehouse_store",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.5,
            userRatingCount: 500,
          },
        ],
      }),
    } as Response);

    const result = await getWarehouseClubsPlaces(42.36, -71.06, 1609);

    expect(result.length).toBeGreaterThanOrEqual(1);
    const names = result.map(p =>
      typeof p.displayName === 'string' ? p.displayName : p.displayName?.text
    );
    expect(names.some(n => n?.includes("Costco"))).toBe(true);
  });

  it("filters out gas stations", async () => {
    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "costco_gas",
            displayName: { text: "Costco Gas Station", languageCode: "en" },
            primaryType: "gas_station",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.0,
            userRatingCount: 100,
          },
          {
            id: "costco_store",
            displayName: { text: "Costco Wholesale", languageCode: "en" },
            primaryType: "warehouse_store",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.5,
            userRatingCount: 500,
          },
        ],
      }),
    } as Response);

    const result = await getWarehouseClubsPlaces(42.36, -71.06, 1609);

    const names = result.map(p =>
      typeof p.displayName === 'string' ? p.displayName : p.displayName?.text
    );
    expect(names.some(n => n?.includes("Gas"))).toBe(false);
    expect(names.some(n => n?.includes("Costco Wholesale"))).toBe(true);
  });

  it("filters out in-store departments (bakery, floral, tire)", async () => {
    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "sams_bakery",
            displayName: { text: "Sam's Club Bakery", languageCode: "en" },
            primaryType: "bakery",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.0,
            userRatingCount: 50,
          },
          {
            id: "sams_floral",
            displayName: { text: "Sam's Club Floral", languageCode: "en" },
            primaryType: "florist",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 5.0,
            userRatingCount: 20,
          },
          {
            id: "costco_tire",
            displayName: { text: "Costco Tire Service Center", languageCode: "en" },
            primaryType: "auto_parts_store",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 3.5,
            userRatingCount: 80,
          },
          {
            id: "sams_main",
            displayName: { text: "Sam's Club", languageCode: "en" },
            primaryType: "warehouse_store",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 4.3,
            userRatingCount: 400,
          },
        ],
      }),
    } as Response);

    const result = await getWarehouseClubsPlaces(42.36, -71.06, 1609);

    const names = result.map(p =>
      typeof p.displayName === 'string' ? p.displayName : p.displayName?.text
    );

    expect(names.some(n => n?.includes("Bakery"))).toBe(false);
    expect(names.some(n => n?.includes("Floral"))).toBe(false);
    expect(names.some(n => n?.includes("Tire"))).toBe(false);
    expect(names.some(n => n === "Sam's Club")).toBe(true);
  });

  it("filters out non-matching names like 'Sam Gas Station'", async () => {
    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "sam_gas",
            displayName: { text: "Sam Gas Station", languageCode: "en" },
            primaryType: "gas_station",
            location: { latitude: 42.36, longitude: -71.06 },
            rating: 3.5,
            userRatingCount: 30,
          },
        ],
      }),
    } as Response);

    const result = await getWarehouseClubsPlaces(42.36, -71.06, 1609);

    // "Sam Gas Station" doesn't match "Sam's Club" pattern and is a gas station
    expect(result).toHaveLength(0);
  });

  it("filters out places outside radius", async () => {
    mockFetchTextQuery.mockResolvedValue({
      json: async () => ({
        places: [
          {
            id: "costco_far",
            displayName: { text: "Costco Wholesale", languageCode: "en" },
            primaryType: "warehouse_store",
            // Location far away (about 100km from origin)
            location: { latitude: 43.36, longitude: -72.06 },
            rating: 4.5,
            userRatingCount: 500,
          },
        ],
      }),
    } as Response);

    // 1609 meters = 1 mile
    const result = await getWarehouseClubsPlaces(42.36, -71.06, 1609);

    expect(result).toHaveLength(0);
  });
});
