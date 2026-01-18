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
  // --- Global Helper Methods ---

  /**
   * Check if a place is closed (temporarily or permanently)
   */
  static isClosed(p: PlacesNewPlace): boolean {
    const businessStatus = ((p as { businessStatus?: string }).businessStatus || "").toUpperCase();
    return businessStatus === "CLOSED_TEMPORARILY" || businessStatus === "CLOSED_PERMANENTLY";
  }

  /**
   * Check if a place is low quality (low rating with few reviews, or no reviews at all)
   * This helps filter fake/new/sketchy businesses
   */
  static isLowQuality(p: PlacesNewPlace): boolean {
    const rating = p.rating ?? 5; // default high if no rating
    const userRatingCount = (p as { userRatingCount?: number }).userRatingCount ?? 100;

    // No reviews at all = can't verify quality
    if (userRatingCount === 0) return true;

    // Low rating with few reviews = likely sketchy
    if (rating < 3.5 && userRatingCount < 5) return true;

    return false;
  }

  /**
   * Extract display name from place object
   */
  static getName(p: PlacesNewPlace): string {
    return typeof p.displayName === "string"
      ? p.displayName
      : p.displayName?.text || "";
  }

  // --- Category Filter Methods ---

  static filterGroceries(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
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
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      return !PHARMACY_DENY.test(name);
    });
  }

  static filterGasEv(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      return !GAS_DENY.test(name);
    });
  }

  static filterBankAtm(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      return !BANK_DENY.test(name);
    });
  }

  static filterClothing(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // Known clothing chains that might have "LLC" or "Inc" in their official name
    const KNOWN_CHAINS = new Set([
      "gap",
      "old navy",
      "banana republic",
      "h&m",
      "zara",
      "uniqlo",
      "forever 21",
      "urban outfitters",
      "anthropologie",
      "free people",
      "j.crew",
      "j crew",
      "express",
      "american eagle",
      "aerie",
      "abercrombie",
      "hollister",
      "pacsun",
      "zumiez",
      "hot topic",
      "torrid",
      "lane bryant",
      "chico's",
      "ann taylor",
      "loft",
      "talbots",
      "nordstrom",
      "macy's",
      "dillard's",
      "kohl's",
      "jcpenney",
      "burlington",
      "ross",
      "tj maxx",
      "tjmaxx",
      "marshalls",
      "homegoods",
      "primark",
    ]);

    const isKnownChain = (name: string): boolean => {
      const lower = name.toLowerCase();
      for (const chain of KNOWN_CHAINS) {
        if (lower.includes(chain)) return true;
      }
      return false;
    };

    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const primaryType = (p.primaryType || "").toLowerCase();

      // Exclude if name contains "LLC" or "Inc" (unless known chain)
      if (/\b(llc|inc\.?|incorporated)\b/i.test(name) && !isKnownChain(name)) {
        return false;
      }

      // Exclude tailor/alteration services
      if (primaryType === "tailor" || primaryType === "clothing_alteration_service") {
        return false;
      }

      // Existing chain deny patterns
      if (CLOTHING_CHAIN_DENY.test(name)) {
        return false;
      }

      return true;
    });
  }

  static filterJewelry(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // Exclude these primaryTypes - they may have jewelry_store in types but aren't jewelry stores
    const EXCLUDED_PRIMARY_TYPES = new Set([
      "wholesaler",
      "body_art_service",
      "tattoo_shop",
      "piercing_shop",
      "beauty_salon",
      "hair_salon",
      "nail_salon",
      "spa",
      "home_goods_store",
      "department_store",
      "clothing_store",
      "discount_store",
      "thrift_store",
      "consignment_shop",
      "antique_store",
      "gift_shop",
      "variety_store",
      "supermarket",
      "grocery_store",
    ]);

    // Stores that sell jewelry but aren't jewelry stores
    const STORE_NAME_DENY = /\b(homegoods|home\s*goods|tj\s*maxx|tjmaxx|t\.?j\.?\s*maxx|marshalls|ross|burlington|nordstrom\s*rack|consignment|llc|inc\.?|incorporated)\b/i;

    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const primaryType = (p.primaryType || "").toLowerCase();

      // Exclude unwanted primaryTypes
      if (EXCLUDED_PRIMARY_TYPES.has(primaryType)) return false;

      // STRICT: primaryType must contain "jewelry" (not just in types array)
      // This ensures we get actual jewelry stores, not dept stores with jewelry sections
      if (!primaryType.includes("jewelry")) return false;

      // Existing chain deny patterns
      if (JEWELRY_CHAIN_DENY.test(name)) return false;

      // Additional store name deny patterns
      if (STORE_NAME_DENY.test(name)) return false;

      return true;
    });
  }

  static filterPrintShip(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
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
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const primaryType = (p.primaryType || "").toLowerCase();

      // Exclude chain stores
      if (SPECIALTY_MARKETS_DENY.test(name)) return false;

      // Exclude unwanted primaryTypes
      if (excludedPrimaryTypes.has(primaryType)) return false;

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
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
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

  static filterLiquor(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // States where convenience stores generally cannot sell liquor (control states
    // and states with strict alcohol laws). In these states, exclude 7-Eleven etc.
    const CONVENIENCE_RESTRICTED_STATES = new Set([
      "MA", // Massachusetts - no alcohol at convenience stores
      "PA", // Pennsylvania - state stores only
      "UT", // Utah - state stores only
      "NH", // New Hampshire - state stores only
      "VA", // Virginia - ABC stores only
      "NC", // North Carolina - ABC stores only
      "AL", // Alabama - ABC stores only
      "ID", // Idaho - state stores only
      "OR", // Oregon - OLCC stores only
      "VT", // Vermont - state/agency stores
      "ME", // Maine - agency stores
      "OH", // Ohio - state contract stores
      "WV", // West Virginia - limited
      "WY", // Wyoming - state stores
      "MT", // Montana - state stores
      "MS", // Mississippi - ABC stores
      "IA", // Iowa - state stores
      "MI", // Michigan - state stores for spirits
      "CT", // Connecticut - no alcohol at convenience stores
      "RI", // Rhode Island - package stores only
      "NJ", // New Jersey - limited (no convenience stores)
      "DE", // Delaware - package stores only
      "MD", // Maryland - county-dependent, mostly restricted
      "KY", // Kentucky - many dry counties
      "TN", // Tennessee - wine in grocery, no spirits
      "KS", // Kansas - 3.2% beer only at convenience stores
      "OK", // Oklahoma - recent changes but still restricted
      "CO", // Colorado - limited (recent changes)
    ]);

    const CONVENIENCE_STORE_PATTERN = /\b(7[-\s]?eleven|7[-\s]?11|circle\s*k|wawa|sheetz|quiktrip|speedway|am\s*pm|ampm|mini\s*mart|kwik|quick\s*stop|convenience)\b/i;

    // Extract state abbreviation from address (expects "City, ST ZIP" or "City, State ZIP" format)
    const getStateFromAddress = (address: string): string | null => {
      // Match ", XX " or ", XX," where XX is a 2-letter state code before ZIP
      const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
      return match ? match[1] : null;
    };

    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const address = p.formattedAddress || "";
      const primaryType = (p.primaryType || "").toLowerCase();
      const types = (p.types || []).map((t: string) => t.toLowerCase());

      // Exclude non-liquor businesses that might match text search
      const NON_LIQUOR_TYPES = new Set([
        "consultant",
        "lawyer",
        "attorney",
        "accountant",
        "real_estate_agency",
        "insurance_agency",
        "grocery_store",
        "supermarket",
        "asian_grocery_store",
        "specialty_grocery_store",
        "restaurant",
        "bar",
        "cafe",
        "bakery",
        "print_shop",
        "pharmacy",
        "drugstore",
        "food",
        "market",
        "store",
        "home_goods_store",
        "furniture_store",
        "clothing_store",
        "department_store",
        "gift_shop",
        "pet_store",
        "hardware_store",
        "electronics_store",
        "book_store",
        "beauty_salon",
        "hair_salon",
        "spa",
      ]);

      const hasLiquorKeyword =
        name.toLowerCase().includes("liquor") ||
        name.toLowerCase().includes("wine") ||
        name.toLowerCase().includes("spirits") ||
        name.toLowerCase().includes("beverage") ||
        name.toLowerCase().includes("package store") ||
        name.toLowerCase().includes("bottle");

      // If no primaryType or not a liquor store, require liquor keywords in name
      if (!primaryType || primaryType === "") {
        if (!hasLiquorKeyword) return false;
      }

      // Exclude if primaryType is clearly not a liquor store
      if (NON_LIQUOR_TYPES.has(primaryType) && primaryType !== "liquor_store") {
        if (!hasLiquorKeyword) return false;
      }

      // Exclude advisor/consultant/license businesses
      if (/\b(advisor|consultant|license|licensing|attorney|lawyer)\b/i.test(name)) {
        return false;
      }

      // Check if this looks like a convenience store
      const isConvenienceStore =
        CONVENIENCE_STORE_PATTERN.test(name) ||
        primaryType === "convenience_store" ||
        types.includes("convenience_store");

      if (isConvenienceStore) {
        const state = getStateFromAddress(address);
        // Exclude if in a state where convenience stores can't sell liquor
        if (state && CONVENIENCE_RESTRICTED_STATES.has(state)) {
          return false;
        }
      }

      return true;
    });
  }

  static filterAttractions(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // Valid attraction primaryTypes
    const VALID_PRIMARY_TYPES = new Set([
      "tourist_attraction",
      "museum",
      "historical_place",
      "historical_landmark",
      "monument",
      "aquarium",
      "zoo",
    ]);

    // Exclude these primaryTypes
    const EXCLUDED_PRIMARY_TYPES = new Set([
      "amusement_center",
      "escape_room_center",
      "park",
      "playground",
      "dog_park",
      "sports_complex",
      "athletic_field",
      "golf_course",
      "gym",
      "fitness_center",
    ]);

    // Exclude these keywords in name (sports fields, parks, etc.)
    const EXCLUDED_NAME_PATTERN = /\b(softball|baseball|soccer|football|field|playground|dog\s*park|skate\s*park|splash\s*pad)\b/i;

    const filtered = raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const primaryType = (p.primaryType || "").toLowerCase();

      // Exclude unwanted primaryTypes
      if (EXCLUDED_PRIMARY_TYPES.has(primaryType)) return false;

      // Exclude by name pattern (sports fields, etc.)
      if (EXCLUDED_NAME_PATTERN.test(name)) return false;

      // Only include if primaryType is a valid attraction type
      if (!VALID_PRIMARY_TYPES.has(primaryType)) return false;

      return true;
    });

    // Sort: tourist_attraction first, then museums, then historical places
    return filtered.sort((a, b) => {
      const ptA = (a.primaryType || "").toLowerCase();
      const ptB = (b.primaryType || "").toLowerCase();

      const getRank = (pt: string): number => {
        if (pt === "tourist_attraction") return 0;
        if (pt === "museum") return 1;
        return 2;
      };

      return getRank(ptA) - getRank(ptB);
    });
  }

  static filterArtsAndCulture(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // Valid arts & culture primaryTypes
    const VALID_PRIMARY_TYPES = new Set([
      "art_gallery",
      "museum",
      "performing_arts_theater",
      "concert_hall",
      "cultural_center",
      "theater",
      "movie_theater",
      "community_center",
    ]);

    const filtered = raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const primaryType = (p.primaryType || "").toLowerCase();

      // Only include valid arts & culture types
      if (!VALID_PRIMARY_TYPES.has(primaryType)) return false;

      return true;
    });

    // Sort: museums and galleries first, then theaters
    return filtered.sort((a, b) => {
      const ptA = (a.primaryType || "").toLowerCase();
      const ptB = (b.primaryType || "").toLowerCase();

      const getRank = (pt: string): number => {
        if (pt === "museum" || pt === "art_gallery") return 0;
        if (pt === "performing_arts_theater" || pt === "concert_hall" || pt === "theater") return 1;
        return 2;
      };

      return getRank(ptA) - getRank(ptB);
    });
  }

  static filterSports(raw: PlacesNewPlace[]): PlacesNewPlace[] {
    // Valid sports/fitness primaryTypes
    const VALID_PRIMARY_TYPES = new Set([
      "gym",
      "fitness_center",
      "sports_club",
      "sports_complex",
      "golf_course",
      "stadium",
      "swimming_pool",
      "tennis_court",
      "basketball_court",
      "athletic_field",
      "skating_rink",
      "bowling_alley",
      "yoga_studio",
      "martial_arts_school",
      "dance_school",
    ]);

    // Exclude entertainment restaurants that look like sports venues
    const ENTERTAINMENT_DENY = /\b(dave\s*&?\s*buster'?s?|dave\s*and\s*buster'?s?|main\s*event|round\s*1|round\s*one|chuck\s*e\.?\s*cheese'?s?|topgolf)\b/i;

    return raw.filter((p: PlacesNewPlace) => {
      // Global checks
      if (this.isClosed(p)) return false;
      if (this.isLowQuality(p)) return false;

      const name = this.getName(p);
      const primaryType = (p.primaryType || "").toLowerCase();

      // Exclude restaurants
      if (primaryType === "restaurant" || primaryType === "bar") return false;

      // Exclude entertainment restaurants
      if (ENTERTAINMENT_DENY.test(name)) return false;

      // Only include valid sports/fitness types
      if (!VALID_PRIMARY_TYPES.has(primaryType)) return false;

      return true;
    });
  }
}
