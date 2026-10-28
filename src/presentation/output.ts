import type { City } from "../types/City.ts";
import { style } from "../utils/colors.ts";
import { cityLabel } from "../utils/format.ts";

export function clearScreen(): void {
  if (process.stdout.isTTY) process.stdout.write("\u001b[2J\u001b[H");
}

export function printInfo(message: string): void {
  console.log(style.dim(`\n  ${message}`));
}

export function printCities(cities: City[]): void {
  cities.forEach((city, index) => {
    console.log(`  ${style.cyan(`${index + 1}.`)} ${cityLabel(city)}`);
  });
}

export function printSuccess(message: string): void {
  console.log(style.green(`\n  ✔ ${message}`));
}

export function printWarning(message: string): void {
  console.log(style.yellow(`\n  ! ${message}`));
}

export function printError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.log(style.red(`\n  ✖ ${message}`));
}
