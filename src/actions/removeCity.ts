import { ask, pause, parseIndex } from "../presentation/input.ts";
import { printCities, printSuccess, printWarning } from "../presentation/output.ts";
import { removeCityFromDisk } from "../storage/citiesStorage.ts";
import type { Config } from "../types/Config.ts";
import { style } from "../utils/colors.ts";
import { cityLabel } from "../utils/format.ts";

export async function removeCity(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("No hay ciudades para eliminar.");
    await pause();
    return;
  }

  console.log("");
  printCities(config.cities);
  console.log("");
  const input = await ask("  Número de la ciudad a eliminar (0 para cancelar): ");
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

  const confirm = await ask(`  ¿Eliminar «${cityLabel(city)}»? (s/n): `);
  if (!/^s/i.test(confirm)) {
    console.log(style.dim("  Cancelado."));
    await pause();
    return;
  }

  const result = await removeCityFromDisk(config, city.id);

  printSuccess(`«${cityLabel(city)}» eliminada.`);
  if (result.wasDefault) printWarning("Ya no hay ciudad default. Usa la opción 5 para establecer una.");
  await pause();
}
