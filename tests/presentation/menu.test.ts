import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../src/types/Config.ts";
import { captureConsole, stripAnsi } from "../helpers/consoleCapture.ts";
import { makeConfig } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

const calls: string[] = [];
let warnings: string[] = [];
let pauses = 0;
let renderMenu: (config: Config) => void;
let handleChoice: (choice: string, config: Config) => Promise<boolean>;

beforeAll(async () => {
  mock.module(srcPath("actions/addCity.ts"), () => ({
    addCity: async () => {
      calls.push("addCity");
    },
  }));
  mock.module(srcPath("actions/changeUnits.ts"), () => ({
    changeUnits: async () => {
      calls.push("changeUnits");
    },
  }));
  mock.module(srcPath("actions/getAllWeather.ts"), () => ({
    getAllWeather: async () => {
      calls.push("getAllWeather");
    },
  }));
  mock.module(srcPath("actions/getWeather.ts"), () => ({
    getDefaultWeather: async () => {
      calls.push("getDefaultWeather");
    },
  }));
  mock.module(srcPath("actions/listCities.ts"), () => ({
    listCities: async () => {
      calls.push("listCities");
    },
  }));
  mock.module(srcPath("actions/removeCity.ts"), () => ({
    removeCity: async () => {
      calls.push("removeCity");
    },
  }));
  mock.module(srcPath("actions/setDefaultCity.ts"), () => ({
    setDefaultCity: async () => {
      calls.push("setDefaultCity");
    },
  }));
  mock.module(srcPath("presentation/input.ts"), () => ({
    pause: async () => {
      pauses += 1;
    },
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    clearScreen: () => {},
    printWarning: (message: string) => {
      warnings.push(message);
    },
  }));

  ({ renderMenu, handleChoice } = await import("../../src/presentation/menu.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  calls.length = 0;
  warnings = [];
  pauses = 0;
});

describe("renderMenu", () => {
  test("muestra el título, las opciones, el contador y la unidad", () => {
    const capture = captureConsole();
    try {
      renderMenu(makeConfig({ unit: "fahrenheit" }));
    } finally {
      capture.restore();
    }
    expect(capture.lines).toHaveLength(12);

    const lines = capture.lines.map(stripAnsi);
    expect(lines[0]).toBe("═".repeat(40));
    expect(lines[1]?.trim()).toBe("WEATHER CLI");
    expect(lines[2]).toBe("═".repeat(40));
    expect(lines[3]).toBe("  1. Clima de ciudad default");
    expect(lines[4]).toBe("  2. Clima de todas las ciudades (0)");
    expect(lines[5]).toBe("  3. Buscar y agregar ciudad");
    expect(lines[6]).toBe("  4. Eliminar ciudad");
    expect(lines[7]).toBe("  5. Establecer ciudad default");
    expect(lines[8]).toBe("  6. Listar ciudades");
    expect(lines[9]).toBe("  8. Ajustes (°F)");
    expect(lines[10]).toBe("  9. Salir");
    expect(lines[11]).toBe("═".repeat(40));
  });

  test("muestra el número de ciudades guardadas", () => {
    const capture = captureConsole();
    try {
      renderMenu(
        makeConfig({
          cities: [
            { id: 1, name: "Uno", latitude: 0, longitude: 0 },
            { id: 2, name: "Dos", latitude: 0, longitude: 0 },
          ],
        }),
      );
    } finally {
      capture.restore();
    }

    expect(stripAnsi(capture.lines[4] ?? "")).toBe("  2. Clima de todas las ciudades (2)");
  });
});

describe("handleChoice", () => {
  const dispatches: Array<[string, string]> = [
    ["1", "getDefaultWeather"],
    ["2", "getAllWeather"],
    ["3", "addCity"],
    ["4", "removeCity"],
    ["5", "setDefaultCity"],
    ["6", "listCities"],
    ["8", "changeUnits"],
  ];

  for (const [choice, action] of dispatches) {
    test(`despacha la opción ${choice}`, async () => {
      const result = await handleChoice(choice, makeConfig());

      expect(result).toBe(true);
      expect(calls).toEqual([action]);
      expect(warnings).toHaveLength(0);
    });
  }

  test("la opción 9 termina el bucle", async () => {
    expect(await handleChoice("9", makeConfig())).toBe(false);
    expect(calls).toHaveLength(0);
    expect(pauses).toBe(0);
  });

  test("una opción inválida avisa y continúa", async () => {
    expect(await handleChoice("7", makeConfig())).toBe(true);
    expect(calls).toHaveLength(0);
    expect(warnings).toEqual(["Opción no válida: «7». Elige 1, 2, 3, 4, 5, 6, 8 o 9."]);
    expect(pauses).toBe(1);
  });
});
