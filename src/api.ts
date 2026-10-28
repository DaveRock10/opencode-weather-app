import type { City, CurrentWeather, DailyWeather, Forecast, GeocodingResult, Unit } from "./types.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  override name = "ApiError";
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

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

async function fetchJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo de nuevo.");
    }
    throw new ApiError("No se pudo conectar con Open-Meteo. Revisa tu conexión a internet.");
  }

  if (!response.ok) {
    throw new ApiError(`Open-Meteo respondió con un error HTTP ${response.status}.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("Open-Meteo devolvió una respuesta que no se pudo leer.");
  }
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
  url.searchParams.set("forecast_days", "7");
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
