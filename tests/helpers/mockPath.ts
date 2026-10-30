import { fileURLToPath } from "node:url";

export function srcPath(relativePath: string): string {
  return fileURLToPath(new URL(`../../src/${relativePath}`, import.meta.url));
}

export function srcUrl(relativePath: string): string {
  return new URL(`../../src/${relativePath}`, import.meta.url).href;
}

export function projectRoot(): string {
  return fileURLToPath(new URL("../../", import.meta.url));
}
