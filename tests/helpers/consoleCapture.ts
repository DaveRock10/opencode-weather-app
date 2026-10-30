import { spyOn } from "bun:test";

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;

export interface ConsoleCapture {
  lines: string[];
  restore(): void;
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

export function captureConsole(): ConsoleCapture {
  const lines: string[] = [];
  const spy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.map((arg) => String(arg)).join(" "));
  });

  return {
    lines,
    restore() {
      spy.mockRestore();
    },
  };
}
