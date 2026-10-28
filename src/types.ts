export type Unit = "celsius" | "fahrenheit";

export interface City {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface Config {
  unit: Unit;
  defaultCityId: number | null;
  cities: City[];
}

export interface GeocodingResult {
  id?: number;
  name?: string;
  country?: string;
  admin1?: string;
  latitude?: number;
  longitude?: number;
}

export interface CurrentWeather {
  time: string;
  temperature_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  relative_humidity_2m: number;
}

export interface CurrentUnits {
  temperature_2m: string;
  wind_speed_10m: string;
}

export interface DailyWeather {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

export interface Forecast {
  timezone: string;
  current: CurrentWeather;
  current_units: CurrentUnits;
  daily: DailyWeather;
}
