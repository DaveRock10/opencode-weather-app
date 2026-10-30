import type { City } from "../../src/types/City.ts";
import type { Config } from "../../src/types/Config.ts";
import type { Forecast } from "../../src/types/Weather.ts";

export const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canadá",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

export const toronto: City = {
  id: 6167865,
  name: "Toronto",
  country: "Canadá",
  admin1: "Ontario",
  latitude: 43.70011,
  longitude: -79.4163,
};

export function makeCity(overrides: Partial<City> = {}): City {
  return { ...ottawa, ...overrides };
}

export function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    unit: "celsius",
    defaultCityId: null,
    cities: [],
    ...overrides,
  };
}

function makeDates(count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    new Date(Date.UTC(2026, 9, 28 + index)).toISOString().slice(0, 10),
  );
}

export function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    timezone: "America/Toronto",
    current: {
      time: "2026-10-28T14:05",
      temperature_2m: 12.4,
      weather_code: 2,
      wind_speed_10m: 15.3,
      relative_humidity_2m: 66,
    },
    current_units: {
      temperature_2m: "°C",
      wind_speed_10m: "km/h",
    },
    daily: {
      time: makeDates(7),
      weather_code: [2, 3, 61, 63, 0, 1, 45],
      temperature_2m_max: [15.2, 14.1, 11.8, 10.2, 13.4, 16.1, 17.0],
      temperature_2m_min: [6.8, 7.2, 5.1, 4.0, 3.9, 8.2, 9.5],
    },
    ...overrides,
  };
}
