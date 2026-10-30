import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { City } from "../../src/types/City.ts";
import type { Config } from "../../src/types/Config.ts";
import { makeConfig, ottawa } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

let askImpl: () => Promise<string> = async () => "";
let inputIsClosed = false;
let pauseCalls = 0;
let geocodeImpl: (query: string) => Promise<City | null> = async () => null;
let hasCityImpl: (config: Config, id: number) => boolean = () => false;
let addCityImpl: (config: Config, city: City) => Promise<boolean> = async () => true;
let info: string[] = [];
let successes: string[] = [];
let warnings: string[] = [];
let addCity: (config: Config) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("api/geocoding.ts"), () => ({
    geocodeCity: (query: string) => geocodeImpl(query),
  }));
  mock.module(srcPath("presentation/input.ts"), () => ({
    ask: () => askImpl(),
    inputClosed: () => inputIsClosed,
    pause: async () => {
      pauseCalls += 1;
    },
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    printInfo: (message: string) => info.push(message),
    printSuccess: (message: string) => successes.push(message),
    printWarning: (message: string) => warnings.push(message),
  }));
  mock.module(srcPath("storage/citiesStorage.ts"), () => ({
    addCityOnDisk: (config: Config, city: City) => addCityImpl(config, city),
    hasCity: (config: Config, id: number) => hasCityImpl(config, id),
  }));

  ({ addCity } = await import("../../src/actions/addCity.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  askImpl = async () => "";
  inputIsClosed = false;
  pauseCalls = 0;
  geocodeImpl = async () => null;
  hasCityImpl = () => false;
  addCityImpl = async () => true;
  info = [];
  successes = [];
  warnings = [];
});

describe("addCity", () => {
  test("avisa si la consulta está vacía y la entrada sigue abierta", async () => {
    await addCity(makeConfig());

    expect(warnings).toEqual(["Escribe un nombre de ciudad."]);
    expect(pauseCalls).toBe(1);
    expect(info).toHaveLength(0);
  });

  test("no avisa si la consulta está vacía porque la entrada se cerró", async () => {
    inputIsClosed = true;

    await addCity(makeConfig());

    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(0);
  });

  test("avisa si no se encuentra la ciudad", async () => {
    askImpl = async () => "Atlantis";

    await addCity(makeConfig());

    expect(info).toEqual(["Buscando «Atlantis»..."]);
    expect(warnings).toEqual(["No se encontró la ciudad «Atlantis»."]);
    expect(pauseCalls).toBe(1);
  });

  test("avisa si la ciudad ya está guardada", async () => {
    askImpl = async () => "Ottawa";
    geocodeImpl = async () => ottawa;
    hasCityImpl = () => true;

    await addCity(makeConfig());

    expect(warnings).toEqual(["«Ottawa (Ontario, Canadá)» ya está en tu lista."]);
    expect(successes).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });

  test("agrega la ciudad y confirma", async () => {
    const config = makeConfig();
    const added: City[] = [];
    askImpl = async () => "Ottawa";
    geocodeImpl = async () => ottawa;
    addCityImpl = async (_config, city) => {
      added.push(city);
      return true;
    };

    await addCity(config);

    expect(added).toEqual([ottawa]);
    expect(successes).toEqual(["«Ottawa (Ontario, Canadá)» agregada."]);
    expect(pauseCalls).toBe(1);
  });

  test("propaga el error de geocodificación", async () => {
    askImpl = async () => "Ottawa";
    geocodeImpl = async () => {
      throw new Error("sin red");
    };

    await expect(addCity(makeConfig())).rejects.toThrow("sin red");
    expect(successes).toHaveLength(0);
  });

  test("propaga el error al guardar", async () => {
    askImpl = async () => "Ottawa";
    geocodeImpl = async () => ottawa;
    addCityImpl = async () => {
      throw new Error("disco lleno");
    };

    await expect(addCity(makeConfig())).rejects.toThrow("disco lleno");
    expect(successes).toHaveLength(0);
  });
});
