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
  CONVENIENCE_WORDS,
  SPECIALTY_CUES,
  NON_ASCII,
} from "./RegularExpressions";
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
}
