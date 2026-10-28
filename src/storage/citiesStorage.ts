import type { City } from "../types/City.ts";
import type { Config } from "../types/Config.ts";
import { saveConfig } from "./settingsStorage.ts";

export function findDefaultCity(config: Config): City | undefined {
  return config.cities.find((candidate) => candidate.id === config.defaultCityId);
}

export function hasCity(config: Config, id: number): boolean {
  return config.cities.some((candidate) => candidate.id === id);
}

export async function addCityOnDisk(config: Config, city: City): Promise<boolean> {
  if (hasCity(config, city.id)) return false;

  config.cities.push(city);
  await saveConfig(config);
  return true;
}

export async function removeCityFromDisk(
  config: Config,
  id: number,
): Promise<{ removed: boolean; wasDefault: boolean }> {
  const index = config.cities.findIndex((candidate) => candidate.id === id);
  if (index === -1) return { removed: false, wasDefault: false };

  config.cities.splice(index, 1);
  const wasDefault = config.defaultCityId === id;
  if (wasDefault) config.defaultCityId = null;
  await saveConfig(config);
  return { removed: true, wasDefault };
}

export async function setDefaultCityOnDisk(config: Config, id: number): Promise<boolean> {
  if (!hasCity(config, id)) return false;

  config.defaultCityId = id;
  await saveConfig(config);
  return true;
}
