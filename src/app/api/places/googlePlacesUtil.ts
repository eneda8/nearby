import type { GooglePlacesRaw } from "./types/apiTypes";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.googleMapsUri",
  "places.rating",
  "places.currentOpeningHours",
].join(",");

export interface IGooglePlacesApi {
  fetchNearby(body: object): Promise<Response>;
  fetchTextQuery(body: object): Promise<Response>;
}

export class GooglePlacesApi implements IGooglePlacesApi {
  private apiKey: string;
  private fieldMask: string;

  constructor(apiKey: string = API_KEY ?? "", fieldMask: string = FIELD_MASK) {
    this.apiKey = apiKey;
    this.fieldMask = fieldMask;
  }

  async fetchNearby(body: object): Promise<Response> {
    return fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": this.fieldMask,
      },
      body: JSON.stringify(body),
    });
  }

  async fetchTextQuery(body: object): Promise<Response> {
    return fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": this.fieldMask,
      },
      body: JSON.stringify(body),
    });
  }
}

// Default instance for production use
export const googlePlacesApi = new GooglePlacesApi();

// For legacy compatibility (can be removed after refactoring route.ts)
export const fetchNearby = googlePlacesApi.fetchNearby.bind(googlePlacesApi);
export const fetchTextQuery =
  googlePlacesApi.fetchTextQuery.bind(googlePlacesApi);
