import { createInterface, type Interface } from "node:readline";
import { style } from "../utils/colors.ts";

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

export function parseIndex(input: string, length: number): number | null {
  if (!/^\d+$/.test(input)) return null;
  const value = Number(input);
  return value >= 0 && value <= length ? value : null;
}
