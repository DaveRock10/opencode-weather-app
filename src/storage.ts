import { readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { City, Config, Unit } from "./types.ts";

const CONFIG_PATH = join(homedir(), ".weather-cli.json");
const TEMP_PATH = `${CONFIG_PATH}.tmp`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultConfig(): Config {
  return { unit: "celsius", defaultCityId: null, cities: [] };
}

function toCity(value: unknown): City | null {
  if (!isRecord(value)) return null;

  const { id, name, latitude, longitude } = value;
  if (!isFiniteNumber(id) || typeof name !== "string" || !name.trim()) return null;
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null;

  const city: City = { id, name: name.trim(), latitude, longitude };
  if (typeof value.country === "string") city.country = value.country;
  if (typeof value.admin1 === "string") city.admin1 = value.admin1;
  return city;
}

function normalizeConfig(value: unknown): Config {
  if (!isRecord(value)) return defaultConfig();

  const cities: City[] = [];
  const rawCities = Array.isArray(value.cities) ? value.cities : [];
  for (const item of rawCities) {
    const city = toCity(item);
    if (city && !cities.some((existing) => existing.id === city.id)) cities.push(city);
  }

  const unit: Unit = value.unit === "fahrenheit" ? "fahrenheit" : "celsius";
  const defaultCityId =
    typeof value.defaultCityId === "number" && cities.some((city) => city.id === value.defaultCityId)
      ? value.defaultCityId
      : null;

  return { unit, defaultCityId, cities };
}

export async function loadConfig(): Promise<Config> {
  try {
    const text = await readFile(CONFIG_PATH, "utf8");
    return normalizeConfig(JSON.parse(text) as unknown);
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: Config): Promise<void> {
  try {
    await writeFile(TEMP_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await rename(TEMP_PATH, CONFIG_PATH);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo guardar la configuración en ${CONFIG_PATH}: ${detail}`);
  }
}
