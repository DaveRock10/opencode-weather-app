import { readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { City } from "../types/City.ts";
import type { Config, Unit } from "../types/Config.ts";
import { CONFIG_FILE } from "../utils/constants.ts";

const CONFIG_PATH = join(homedir(), CONFIG_FILE);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultConfig(): Config {
  return { unit: "celsius", defaultCityId: null, cities: [] };
}

export function toCity(value: unknown): City | null {
  if (!isRecord(value)) return null;

  const { id, name, latitude, longitude } = value;
  if (!isFiniteNumber(id) || typeof name !== "string" || !name.trim()) return null;
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null;

  const city: City = { id, name: name.trim(), latitude, longitude };
  if (typeof value.country === "string") city.country = value.country;
  if (typeof value.admin1 === "string") city.admin1 = value.admin1;
  return city;
}

export function normalizeConfig(value: unknown): Config {
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

export async function loadConfig(filePath: string = CONFIG_PATH): Promise<Config> {
  try {
    const text = await readFile(filePath, "utf8");
    return normalizeConfig(JSON.parse(text) as unknown);
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: Config, filePath: string = CONFIG_PATH): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  try {
    await writeFile(tempPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await rename(tempPath, filePath);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`No se pudo guardar la configuración en ${filePath}: ${detail}`);
  }
}
