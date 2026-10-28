import type { City } from "./City.ts";

export type Unit = "celsius" | "fahrenheit";

export interface Config {
  unit: Unit;
  defaultCityId: number | null;
  cities: City[];
}
