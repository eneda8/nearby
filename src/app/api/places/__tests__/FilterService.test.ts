import { describe, it, expect } from "vitest";
import { FilterService } from "../FilterService";
import { createMockPlace, createMockPlaces } from "./testUtils";

describe("FilterService", () => {
  // ============================================
  // Global Helper Methods
  // ============================================
  describe("isClosed", () => {
    it("returns true for CLOSED_TEMPORARILY", () => {
      const place = createMockPlace({ businessStatus: "CLOSED_TEMPORARILY" });
      expect(FilterService.isClosed(place)).toBe(true);
    });

    it("returns true for CLOSED_PERMANENTLY", () => {
      const place = createMockPlace({ businessStatus: "CLOSED_PERMANENTLY" });
      expect(FilterService.isClosed(place)).toBe(true);
    });

    it("returns false for OPERATIONAL", () => {
      const place = createMockPlace({ businessStatus: "OPERATIONAL" });
      expect(FilterService.isClosed(place)).toBe(false);
    });

    it("returns false when businessStatus is undefined", () => {
      const place = createMockPlace({});
      expect(FilterService.isClosed(place)).toBe(false);
    });
  });

  describe("isLowQuality", () => {
    it("returns true when userRatingCount is 0", () => {
      const place = createMockPlace({ userRatingCount: 0, rating: 5.0 });
      expect(FilterService.isLowQuality(place)).toBe(true);
    });

    it("returns true when rating < 3.5 AND userRatingCount < 5", () => {
      const place = createMockPlace({ rating: 3.0, userRatingCount: 3 });
      expect(FilterService.isLowQuality(place)).toBe(true);
    });

    it("returns false when rating < 3.5 but userRatingCount >= 5", () => {
      const place = createMockPlace({ rating: 3.0, userRatingCount: 10 });
      expect(FilterService.isLowQuality(place)).toBe(false);
    });

    it("returns false when rating >= 3.5 even with few reviews", () => {
      const place = createMockPlace({ rating: 4.0, userRatingCount: 2 });
      expect(FilterService.isLowQuality(place)).toBe(false);
    });

    it("returns false for well-reviewed places", () => {
      const place = createMockPlace({ rating: 4.5, userRatingCount: 100 });
      expect(FilterService.isLowQuality(place)).toBe(false);
    });
  });

  describe("getName", () => {
    it("extracts name from displayName object", () => {
      const place = createMockPlace({ name: "Test Store" });
      expect(FilterService.getName(place)).toBe("Test Store");
    });

    it("returns empty string when displayName is missing", () => {
      const place = createMockPlace({});
      place.displayName = undefined as any;
      expect(FilterService.getName(place)).toBe("");
    });
  });

  // ============================================
  // filterJewelry
  // ============================================
  describe("filterJewelry", () => {
    it("includes jewelry stores with jewelry primaryType", () => {
      const places = createMockPlaces([
        { name: "Diamond Gallery", primaryType: "jewelry_store", userRatingCount: 50 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(1);
      expect(FilterService.getName(result[0])).toBe("Diamond Gallery");
    });

    it("excludes closed jewelry stores", () => {
      const places = createMockPlaces([
        { name: "Closed Jewelers", primaryType: "jewelry_store", businessStatus: "CLOSED_PERMANENTLY", userRatingCount: 50 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes places with no reviews", () => {
      const places = createMockPlaces([
        { name: "Sketchy Jewelers", primaryType: "jewelry_store", userRatingCount: 0 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes home goods stores even if they have jewelry in types", () => {
      const places = createMockPlaces([
        { name: "HomeGoods", primaryType: "home_goods_store", types: ["home_goods_store", "jewelry_store"], userRatingCount: 100 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes TJ Maxx and similar stores", () => {
      const places = createMockPlaces([
        { name: "TJ Maxx", primaryType: "jewelry_store", userRatingCount: 100 },
        { name: "Marshalls", primaryType: "jewelry_store", userRatingCount: 100 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes department stores", () => {
      const places = createMockPlaces([
        { name: "Macy's Jewelry", primaryType: "department_store", userRatingCount: 100 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes LLCs and Inc", () => {
      const places = createMockPlaces([
        { name: "Random Jewelry LLC", primaryType: "jewelry_store", userRatingCount: 50 },
        { name: "Some Gems Inc.", primaryType: "jewelry_store", userRatingCount: 50 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });

    it("excludes consignment shops", () => {
      const places = createMockPlaces([
        { name: "Consignment Gallery", primaryType: "jewelry_store", userRatingCount: 50 },
      ]);
      const result = FilterService.filterJewelry(places);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // filterAttractions
  // ============================================
  describe("filterAttractions", () => {
    it("includes tourist attractions", () => {
      const places = createMockPlaces([
        { name: "Famous Landmark", primaryType: "tourist_attraction", userRatingCount: 500 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(1);
    });

    it("includes museums", () => {
      const places = createMockPlaces([
        { name: "Art Museum", primaryType: "museum", userRatingCount: 200 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(1);
    });

    it("excludes parks", () => {
      const places = createMockPlaces([
        { name: "Central Park", primaryType: "park", userRatingCount: 1000 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(0);
    });

    it("excludes softball/baseball fields", () => {
      const places = createMockPlaces([
        { name: "Brown and Mitchell Softball Field", primaryType: "tourist_attraction", userRatingCount: 50 },
        { name: "Little League Baseball Field", primaryType: "tourist_attraction", userRatingCount: 30 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(0);
    });

    it("excludes playgrounds", () => {
      const places = createMockPlaces([
        { name: "Kids Playground", primaryType: "playground", userRatingCount: 20 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(0);
    });

    it("excludes amusement centers and escape rooms", () => {
      const places = createMockPlaces([
        { name: "Fun Zone", primaryType: "amusement_center", userRatingCount: 100 },
        { name: "Escape Room Challenge", primaryType: "escape_room_center", userRatingCount: 80 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(0);
    });

    it("prioritizes tourist_attraction over museum in sorting", () => {
      const places = createMockPlaces([
        { name: "Local Museum", primaryType: "museum", userRatingCount: 100 },
        { name: "Famous Landmark", primaryType: "tourist_attraction", userRatingCount: 100 },
      ]);
      const result = FilterService.filterAttractions(places);
      expect(result).toHaveLength(2);
      expect(FilterService.getName(result[0])).toBe("Famous Landmark");
      expect(FilterService.getName(result[1])).toBe("Local Museum");
    });
  });

  // ============================================
  // filterArtsAndCulture
  // ============================================
  describe("filterArtsAndCulture", () => {
    it("includes art galleries", () => {
      const places = createMockPlaces([
        { name: "Modern Art Gallery", primaryType: "art_gallery", userRatingCount: 100 },
      ]);
      const result = FilterService.filterArtsAndCulture(places);
      expect(result).toHaveLength(1);
    });

    it("includes performing arts theaters", () => {
      const places = createMockPlaces([
        { name: "City Theater", primaryType: "performing_arts_theater", userRatingCount: 200 },
      ]);
      const result = FilterService.filterArtsAndCulture(places);
      expect(result).toHaveLength(1);
    });

    it("excludes restaurants", () => {
      const places = createMockPlaces([
        { name: "Artisan Restaurant", primaryType: "restaurant", userRatingCount: 150 },
      ]);
      const result = FilterService.filterArtsAndCulture(places);
      expect(result).toHaveLength(0);
    });

    it("excludes closed venues", () => {
      const places = createMockPlaces([
        { name: "Closed Gallery", primaryType: "art_gallery", businessStatus: "CLOSED_TEMPORARILY", userRatingCount: 100 },
      ]);
      const result = FilterService.filterArtsAndCulture(places);
      expect(result).toHaveLength(0);
    });

    it("ranks galleries before theaters", () => {
      const places = createMockPlaces([
        { name: "City Theater", primaryType: "performing_arts_theater", userRatingCount: 100 },
        { name: "Art Gallery", primaryType: "art_gallery", userRatingCount: 100 },
      ]);
      const result = FilterService.filterArtsAndCulture(places);
      expect(result).toHaveLength(2);
      expect(FilterService.getName(result[0])).toBe("Art Gallery");
      expect(FilterService.getName(result[1])).toBe("City Theater");
    });
  });

  // ============================================
  // filterSports
  // ============================================
  describe("filterSports", () => {
    it("includes gyms", () => {
      const places = createMockPlaces([
        { name: "Planet Fitness", primaryType: "gym", userRatingCount: 500 },
      ]);
      const result = FilterService.filterSports(places);
      expect(result).toHaveLength(1);
    });

    it("includes fitness centers", () => {
      const places = createMockPlaces([
        { name: "CrossFit Box", primaryType: "fitness_center", userRatingCount: 100 },
      ]);
      const result = FilterService.filterSports(places);
      expect(result).toHaveLength(1);
    });

    it("excludes restaurants", () => {
      const places = createMockPlaces([
        { name: "Sports Bar & Grill", primaryType: "restaurant", userRatingCount: 200 },
      ]);
      const result = FilterService.filterSports(places);
      expect(result).toHaveLength(0);
    });

    it("excludes Dave & Buster's and similar entertainment venues", () => {
      const places = createMockPlaces([
        { name: "Dave & Buster's", primaryType: "gym", userRatingCount: 300 },
        { name: "Dave and Busters", primaryType: "fitness_center", userRatingCount: 300 },
        { name: "Main Event", primaryType: "sports_complex", userRatingCount: 200 },
        { name: "Round 1", primaryType: "gym", userRatingCount: 150 },
        { name: "Topgolf", primaryType: "golf_course", userRatingCount: 400 },
      ]);
      const result = FilterService.filterSports(places);
      expect(result).toHaveLength(0);
    });

    it("excludes bars", () => {
      const places = createMockPlaces([
        { name: "Sports Bar", primaryType: "bar", userRatingCount: 100 },
      ]);
      const result = FilterService.filterSports(places);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // filterGroceries
  // ============================================
  describe("filterGroceries", () => {
    it("includes grocery stores with correct primaryType", () => {
      const places = createMockPlaces([
        { name: "Fresh Market", primaryType: "grocery_store", userRatingCount: 200 },
      ]);
      const result = FilterService.filterGroceries(places);
      expect(result).toHaveLength(1);
    });

    it("includes supermarkets", () => {
      const places = createMockPlaces([
        { name: "Big Supermarket", primaryType: "supermarket", userRatingCount: 500 },
      ]);
      const result = FilterService.filterGroceries(places);
      expect(result).toHaveLength(1);
    });

    it("excludes convenience stores by name pattern", () => {
      const places = createMockPlaces([
        { name: "7-Eleven", primaryType: "grocery_store", userRatingCount: 50 },
        { name: "Quick Mart", primaryType: "grocery_store", userRatingCount: 30 },
      ]);
      const result = FilterService.filterGroceries(places);
      expect(result).toHaveLength(0);
    });

    it("excludes closed grocery stores", () => {
      const places = createMockPlaces([
        { name: "Closed Market", primaryType: "grocery_store", businessStatus: "CLOSED_PERMANENTLY", userRatingCount: 100 },
      ]);
      const result = FilterService.filterGroceries(places);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // filterLiquor
  // ============================================
  describe("filterLiquor", () => {
    it("includes liquor stores", () => {
      const places = createMockPlaces([
        { name: "Total Wine", primaryType: "liquor_store", userRatingCount: 300 },
      ]);
      const result = FilterService.filterLiquor(places);
      expect(result).toHaveLength(1);
    });

    it("excludes closed liquor stores", () => {
      const places = createMockPlaces([
        { name: "Closed Liquor", primaryType: "liquor_store", businessStatus: "CLOSED_TEMPORARILY", userRatingCount: 100 },
      ]);
      const result = FilterService.filterLiquor(places);
      expect(result).toHaveLength(0);
    });

    it("excludes consultant/advisor businesses", () => {
      const places = createMockPlaces([
        { name: "Wine Consultant LLC", primaryType: "liquor_store", userRatingCount: 10 },
        { name: "Liquor License Advisor", primaryType: "consultant", userRatingCount: 20 },
      ]);
      const result = FilterService.filterLiquor(places);
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // filterBar
  // ============================================
  describe("filterBar", () => {
    const origin = { lat: 42.3601, lng: -71.0589 };

    it("includes bars", () => {
      const places = createMockPlaces([
        { name: "Local Pub", primaryType: "bar", userRatingCount: 150 },
      ]);
      const result = FilterService.filterBar(places, origin);
      expect(result).toHaveLength(1);
    });

    it("excludes venues (stadiums, arenas) unless primaryType is bar", () => {
      const places = createMockPlaces([
        { name: "TD Garden Arena", primaryType: "stadium", userRatingCount: 1000 },
        { name: "Convention Center", primaryType: "event_venue", userRatingCount: 500 },
      ]);
      const result = FilterService.filterBar(places, origin);
      expect(result).toHaveLength(0);
    });

    it("prioritizes pure bars over restaurant-bars", () => {
      const places = createMockPlaces([
        { name: "Restaurant Bar", primaryType: "bar", types: ["bar", "restaurant"], userRatingCount: 100 },
        { name: "Pure Bar", primaryType: "bar", types: ["bar"], userRatingCount: 100 },
      ]);
      const result = FilterService.filterBar(places, origin);
      expect(result).toHaveLength(2);
      expect(FilterService.getName(result[0])).toBe("Pure Bar");
    });
  });

  // ============================================
  // filterClothing
  // ============================================
  describe("filterClothing", () => {
    it("includes clothing stores", () => {
      const places = createMockPlaces([
        { name: "Fashion Boutique", primaryType: "clothing_store", userRatingCount: 80 },
      ]);
      const result = FilterService.filterClothing(places);
      expect(result).toHaveLength(1);
    });

    it("excludes tailors", () => {
      const places = createMockPlaces([
        { name: "Expert Tailor", primaryType: "tailor", userRatingCount: 50 },
      ]);
      const result = FilterService.filterClothing(places);
      expect(result).toHaveLength(0);
    });

    it("excludes LLCs unless known chain", () => {
      const places = createMockPlaces([
        { name: "Random Clothing LLC", primaryType: "clothing_store", userRatingCount: 30 },
      ]);
      const result = FilterService.filterClothing(places);
      expect(result).toHaveLength(0);
    });

    it("allows known chains even with LLC", () => {
      const places = createMockPlaces([
        { name: "Gap LLC", primaryType: "clothing_store", userRatingCount: 200 },
      ]);
      const result = FilterService.filterClothing(places);
      expect(result).toHaveLength(1);
    });

    it("excludes closed stores", () => {
      const places = createMockPlaces([
        { name: "Closed Boutique", primaryType: "clothing_store", businessStatus: "CLOSED_PERMANENTLY", userRatingCount: 100 },
      ]);
      const result = FilterService.filterClothing(places);
      expect(result).toHaveLength(0);
    });
  });
});
