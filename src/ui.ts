import { createInterface, type Interface } from "node:readline";
import { unitSymbol } from "./format.ts";
import { style } from "./theme.ts";
import type { Config } from "./types.ts";

const WIDTH = 40;

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

export async function ask(
  prompt: string,
  paintPrompt: (text: string) => string = style.cyan,
): Promise<string> {
  if (closed && pending.length === 0) return "";
  readline();
  process.stdout.write(paintPrompt(prompt));
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
  await ask("\n  Presiona Enter para continuar...", style.dim);
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
  console.log(style.bold(style.cyan(center("WEATHER CLI", WIDTH))));
  console.log(bar);
  console.log(`  ${style.cyan("1.")} Clima de ciudad default`);
  console.log(`  ${style.cyan("2.")} Clima de todas las ciudades (${config.cities.length})`);
  console.log(`  ${style.cyan("3.")} Buscar y agregar ciudad`);
  console.log(`  ${style.cyan("4.")} Eliminar ciudad`);
  console.log(`  ${style.cyan("5.")} Establecer ciudad default`);
  console.log(`  ${style.cyan("8.")} Ajustes (${unitSymbol(config.unit)})`);
  console.log(`  ${style.cyan("9.")} Salir`);
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
