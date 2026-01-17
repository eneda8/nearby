// src/app/api/places/FilterService.ts
// Centralized filtering logic for category-based place search
import {
  PHARMACY_DENY,
  GAS_DENY,
  BANK_DENY,
  CLOTHING_CHAIN_DENY,
  JEWELRY_CHAIN_DENY,
  PRINT_SHIP_DENY,
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
}
