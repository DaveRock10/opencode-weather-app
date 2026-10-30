import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { City } from "../../src/types/City.ts";
import type { Config, Unit } from "../../src/types/Config.ts";
import type { Forecast } from "../../src/types/Weather.ts";
import {
  captureConsole,
  stripAnsi,
  type ConsoleCapture,
} from "../helpers/consoleCapture.ts";
import { makeConfig, makeForecast, ottawa } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

let findImpl: (config: Config) => City | undefined = () => undefined;
let forecastImpl: (city: City, unit: Unit) => Promise<Forecast> = async () => makeForecast();
let forecastCalls: Array<{ city: City; unit: Unit }> = [];
let pauseCalls = 0;
let info: string[] = [];
let warnings: string[] = [];
let capture: ConsoleCapture;
let getDefaultWeather: (config: Config) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("api/weather.ts"), () => ({
    fetchForecast: (city: City, unit: Unit) => {
      forecastCalls.push({ city, unit });
      return forecastImpl(city, unit);
    },
  }));
  mock.module(srcPath("presentation/input.ts"), () => ({
    pause: async () => {
      pauseCalls += 1;
    },
  }));
  mock.module(srcPath("presentation/output.ts"), () => ({
    printInfo: (message: string) => info.push(message),
    printWarning: (message: string) => warnings.push(message),
  }));
  mock.module(srcPath("storage/citiesStorage.ts"), () => ({
    findDefaultCity: (config: Config) => findImpl(config),
  }));

  ({ getDefaultWeather } = await import("../../src/actions/getWeather.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  findImpl = () => undefined;
  forecastImpl = async () => makeForecast();
  forecastCalls = [];
  pauseCalls = 0;
  info = [];
  warnings = [];
  capture = captureConsole();
});

afterEach(() => {
  capture.restore();
});

describe("getDefaultWeather", () => {
  test("avisa cuando no hay ciudad default", async () => {
    await getDefaultWeather(makeConfig());

    expect(warnings).toEqual([
      "No hay ciudad default. Agrega una (opción 3) y establéclela (opción 5).",
    ]);
    expect(pauseCalls).toBe(1);
    expect(forecastCalls).toHaveLength(0);
  });

  test("consulta y muestra el clima de la ciudad default", async () => {
    findImpl = (config) => config.cities.find((city) => city.id === config.defaultCityId);

    await getDefaultWeather(makeConfig({ cities: [ottawa], defaultCityId: ottawa.id }));

    expect(info).toEqual(["Consultando el clima..."]);
    expect(forecastCalls).toEqual([{ city: ottawa, unit: "celsius" }]);
    expect(stripAnsi(capture.lines.join("\n"))).toContain("Ottawa — Ontario, Canadá");
    expect(stripAnsi(capture.lines.join("\n"))).toContain("Pronóstico de 7 días");
    expect(pauseCalls).toBe(1);
  });

  test("pasa la unidad configurada", async () => {
    findImpl = () => ottawa;

    await getDefaultWeather(makeConfig({ unit: "fahrenheit", cities: [ottawa] }));

    expect(forecastCalls).toEqual([{ city: ottawa, unit: "fahrenheit" }]);
  });

  test("propaga el error de la API sin pausar", async () => {
    findImpl = () => ottawa;
    forecastImpl = async () => {
      throw new Error("sin red");
    };

    await expect(getDefaultWeather(makeConfig({ cities: [ottawa] }))).rejects.toThrow("sin red");
    expect(pauseCalls).toBe(0);
    expect(capture.lines).toHaveLength(0);
  });
});
