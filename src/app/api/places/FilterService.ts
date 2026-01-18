// src/app/api/places/FilterService.ts
// Centralized filtering logic for category-based place search
import {
  PHARMACY_DENY,
  GAS_DENY,
  BANK_DENY,
  CLOTHING_CHAIN_DENY,
  JEWELRY_CHAIN_DENY,
  PRINT_SHIP_DENY,
  SPECIALTY_MARKETS_DENY,
  BAR_VENUE_DENY,
  CONVENIENCE_WORDS,
  SPECIALTY_CUES,
  NON_ASCII,
} from "./RegularExpressions";
import { haversineMeters } from "./lib/haversineMeters";
import { extractPosition } from "./lib/requestResponseUtils";
import type { PlacesNewPlace } from "./route";

export class FilterService {
  static filterGroceries(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      const pt = (p.primaryType || "").toLowerCase();
      if (pt !== "grocery_store" && pt !== "supermarket") return false;
      if (CONVENIENCE_WORDS.test(name)) return false;
      if (SPECIALTY_CUES.test(name) || NON_ASCII.test(name)) return false;
      if (
        /market|shop|store/i.test(name) &&
        (SPECIALTY_CUES.test(name) || NON_ASCII.test(name))
      )
        return false;
      return true;
    });
  }

  static filterPharmacy(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !PHARMACY_DENY.test(name);
    });
  }

  static filterGasEv(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !GAS_DENY.test(name);
    });
  }

  static filterBankAtm(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !BANK_DENY.test(name);
    });
  }

  static filterClothing(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !CLOTHING_CHAIN_DENY.test(name);
    });
  }

  static filterJewelry(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !JEWELRY_CHAIN_DENY.test(name);
    });
  }

  static filterPrintShip(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      return !PRINT_SHIP_DENY.test(name);
    });
  }

  static filterSpecialtyMarkets(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    const excludedPrimaryTypes = new Set([
      // Restaurants
      "restaurant",
      "fast_food_restaurant",
      "breakfast_restaurant",
      "brunch_restaurant",
      "pizza_restaurant",
      "seafood_restaurant",
      "steak_house",
      "sushi_restaurant",
      "thai_restaurant",
      "chinese_restaurant",
      "mexican_restaurant",
      "italian_restaurant",
      "indian_restaurant",
      "japanese_restaurant",
      "korean_restaurant",
      "vietnamese_restaurant",
      "american_restaurant",
      "barbecue_restaurant",
      "greek_restaurant",
      "turkish_restaurant",
      "lebanese_restaurant",
      "middle_eastern_restaurant",
      "mediterranean_restaurant",
      "french_restaurant",
      "spanish_restaurant",
      "german_restaurant",
      "brazilian_restaurant",
      "peruvian_restaurant",
      "caribbean_restaurant",
      "african_restaurant",
      "ethiopian_restaurant",
      "indonesian_restaurant",
      "malaysian_restaurant",
      "filipino_restaurant",
      "ramen_restaurant",
      "noodle_restaurant",
      "dumpling_restaurant",
      "sandwich_shop",
      "sub_shop",
      "deli",
      "hamburger_restaurant",
      "hot_dog_restaurant",
      "chicken_restaurant",
      "wing_restaurant",
      "taco_restaurant",
      "burrito_restaurant",
      "poke_restaurant",
      "vegan_restaurant",
      "vegetarian_restaurant",
      "food_court",
      // Cafes & drinks
      "cafe",
      "coffee_shop",
      "tea_house",
      "juice_shop",
      "smoothie_shop",
      "bar",
      "pub",
      "wine_bar",
      "cocktail_bar",
      "sports_bar",
      "beer_hall",
      "brewery",
      "winery",
      "distillery",
      // Desserts & sweets
      "bakery",
      "bagel_shop",
      "donut_shop",
      "ice_cream_shop",
      "frozen_yogurt_shop",
      "dessert_shop",
      "dessert_restaurant",
      "candy_store",
      "chocolate_shop",
      "pastry_shop",
      "cake_shop",
      "cupcake_shop",
      // Convenience & other
      "convenience_store",
      "gas_station",
      "pharmacy",
      "drugstore",
    ]);

    return raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      const primaryType = (p.primaryType || "").toLowerCase();
      const rating = p.rating ?? 5; // default to 5 if no rating (don't exclude)

      // Exclude chain stores
      if (SPECIALTY_MARKETS_DENY.test(name)) return false;

      // Exclude unwanted primaryTypes
      if (excludedPrimaryTypes.has(primaryType)) return false;

      // Exclude low-rated places (likely closed/fake)
      if (rating < 3.0) return false;

      return true;
    });
  }

  static filterBar(
    raw: PlacesNewPlace[],
    origin: { lat: number; lng: number }
  ): PlacesNewPlace[] {
    const PRIMARY_BAR_TYPES = new Set(["bar", "cocktail_bar", "night_club"]);
    const ALL_BAR_TYPES = new Set([
      "bar",
      "cocktail_bar",
      "night_club",
      "pub",
      "wine_bar",
      "sports_bar",
    ]);

    // Filter out venue-type results (stadiums, arenas, etc.)
    // UNLESS primaryType is a bar-related type
    const filtered = raw.filter((p: PlacesNewPlace) => {
      const name =
        typeof p.displayName === "string"
          ? p.displayName
          : p.displayName?.text || "";
      const pt = (p.primaryType || "").toLowerCase();

      // Allow if primaryType is any bar type, even if name matches venue pattern
      if (ALL_BAR_TYPES.has(pt)) return true;

      // Exclude venue-type results
      return !BAR_VENUE_DENY.test(name);
    });

    // Assign ranking tiers:
    // Tier 0: primaryType bar/cocktail_bar/night_club WITHOUT restaurant in types (pure bars)
    // Tier 1: primaryType bar/cocktail_bar/night_club WITH restaurant, OR other bar types without restaurant
    // Tier 2: any place with restaurant in types that isn't tier 0 or 1
    const getRankTier = (p: PlacesNewPlace): number => {
      const pt = (p.primaryType || "").toLowerCase();
      const types = (p.types || []).map((t: string) => t.toLowerCase());
      const hasRestaurant = types.includes("restaurant");

      // Pure bars (no restaurant) get highest priority
      if (PRIMARY_BAR_TYPES.has(pt) && !hasRestaurant) return 0;
      // Bars with restaurant, or other bar types without restaurant
      if (PRIMARY_BAR_TYPES.has(pt) || ALL_BAR_TYPES.has(pt)) return 1;
      // Everything else with restaurant is deprioritized
      if (hasRestaurant) return 2;
      return 1;
    };

    // Sort by tier first, then by distance within each tier
    return filtered.sort((a, b) => {
      const tierA = getRankTier(a);
      const tierB = getRankTier(b);

      if (tierA !== tierB) return tierA - tierB;

      // Within same tier, sort by distance
      const posA = extractPosition(a.location);
      const posB = extractPosition(b.location);

      const aValid =
        typeof posA.lat === "number" && typeof posA.lng === "number";
      const bValid =
        typeof posB.lat === "number" && typeof posB.lng === "number";

      if (!aValid) return 1;
      if (!bValid) return -1;

      const distA = haversineMeters(origin, {
        lat: posA.lat as number,
        lng: posA.lng as number,
      });
      const distB = haversineMeters(origin, {
        lat: posB.lat as number,
        lng: posB.lng as number,
      });
      return distA - distB;
    });
  }
}
