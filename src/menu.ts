import { fetchForecast, geocodeCity } from "./api.ts";
import {
  cityLabel,
  renderSummaryLine,
  renderWeather,
  unitSymbol,
} from "./format.ts";
import { saveConfig } from "./storage.ts";
import type { City, Config, Unit } from "./types.ts";
import {
  ask,
  inputClosed,
  pause,
  printSuccess,
  printWarning,
  style,
} from "./ui.ts";

function parseIndex(input: string, length: number): number | null {
  if (!/^\d+$/.test(input)) return null;
  const value = Number(input);
  return value >= 0 && value <= length ? value : null;
}

function listCities(cities: City[]): void {
  cities.forEach((city, index) => {
    console.log(`  ${index + 1}. ${cityLabel(city)}`);
  });
}

async function showWeather(city: City, unit: Unit): Promise<void> {
  console.log(style.dim("\n  Consultando el clima..."));
  const forecast = await fetchForecast(city, unit);
  console.log(`\n${renderWeather(city, forecast, unit)}\n`);
  await pause();
}

async function showDefaultWeather(config: Config): Promise<void> {
  const city = config.cities.find((candidate) => candidate.id === config.defaultCityId);
  if (!city) {
    printWarning("No hay ciudad default. Agrega una (opción 3) y establéclela (opción 5).");
    await pause();
    return;
  }
  await showWeather(city, config.unit);
}

async function showAllWeather(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una.");
    await pause();
    return;
  }

  console.log(style.dim("\n  Consultando el clima de todas las ciudades..."));
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

async function addCity(config: Config): Promise<void> {
  const query = await ask("  Nombre de la ciudad: ");
  if (!query) {
    if (!inputClosed()) {
      printWarning("Escribe un nombre de ciudad.");
      await pause();
    }
    return;
  }

  console.log(style.dim(`\n  Buscando «${query}»...`));
  const city = await geocodeCity(query);
  if (!city) {
    printWarning(`No se encontró la ciudad «${query}».`);
    await pause();
    return;
  }

  if (config.cities.some((candidate) => candidate.id === city.id)) {
    printWarning(`«${cityLabel(city)}» ya está en tu lista.`);
    await pause();
    return;
  }

  config.cities.push(city);
  await saveConfig(config);
  printSuccess(`«${cityLabel(city)}» agregada.`);
  await pause();
}

async function removeCity(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("No hay ciudades para eliminar.");
    await pause();
    return;
  }

  console.log("");
  listCities(config.cities);
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

  config.cities.splice(index - 1, 1);
  const wasDefault = config.defaultCityId === city.id;
  if (wasDefault) config.defaultCityId = null;
  await saveConfig(config);

  printSuccess(`«${cityLabel(city)}» eliminada.`);
  if (wasDefault) printWarning("Ya no hay ciudad default. Usa la opción 5 para establecer una.");
  await pause();
}

async function setDefaultCity(config: Config): Promise<void> {
  if (config.cities.length === 0) {
    printWarning("No hay ciudades guardadas. Usa la opción 3 para agregar una.");
    await pause();
    return;
  }

  console.log("");
  listCities(config.cities);
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

  config.defaultCityId = city.id;
  await saveConfig(config);
  printSuccess(`«${cityLabel(city)}» es ahora la ciudad default.`);
  await pause();
}

async function changeUnits(config: Config): Promise<void> {
  const bar = style.cyan("═".repeat(40));
  console.log(`\n${bar}`);
  console.log(style.bold("  Ajustes de unidades"));
  console.log(bar);
  console.log(`  Unidad actual: ${style.cyan(unitSymbol(config.unit))}`);
  console.log("  1. Celsius (°C)");
  console.log("  2. Fahrenheit (°F)");
  console.log("  0. Volver");
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

export async function handleChoice(choice: string, config: Config): Promise<boolean> {
  switch (choice) {
    case "1":
      await showDefaultWeather(config);
      return true;
    case "2":
      await showAllWeather(config);
      return true;
    case "3":
      await addCity(config);
      return true;
    case "4":
      await removeCity(config);
      return true;
    case "5":
      await setDefaultCity(config);
      return true;
    case "8":
      await changeUnits(config);
      return true;
    case "9":
      return false;
    default:
      printWarning(`Opción no válida: «${choice}». Elige 1, 2, 3, 4, 5, 8 o 9.`);
      await pause();
      return true;
  }
}
