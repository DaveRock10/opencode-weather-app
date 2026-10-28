import { ask, pause } from "../presentation/input.ts";
import { printSuccess, printWarning } from "../presentation/output.ts";
import { saveConfig } from "../storage/settingsStorage.ts";
import type { Config, Unit } from "../types/Config.ts";
import { style } from "../utils/colors.ts";
import { MENU_WIDTH } from "../utils/constants.ts";
import { unitSymbol } from "../utils/format.ts";

export async function changeUnits(config: Config): Promise<void> {
  const bar = style.cyan("═".repeat(MENU_WIDTH));
  console.log(`\n${bar}`);
  console.log(style.bold("  Ajustes de unidades"));
  console.log(bar);
  console.log(`  Unidad actual: ${style.cyan(unitSymbol(config.unit))}`);
  console.log(`  ${style.cyan("1.")} Celsius (°C)`);
  console.log(`  ${style.cyan("2.")} Fahrenheit (°F)`);
  console.log(`  ${style.cyan("0.")} Volver`);
  console.log(bar);

  const input = await ask("  Selecciona una opción: ");
  if (input === "0") return;

  let unit: Unit | null = null;
  if (input === "1") unit = "celsius";
  if (input === "2") unit = "fahrenheit";

  if (!unit) {
    printWarning("Opción no válida.");
    await pause();
    return;
  }

  if (config.unit === unit) {
    printSuccess(`La unidad ya es ${unitSymbol(config.unit)}.`);
    await pause();
    return;
  }

  config.unit = unit;
  await saveConfig(config);
  printSuccess(`Unidad establecida en ${unit === "celsius" ? "Celsius (°C)" : "Fahrenheit (°F)"}.`);
  await pause();
}
