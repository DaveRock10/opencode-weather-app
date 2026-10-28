import { geocodeCity } from "../api/geocoding.ts";
import { ask, inputClosed, pause } from "../presentation/input.ts";
import { printInfo, printSuccess, printWarning } from "../presentation/output.ts";
import { addCityOnDisk, hasCity } from "../storage/citiesStorage.ts";
import type { Config } from "../types/Config.ts";
import { cityLabel } from "../utils/format.ts";

export async function addCity(config: Config): Promise<void> {
  const query = await ask("  Nombre de la ciudad: ");
  if (!query) {
    if (!inputClosed()) {
      printWarning("Escribe un nombre de ciudad.");
      await pause();
    }
    return;
  }

  printInfo(`Buscando «${query}»...`);
  const city = await geocodeCity(query);
  if (!city) {
    printWarning(`No se encontró la ciudad «${query}».`);
    await pause();
    return;
  }

  if (hasCity(config, city.id)) {
    printWarning(`«${cityLabel(city)}» ya está en tu lista.`);
    await pause();
    return;
  }

  await addCityOnDisk(config, city);
  printSuccess(`«${cityLabel(city)}» agregada.`);
  await pause();
}
