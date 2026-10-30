import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../src/types/Config.ts";
import {
  captureConsole,
  stripAnsi,
  type ConsoleCapture,
} from "../helpers/consoleCapture.ts";
import { makeConfig } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

let answer = "";
let pauseCalls = 0;
let successes: string[] = [];
let warnings: string[] = [];
let saved: Config[] = [];
let saveImpl: (config: Config) => Promise<void> = async () => {};
let capture: ConsoleCapture;
let changeUnits: (config: Config) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("presentation/input.ts"), () => ({
    ask: async () => answer,
    pause: async () => {
      pauseCalls += 1;
    },
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    printSuccess: (message: string) => successes.push(message),
    printWarning: (message: string) => warnings.push(message),
  }));
  mock.module(srcPath("storage/settingsStorage.ts"), () => ({
    saveConfig: (config: Config) => {
      saved.push(config);
      return saveImpl(config);
    },
  }));

  ({ changeUnits } = await import("../../src/actions/changeUnits.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  answer = "";
  pauseCalls = 0;
  successes = [];
  warnings = [];
  saved = [];
  saveImpl = async () => {};
  capture = captureConsole();
});

afterEach(() => {
  capture.restore();
});

function output(): string {
  return stripAnsi(capture.lines.join("\n"));
}

describe("changeUnits", () => {
  test("la opción 0 vuelve sin cambios", async () => {
    answer = "0";

    await changeUnits(makeConfig());

    expect(output()).toContain("Unidad actual: °C");
    expect(output()).toContain("1. Celsius (°C)");
    expect(output()).toContain("2. Fahrenheit (°F)");
    expect(output()).toContain("0. Volver");
    expect(saved).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(0);
  });

  test("avisa ante una opción inválida", async () => {
    answer = "7";

    await changeUnits(makeConfig());

    expect(warnings).toEqual(["Opción no válida."]);
    expect(pauseCalls).toBe(1);
    expect(saved).toHaveLength(0);
  });

  test("avisa si la unidad ya es la seleccionada", async () => {
    answer = "1";

    await changeUnits(makeConfig({ unit: "celsius" }));

    expect(successes).toEqual(["La unidad ya es °C."]);
    expect(pauseCalls).toBe(1);
    expect(saved).toHaveLength(0);
  });

  test("cambia de Celsius a Fahrenheit y guarda", async () => {
    answer = "2";
    const config = makeConfig({ unit: "celsius" });

    await changeUnits(config);

    expect(config.unit).toBe("fahrenheit");
    expect(saved).toEqual([config]);
    expect(successes).toEqual(["Unidad establecida en Fahrenheit (°F)."]);
    expect(pauseCalls).toBe(1);
  });

  test("cambia de Fahrenheit a Celsius y guarda", async () => {
    answer = "1";
    const config = makeConfig({ unit: "fahrenheit" });

    await changeUnits(config);

    expect(config.unit).toBe("celsius");
    expect(saved).toEqual([config]);
    expect(successes).toEqual(["Unidad establecida en Celsius (°C)."]);
  });

  test("propaga el error al guardar", async () => {
    answer = "2";
    saveImpl = async () => {
      throw new Error("disco lleno");
    };

    await expect(changeUnits(makeConfig())).rejects.toThrow("disco lleno");
    expect(successes).toHaveLength(0);
  });
});
