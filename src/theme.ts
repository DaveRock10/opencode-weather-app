const useColor = resolveColorSupport();

function resolveColorSupport(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;

  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== "0" && force.toLowerCase() !== "false") return true;

  return Bun.enableANSIColors || process.stdout.isTTY === true;
}

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

export function colorEnabled(): boolean {
  return useColor;
}
