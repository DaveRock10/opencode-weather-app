import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../src/types/Config.ts";
import { captureConsole, stripAnsi } from "../helpers/consoleCapture.ts";
import { makeConfig, ottawa, toronto } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

function parseIndex(input: string, length: number): number | null {
  if (!/^\d+$/.test(input)) return null;
  const value = Number(input);
  return value >= 0 && value <= length ? value : null;
}

let answers: string[] = [];
let pauseCalls = 0;
let parseIndexImpl: (input: string, length: number) => number | null = parseIndex;
let printedCities: string[][] = [];
let successes: string[] = [];
let warnings: string[] = [];
let removeImpl: (config: Config, id: number) => Promise<{ removed: boolean; wasDefault: boolean }> =
  async () => ({ removed: true, wasDefault: false });
let removedIds: number[] = [];
let removeCity: (config: Config) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("presentation/input.ts"), () => ({
    ask: async () => answers.shift() ?? "",
    pause: async () => {
      pauseCalls += 1;
    },
    parseIndex: (input: string, length: number) => parseIndexImpl(input, length),
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    printCities: (cities: Array<{ name: string }>) => printedCities.push(cities.map((city) => city.name)),
    printSuccess: (message: string) => successes.push(message),
    printWarning: (message: string) => warnings.push(message),
  }));
  mock.module(srcPath("storage/citiesStorage.ts"), () => ({
    removeCityFromDisk: (config: Config, id: number) => {
      removedIds.push(id);
      return removeImpl(config, id);
    },
  }));

  ({ removeCity } = await import("../../src/actions/removeCity.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  answers = [];
  pauseCalls = 0;
  parseIndexImpl = parseIndex;
  printedCities = [];
  successes = [];
  warnings = [];
  removedIds = [];
  removeImpl = async () => ({ removed: true, wasDefault: false });
});

describe("removeCity", () => {
  test("avisa cuando no hay ciudades", async () => {
    await removeCity(makeConfig());

    expect(warnings).toEqual(["No hay ciudades para eliminar."]);
    expect(pauseCalls).toBe(1);
    expect(removedIds).toHaveLength(0);
  });

  test("cancelar con 0 no elimina ni avisa", async () => {
    const config = makeConfig({ cities: [ottawa, toronto] });
    answers = ["0"];

    await removeCity(config);

    expect(printedCities).toEqual([["Ottawa", "Toronto"]]);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(0);
    expect(removedIds).toHaveLength(0);
  });

  test("avisa ante una opción fuera de rango", async () => {
    answers = ["9"];

    await removeCity(makeConfig({ cities: [ottawa, toronto] }));

    expect(warnings).toEqual(["Opción no válida."]);
    expect(pauseCalls).toBe(1);
    expect(removedIds).toHaveLength(0);
  });

  test("avisa si el índice no corresponde a una ciudad existente", async () => {
    answers = ["2"];
    parseIndexImpl = () => 5;

    await removeCity(makeConfig({ cities: [ottawa] }));

    expect(warnings).toEqual(["Opción no válida."]);
    expect(pauseCalls).toBe(1);
    expect(removedIds).toHaveLength(0);
  });

  test("no elimina si la confirmación es negativa", async () => {
    answers = ["1", "n"];
    const capture = captureConsole();

    try {
      await removeCity(makeConfig({ cities: [ottawa, toronto] }));
      expect(stripAnsi(capture.lines.join("\n"))).toContain("Cancelado.");
    } finally {
      capture.restore();
    }

    expect(removedIds).toHaveLength(0);
    expect(successes).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });

  test("elimina la ciudad seleccionada", async () => {
    answers = ["2", "s"];

    await removeCity(makeConfig({ cities: [ottawa, toronto] }));

    expect(removedIds).toEqual([toronto.id]);
    expect(successes).toEqual(["«Toronto (Ontario, Canadá)» eliminada."]);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });

  test("avisa si la ciudad eliminada era la default", async () => {
    answers = ["1", "s"];
    removeImpl = async () => ({ removed: true, wasDefault: true });

    await removeCity(makeConfig({ cities: [ottawa, toronto], defaultCityId: ottawa.id }));

    expect(successes).toEqual(["«Ottawa (Ontario, Canadá)» eliminada."]);
    expect(warnings).toEqual([
      "Ya no hay ciudad default. Usa la opción 5 para establecer una.",
    ]);
  });

  test("propaga el error al guardar", async () => {
    answers = ["1", "s"];
    removeImpl = async () => {
      throw new Error("disco lleno");
    };

    await expect(removeCity(makeConfig({ cities: [ottawa] }))).rejects.toThrow("disco lleno");
  });
});
