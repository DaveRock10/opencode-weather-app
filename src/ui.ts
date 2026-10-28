import { createInterface, type Interface } from "node:readline";
import { unitSymbol } from "./format.ts";
import type { Config } from "./types.ts";

const WIDTH = 40;
const useColor = !process.env.NO_COLOR && process.stdout.isTTY === true;

function paint(code: string, text: string): string {
  return useColor ? `\u001b[${code}m${text}\u001b[0m` : text;
}

export const style = {
  bold: (text: string) => paint("1", text),
  dim: (text: string) => paint("2", text),
  cyan: (text: string) => paint("36", text),
  green: (text: string) => paint("32", text),
  yellow: (text: string) => paint("33", text),
  red: (text: string) => paint("31", text),
};

let rl: Interface | undefined;
let closed = false;
const pending: string[] = [];
let waiter: ((line: string) => void) | undefined;

function readline(): Interface {
  if (!rl) {
    rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.on("line", (line) => {
      if (waiter) {
        const resolve = waiter;
        waiter = undefined;
        resolve(line);
      } else {
        pending.push(line);
      }
    });
    rl.on("close", () => {
      closed = true;
      const resolve = waiter;
      waiter = undefined;
      resolve?.("");
    });
    rl.on("SIGINT", () => {
      closeReadline();
      process.exit(0);
    });
  }
  return rl;
}

function nextLine(): Promise<string> {
  const buffered = pending.shift();
  if (buffered !== undefined) return Promise.resolve(buffered);
  if (closed) return Promise.resolve("");
  return new Promise((resolve) => {
    waiter = resolve;
  });
}

export function inputClosed(): boolean {
  return closed && pending.length === 0;
}

export async function ask(prompt: string): Promise<string> {
  if (closed && pending.length === 0) return "";
  readline();
  process.stdout.write(prompt);
  return (await nextLine()).trim();
}

export function closeReadline(): void {
  if (rl) {
    closed = true;
    rl.close();
    rl = undefined;
  }
}

export async function pause(): Promise<void> {
  if (inputClosed()) return;
  await ask(style.dim("\n  Presiona Enter para continuar..."));
}

export function clearScreen(): void {
  if (process.stdout.isTTY) process.stdout.write("\u001b[2J\u001b[H");
}

function center(text: string, width: number): string {
  if (text.length >= width) return text;
  return " ".repeat(Math.floor((width - text.length) / 2)) + text;
}

export function renderMenu(config: Config): void {
  const bar = style.cyan("═".repeat(WIDTH));
  clearScreen();
  console.log(bar);
  console.log(style.bold(center("WEATHER CLI", WIDTH)));
  console.log(bar);
  console.log("  1. Clima de ciudad default");
  console.log(`  2. Clima de todas las ciudades (${config.cities.length})`);
  console.log("  3. Buscar y agregar ciudad");
  console.log("  4. Eliminar ciudad");
  console.log("  5. Establecer ciudad default");
  console.log(`  8. Ajustes (${unitSymbol(config.unit)})`);
  console.log("  9. Salir");
  console.log(bar);
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
