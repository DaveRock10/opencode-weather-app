import { fetchForecast } from "../api/weather.ts";
import { pause } from "../presentation/input.ts";
import { printInfo, printWarning } from "../presentation/output.ts";
import { findDefaultCity } from "../storage/citiesStorage.ts";
import type { City } from "../types/City.ts";
import type { Config, Unit } from "../types/Config.ts";
import { renderWeather } from "../utils/format.ts";

async function showWeather(city: City, unit: Unit): Promise<void> {
  printInfo("Consultando el clima...");
  const forecast = await fetchForecast(city, unit);
  console.log(`\n${renderWeather(city, forecast, unit)}\n`);
  await pause();
}

export async function getDefaultWeather(config: Config): Promise<void> {
  const city = findDefaultCity(config);
  if (!city) {
    printWarning("No hay ciudad default. Agrega una (opción 3) y establéclela (opción 5).");
    await pause();
    return;
  }
  await showWeather(city, config.unit);
}
