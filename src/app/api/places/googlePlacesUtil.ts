import https from "node:https";
import { URL } from "node:url";

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.primaryType",
  "places.types",
  "places.googleMapsUri",
  "places.websiteUri",
  "places.rating",
  "places.currentOpeningHours",
].join(",");

export interface IGooglePlacesApi {
  fetchNearby(body: Record<string, unknown>): Promise<Response>;
  fetchTextQuery(body: Record<string, unknown>): Promise<Response>;
}

export class GooglePlacesApi implements IGooglePlacesApi {
  private apiKey: string;
  private fieldMask: string;

  constructor(apiKey: string = API_KEY ?? "", fieldMask: string = FIELD_MASK) {
    this.apiKey = apiKey;
    this.fieldMask = fieldMask;
  }

  async fetchNearby(body: Record<string, unknown>): Promise<Response> {
    return this.postJson("https://places.googleapis.com/v1/places:searchNearby", body);
  }

  async fetchTextQuery(body: Record<string, unknown>): Promise<Response> {
    return this.postJson("https://places.googleapis.com/v1/places:searchText", body);
  }

  private async postJson(url: string, body: Record<string, unknown>): Promise<Response> {
    const payload = JSON.stringify(body);
    const endpoint = new URL(url);

    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          hostname: endpoint.hostname,
          path: endpoint.pathname + endpoint.search,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            "X-Goog-Api-Key": this.apiKey,
            "X-Goog-FieldMask": this.fieldMask,
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const text = buffer.toString("utf8");
            const responseHeaders = new Headers();
            Object.entries(res.headers).forEach(([key, value]) => {
              if (value === undefined) return;
              if (Array.isArray(value)) {
                value.forEach((entry) => responseHeaders.append(key, entry));
              } else {
                responseHeaders.append(key, value);
              }
            });
            resolve(
              new Response(text, {
                status: res.statusCode ?? 500,
                headers: responseHeaders,
              })
            );
          });
        }
      );

      request.on("error", reject);
      request.write(payload);
      request.end();
    });
  }
}

// Default instance for production use
export const googlePlacesApi = new GooglePlacesApi();

// For legacy compatibility (can be removed after refactoring route.ts)
export const fetchNearby = googlePlacesApi.fetchNearby.bind(googlePlacesApi);
export const fetchTextQuery =
  googlePlacesApi.fetchTextQuery.bind(googlePlacesApi);
