import type { City, GeocodingResult } from "../types/City.ts";
import { GEOCODING_URL } from "../utils/constants.ts";
import { fetchJson } from "./client.ts";

interface GeocodingResponse {
  results?: GeocodingResult[];
}

export async function geocodeCity(query: string): Promise<City | null> {
  const name = query.trim();
  if (!name) return null;

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "es");
  url.searchParams.set("format", "json");

  const data = await fetchJson<GeocodingResponse>(url);
  const result = data.results?.[0];
  if (!result) return null;

  const { id, latitude, longitude } = result;
  if (typeof id !== "number" || typeof result.name !== "string" || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const city: City = { id, name: result.name, latitude, longitude };
  if (typeof result.country === "string") city.country = result.country;
  if (typeof result.admin1 === "string") city.admin1 = result.admin1;
  return city;
}
