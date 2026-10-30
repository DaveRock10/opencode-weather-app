import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { City } from "../../src/types/City.ts";
import { makeConfig, ottawa, toronto } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

let pauseCalls = 0;
let printedCities: City[][] = [];
let warnings: string[] = [];
let listCities: (config: ReturnType<typeof makeConfig>) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("presentation/input.ts"), () => ({
    pause: async () => {
      pauseCalls += 1;
    },
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    printCities: (cities: City[]) => printedCities.push(cities),
    printWarning: (message: string) => warnings.push(message),
  }));

  ({ listCities } = await import("../../src/actions/listCities.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  pauseCalls = 0;
  printedCities = [];
  warnings = [];
});

describe("listCities", () => {
  test("avisa cuando no hay ciudades", async () => {
    await listCities(makeConfig());

    expect(warnings).toEqual(["Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una."]);
    expect(pauseCalls).toBe(1);
    expect(printedCities).toHaveLength(0);
  });

  test("imprime las ciudades y espera", async () => {
    const config = makeConfig({ cities: [ottawa, toronto] });

    await listCities(config);

    expect(printedCities).toEqual([[ottawa, toronto]]);
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });
});
