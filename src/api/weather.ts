import type { City } from "../types/City.ts";
import type { Unit } from "../types/Config.ts";
import type { CurrentWeather, DailyWeather, Forecast } from "../types/Weather.ts";
import { FORECAST_DAYS, FORECAST_URL } from "../utils/constants.ts";
import { ApiError, fetchJson } from "./client.ts";

interface RawCurrentWeather {
  time?: string;
  temperature_2m?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  relative_humidity_2m?: number;
}

interface RawDailyWeather {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
}

interface ForecastResponse {
  timezone?: string;
  current_units?: {
    temperature_2m?: string;
    wind_speed_10m?: string;
  };
  current?: RawCurrentWeather;
  daily?: RawDailyWeather;
}

export async function fetchForecast(city: City, unit: Unit): Promise<Forecast> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  if (unit === "fahrenheit") url.searchParams.set("temperature_unit", "fahrenheit");

  const data = await fetchJson<ForecastResponse>(url);
  const rawCurrent = data.current;
  const rawDaily = data.daily;

  if (
    !rawCurrent ||
    typeof rawCurrent.temperature_2m !== "number" ||
    typeof rawCurrent.weather_code !== "number"
  ) {
    throw new ApiError("La respuesta del clima está incompleta. Inténtalo de nuevo.");
  }

  if (
    !rawDaily ||
    !Array.isArray(rawDaily.time) ||
    !Array.isArray(rawDaily.weather_code) ||
    !Array.isArray(rawDaily.temperature_2m_max) ||
    !Array.isArray(rawDaily.temperature_2m_min) ||
    rawDaily.time.length === 0
  ) {
    throw new ApiError("No hay datos de pronóstico disponibles para esta ciudad.");
  }

  const current: CurrentWeather = {
    time: rawCurrent.time ?? "",
    temperature_2m: rawCurrent.temperature_2m,
    weather_code: rawCurrent.weather_code,
    wind_speed_10m: typeof rawCurrent.wind_speed_10m === "number" ? rawCurrent.wind_speed_10m : 0,
    relative_humidity_2m:
      typeof rawCurrent.relative_humidity_2m === "number" ? rawCurrent.relative_humidity_2m : 0,
  };

  const daily: DailyWeather = {
    time: rawDaily.time,
    weather_code: rawDaily.weather_code,
    temperature_2m_max: rawDaily.temperature_2m_max,
    temperature_2m_min: rawDaily.temperature_2m_min,
  };

  return {
    timezone: data.timezone ?? "",
    current,
    current_units: {
      temperature_2m: data.current_units?.temperature_2m ?? (unit === "fahrenheit" ? "°F" : "°C"),
      wind_speed_10m: data.current_units?.wind_speed_10m ?? "km/h",
    },
    daily,
  };
}
