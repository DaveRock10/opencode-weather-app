import { fetchForecast } from "../api/weather.ts";
import { pause } from "../presentation/input.ts";
import { printInfo, printWarning } from "../presentation/output.ts";
import type { Config } from "../types/Config.ts";
import { renderSummaryLine } from "../utils/format.ts";

export async function getAllWeather(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una.");
    await pause();
    return;
  }

  printInfo("Consultando el clima de todas las ciudades...");
  const results = await Promise.allSettled(
    config.cities.map((city) => fetchForecast(city, config.unit)),
  );

  console.log("");
  results.forEach((result, index) => {
    const city = config.cities[index];
    if (!city) return;
    if (result.status === "fulfilled") {
      console.log(renderSummaryLine(city, result.value, config.unit));
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      printWarning(`${city.name}: ${reason}`);
    }
  });
  console.log("");
  await pause();
}
