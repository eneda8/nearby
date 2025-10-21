import { logCategory } from "./lib/logCategory";
/**
 * @file Main API route for category-based place search using Google Places API.
 *
 * Flow:
 * 1. Validates incoming request payload.
 * 2. Infers search mode and category from includedTypes.
 * 3. Dispatches to the appropriate category handler/service.
 * 4. Fetches and filters places using Google Places API and service modules.
 * 5. Shapes and returns the API response.
 *
 * All service and utility functions are designed to be pure and testable.
 */
import { NextRequest, NextResponse } from "next/server";

import {
  CHAIN_DENY,
  PHARMACY_DENY,
  GAS_DENY,
  BANK_DENY,
  CLOTHING_CHAIN_DENY,
  JEWELRY_CHAIN_DENY,
} from "./RegularExpressions";
import { FilterService } from "./FilterService";
import { fetchNearby, fetchTextQuery } from "./googlePlacesUtil";
import { makeLocationRestriction } from "./lib/locationUtils";
import { OFFICE_SUPLY_BRANDS } from "./brands";
import { getGroceriesPlaces } from "./services/GroceriesService";
import { getPharmacyPlaces } from "./services/PharmacyService";
import { getGasEvPlaces } from "./services/GasEvService";
import { getBankAtmPlaces } from "./services/BankAtmService";
import { getClothingPlaces } from "./services/ClothingService";
import { getJewelryPlaces } from "./services/JewelryService";
import { getSpecialtyMarketsPlaces } from "./services/SpecialtyMarketsService";
import { haversineMeters } from "./lib/haversineMeters";
import {
  validateRequestBody,
  shapePlacesResponse,
} from "./lib/requestResponseUtils";
import { inferMode, hasAnyType } from "./lib/modeUtils";
import type {
  PlacesApiRequest,
  PlacesApiResponse,
  PlaceResponseItem,
  GooglePlacesRaw,
} from "./types/apiTypes";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;

// Straight-line distance (meters) for pre-sorting

import {
  NON_ASCII,
  CONVENIENCE_WORDS,
  SPECIALTY_CUES,
} from "./RegularExpressions";

// Deprecated: use GooglePlacesRaw and PlaceResponseItem from apiTypes.ts
export type PlacesNewPlace = GooglePlacesRaw;

/**
 * Main POST handler for /api/places.
 * Validates request, dispatches to category handler, shapes and returns response.
 * @param req - Next.js API request object
 * @returns NextResponse with PlacesApiResponse or error
 */
export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Server API key missing" },
        { status: 500 }
      );
    }

    // --- Request validation ---
    let lat: number, lng: number, radiusMeters: number, includedTypes: string[];
    try {
      const reqBody: PlacesApiRequest = validateRequestBody(await req.json());
      ({ lat, lng, radiusMeters, includedTypes } = reqBody);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // --- Category resolution ---
    const mode = inferMode(includedTypes);
    let category = "";
    let runPrintShip = includedTypes.includes("post_office");
    let otherTypes = includedTypes.filter((t: string) => t !== "post_office");
    if (runPrintShip && otherTypes.length === 0) {
      category = "print_ship_only";
    } else if (runPrintShip && otherTypes.length > 0) {
      category = "print_ship_and_others";
    } else if (
      Array.isArray(includedTypes) &&
      includedTypes.length === 2 &&
      includedTypes.includes("grocery_store") &&
      includedTypes.includes("supermarket")
    ) {
      category = "groceries";
    } else if (mode === "specialty_markets") {
      category = "specialty_markets";
    } else if (hasAnyType(includedTypes, ["pharmacy", "drugstore"])) {
      category = "pharmacy";
    } else if (
      hasAnyType(includedTypes, ["gas_station", "ev_charging_station"])
    ) {
      category = "gas_ev";
    } else if (hasAnyType(includedTypes, ["bank", "atm"])) {
      category = "bank_atm";
    } else if (
      includedTypes.length === 1 &&
      includedTypes[0] === "clothing_store"
    ) {
      category = "clothing_store";
    } else if (
      includedTypes.length === 1 &&
      includedTypes[0] === "jewelry_and_accessories"
    ) {
      category = "jewelry";
    } else {
      category = "default";
    }

    // --- Category dispatcher ---
    /**
     * Category handler dispatcher.
     * Maps category string to async handler function.
     * Each handler is pure and testable.
     */
    const categoryHandlers: Record<
      string,
      (params: {
        lat: number;
        lng: number;
        radiusMeters: number;
        includedTypes?: string[];
      }) => Promise<GooglePlacesRaw[]>
    > = {
      groceries: async ({ lat, lng, radiusMeters }) =>
        getGroceriesPlaces(lat, lng, radiusMeters),
      specialty_markets: async ({ lat, lng, radiusMeters, includedTypes }) =>
        getSpecialtyMarketsPlaces(lat, lng, radiusMeters, includedTypes ?? []),
      pharmacy: async ({ lat, lng, radiusMeters }) =>
        getPharmacyPlaces(lat, lng, radiusMeters),
      gas_ev: async ({ lat, lng, radiusMeters }) =>
        getGasEvPlaces(lat, lng, radiusMeters),
      bank_atm: async ({ lat, lng, radiusMeters }) =>
        getBankAtmPlaces(lat, lng, radiusMeters),
      clothing_store: async ({ lat, lng, radiusMeters }) => {
        const nearbyBody = {
          includedTypes: ["clothing_store"],
          maxResultCount: 20,
          locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
        };
        const resp = await fetchNearby(nearbyBody);
        const data = await resp.json();
        const raw = Array.isArray(data?.places) ? data.places : [];
        return getClothingPlaces(raw);
      },
      jewelry: async ({ lat, lng, radiusMeters }) => {
        const nearbyBody = {
          includedTypes: ["jewelry_and_accessories"],
          maxResultCount: 20,
          locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
        };
        const resp = await fetchNearby(nearbyBody);
        const data = await resp.json();
        const raw = Array.isArray(data?.places) ? data.places : [];
        return getJewelryPlaces(raw);
      },
      default: async ({ lat, lng, radiusMeters, includedTypes }) => {
        const nearbyBody = {
          includedTypes: includedTypes ?? [],
          maxResultCount: 20,
          locationRestriction: makeLocationRestriction(lat, lng, radiusMeters),
        };
        const resp = await fetchNearby(nearbyBody);
        const data = await resp.json();
        return Array.isArray(data?.places) ? data.places : [];
      },
    };

    // --- Category handler ---
    const handler = categoryHandlers[category] || categoryHandlers["default"];
    const filtered: GooglePlacesRaw[] = await handler({
      lat,
      lng,
      radiusMeters,
      includedTypes,
    });
    // Debug: log raw results before filtering
    // if (process.env.NODE_ENV !== "production") {
    //   console.log(
    //     `[${category}] raw results:`,
    //     JSON.stringify(filtered, null, 2)
    //   );
    // }
    logCategory(`[${category}] filtered:`, filtered);

    // --- Response shaping ---
    const placesShaped: PlaceResponseItem[] = shapePlacesResponse(
      filtered,
      { lat, lng },
      20
    );

    const response: PlacesApiResponse = {
      origin: { lat, lng },
      mode,
      debugIncludedTypes: includedTypes,
      places: placesShaped,
    };

    return NextResponse.json(response);

    // --- Remove all redundant post-filters: only the selected block's filter logic runs ---

    // Map to client shape + pre-rank by straight-line distance
    // ...existing code...
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
