import { describe, expect, test } from "bun:test";
import { inputClosed, parseIndex } from "../../src/presentation/input.ts";
import { projectRoot, srcUrl } from "../helpers/mockPath.ts";
import { runBun } from "../helpers/runBun.ts";

const inputUrl = srcUrl("presentation/input.ts");

describe("parseIndex", () => {
  test("acepta índices dentro del rango, incluido 0", () => {
    expect(parseIndex("0", 3)).toBe(0);
    expect(parseIndex("1", 3)).toBe(1);
    expect(parseIndex("3", 3)).toBe(3);
    expect(parseIndex("01", 3)).toBe(1);
  });

  test("rechaza valores fuera de rango", () => {
    expect(parseIndex("4", 3)).toBeNull();
    expect(parseIndex("0", 0)).toBe(0);
  });

  test("rechaza valores que no son enteros positivos", () => {
    expect(parseIndex("", 3)).toBeNull();
    expect(parseIndex("  ", 3)).toBeNull();
    expect(parseIndex("-1", 3)).toBeNull();
    expect(parseIndex("1.5", 3)).toBeNull();
    expect(parseIndex("abc", 3)).toBeNull();
    expect(parseIndex(" 1", 3)).toBeNull();
  });
});

describe("inputClosed", () => {
  test("empieza abierto", () => {
    expect(inputClosed()).toBe(false);
  });
});

describe("ask y pause", () => {
  test("lee líneas por stdin, recorta espacios y muestra los prompts", async () => {
    const script = [
      `import { ask } from ${JSON.stringify(inputUrl)};`,
      `const a = await ask("A: ");`,
      `const b = await ask("B: ");`,
      `console.log("\\n" + JSON.stringify({ a, b }));`,
    ].join("\n");

    const result = await runBun(["-e", script], {
      cwd: projectRoot(),
      stdin: "  hola  \nsegunda\n",
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("A: ");
    expect(result.stdout).toContain("B: ");
    expect(JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}")).toEqual({
      a: "hola",
      b: "segunda",
    });
  });

  test("devuelve cadena vacía al llegar a EOF", async () => {
    const script = [
      `import { ask, inputClosed } from ${JSON.stringify(inputUrl)};`,
      `const value = await ask("Q: ");`,
      `console.log("\\n" + JSON.stringify({ value, closed: inputClosed() }));`,
    ].join("\n");

    const result = await runBun(["-e", script], { cwd: projectRoot(), stdin: "" });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}")).toEqual({
      value: "",
      closed: true,
    });
  });

  test("pause muestra el mensaje y continúa con Enter", async () => {
    const script = [
      `import { pause } from ${JSON.stringify(inputUrl)};`,
      `await pause();`,
      `console.log("despues");`,
    ].join("\n");

    const result = await runBun(["-e", script], { cwd: projectRoot(), stdin: "\n" });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Presiona Enter para continuar...");
    expect(result.stdout).toContain("despues");
  });

  test("después de closeReadline, ask devuelve vacío sin volver a leer", async () => {
    const script = [
      `import { ask, closeReadline } from ${JSON.stringify(inputUrl)};`,
      `const a = await ask("A: ");`,
      `closeReadline();`,
      `const b = await ask("B: ");`,
      `console.log("\\n" + JSON.stringify({ a, b }));`,
    ].join("\n");

    const result = await runBun(["-e", script], { cwd: projectRoot(), stdin: "uno\n" });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}")).toEqual({
      a: "uno",
      b: "",
    });
  });
});
