import { addCity } from "../actions/addCity.ts";
import { changeUnits } from "../actions/changeUnits.ts";
import { getAllWeather } from "../actions/getAllWeather.ts";
import { getDefaultWeather } from "../actions/getWeather.ts";
import { listCities } from "../actions/listCities.ts";
import { removeCity } from "../actions/removeCity.ts";
import { setDefaultCity } from "../actions/setDefaultCity.ts";
import type { Config } from "../types/Config.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import { style } from "../utils/colors.ts";
import { APP_NAME, MENU_WIDTH } from "../utils/constants.ts";
import { unitSymbol } from "../utils/format.ts";
import { pause } from "./input.ts";
import { clearScreen, printWarning } from "./output.ts";

function menuOptions(config: Config): MenuOption[] {
  return [
    { key: "1", label: "Clima de ciudad default" },
    { key: "2", label: `Clima de todas las ciudades (${config.cities.length})` },
    { key: "3", label: "Buscar y agregar ciudad" },
    { key: "4", label: "Eliminar ciudad" },
    { key: "5", label: "Establecer ciudad default" },
    { key: "6", label: "Listar ciudades" },
    { key: "8", label: `Ajustes (${unitSymbol(config.unit)})` },
    { key: "9", label: "Salir" },
  ];
}

function center(text: string, width: number): string {
  if (text.length >= width) return text;
  return " ".repeat(Math.floor((width - text.length) / 2)) + text;
}

export function renderMenu(config: Config): void {
  const bar = style.cyan("═".repeat(MENU_WIDTH));
  clearScreen();
  console.log(bar);
  console.log(style.bold(style.cyan(center(APP_NAME, MENU_WIDTH))));
  console.log(bar);
  for (const option of menuOptions(config)) {
    console.log(`  ${style.cyan(`${option.key}.`)} ${option.label}`);
  }
  console.log(bar);
}

export async function handleChoice(choice: string, config: Config): Promise<boolean> {
  switch (choice) {
    case "1":
      await getDefaultWeather(config);
      return true;
    case "2":
      await getAllWeather(config);
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
    case "6":
      await listCities(config);
      return true;
    case "8":
      await changeUnits(config);
      return true;
    case "9":
      return false;
    default:
      printWarning(`Opción no válida: «${choice}». Elige 1, 2, 3, 4, 5, 6, 8 o 9.`);
      await pause();
      return true;
  }
}
