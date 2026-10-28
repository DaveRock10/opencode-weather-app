import { ask, pause, parseIndex } from "../presentation/input.ts";
import { printCities, printSuccess, printWarning } from "../presentation/output.ts";
import { setDefaultCityOnDisk } from "../storage/citiesStorage.ts";
import type { Config } from "../types/Config.ts";
import { cityLabel } from "../utils/format.ts";

export async function setDefaultCity(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("No hay ciudades guardadas. Usa la opción 3 para agregar una.");
    await pause();
    return;
  }

  console.log("");
  printCities(config.cities);
  console.log("");
  const input = await ask("  Número de la ciudad default (0 para cancelar): ");
  const index = parseIndex(input, config.cities.length);
  if (input === "0") return;
  if (index === null || index === 0) {
    printWarning("Opción no válida.");
    await pause();
    return;
  }

  const city = config.cities[index - 1];
  if (!city) {
    printWarning("Opción no válida.");
    await pause();
    return;
  }

  await setDefaultCityOnDisk(config, city.id);
  printSuccess(`«${cityLabel(city)}» es ahora la ciudad default.`);
  await pause();
}
