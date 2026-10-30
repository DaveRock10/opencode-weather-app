import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { Config } from "../../src/types/Config.ts";
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
let defaultCalls: number[] = [];
let setDefaultImpl: (config: Config, id: number) => Promise<boolean> = async () => true;
let setDefaultCity: (config: Config) => Promise<void>;

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
    setDefaultCityOnDisk: (config: Config, id: number) => {
      defaultCalls.push(id);
      return setDefaultImpl(config, id);
    },
  }));

  ({ setDefaultCity } = await import("../../src/actions/setDefaultCity.ts"));
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
  defaultCalls = [];
  setDefaultImpl = async () => true;
});

describe("setDefaultCity", () => {
  test("avisa cuando no hay ciudades", async () => {
    await setDefaultCity(makeConfig());

    expect(warnings).toEqual(["No hay ciudades guardadas. Usa la opción 3 para agregar una."]);
    expect(pauseCalls).toBe(1);
    expect(defaultCalls).toHaveLength(0);
  });

  test("cancelar con 0 no cambia nada", async () => {
    answers = ["0"];

    await setDefaultCity(makeConfig({ cities: [ottawa, toronto] }));

    expect(printedCities).toEqual([["Ottawa", "Toronto"]]);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(0);
    expect(defaultCalls).toHaveLength(0);
  });

  test("avisa ante una opción inválida", async () => {
    answers = ["9"];

    await setDefaultCity(makeConfig({ cities: [ottawa, toronto] }));

    expect(warnings).toEqual(["Opción no válida."]);
    expect(pauseCalls).toBe(1);
    expect(defaultCalls).toHaveLength(0);
  });

  test("avisa si el índice no corresponde a una ciudad existente", async () => {
    answers = ["2"];
    parseIndexImpl = () => 5;

    await setDefaultCity(makeConfig({ cities: [ottawa] }));

    expect(warnings).toEqual(["Opción no válida."]);
    expect(pauseCalls).toBe(1);
    expect(defaultCalls).toHaveLength(0);
  });

  test("establece la ciudad seleccionada como default", async () => {
    answers = ["2"];

    await setDefaultCity(makeConfig({ cities: [ottawa, toronto] }));

    expect(defaultCalls).toEqual([toronto.id]);
    expect(successes).toEqual(["«Toronto (Ontario, Canadá)» es ahora la ciudad default."]);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });

  test("propaga el error al guardar", async () => {
    answers = ["1"];
    setDefaultImpl = async () => {
      throw new Error("disco lleno");
    };

    await expect(setDefaultCity(makeConfig({ cities: [ottawa] }))).rejects.toThrow("disco lleno");
  });
});
