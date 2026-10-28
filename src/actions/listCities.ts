import { pause } from "../presentation/input.ts";
import { printCities, printWarning } from "../presentation/output.ts";
import type { Config } from "../types/Config.ts";

export async function listCities(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una.");
    await pause();
    return;
  }

  console.log("");
  printCities(config.cities);
  console.log("");
  await pause();
}
