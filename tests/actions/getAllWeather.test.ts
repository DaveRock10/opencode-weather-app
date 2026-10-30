import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { City } from "../../src/types/City.ts";
import type { Config } from "../../src/types/Config.ts";
import type { Forecast } from "../../src/types/Weather.ts";
import {
  captureConsole,
  stripAnsi,
  type ConsoleCapture,
} from "../helpers/consoleCapture.ts";
import { makeConfig, makeForecast, ottawa, toronto } from "../helpers/fixtures.ts";
import { srcPath } from "../helpers/mockPath.ts";

let forecastImpl: (city: City) => Promise<Forecast> = async () => makeForecast();
let forecastCalls: City[] = [];
let pauseCalls = 0;
let info: string[] = [];
let warnings: string[] = [];
let capture: ConsoleCapture;
let getAllWeather: (config: Config) => Promise<void>;

beforeAll(async () => {
  mock.module(srcPath("api/weather.ts"), () => ({
    fetchForecast: (city: City) => {
      forecastCalls.push(city);
      return forecastImpl(city);
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

  ({ getAllWeather } = await import("../../src/actions/getAllWeather.ts"));
});

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
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

describe("getAllWeather", () => {
  test("avisa cuando no hay ciudades", async () => {
    await getAllWeather(makeConfig());

    expect(warnings).toEqual([
      "Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una.",
    ]);
    expect(pauseCalls).toBe(1);
    expect(forecastCalls).toHaveLength(0);
  });

  test("consulta todas las ciudades y muestra un resumen por cada una", async () => {
    await getAllWeather(makeConfig({ cities: [ottawa, toronto] }));

    const output = stripAnsi(capture.lines.join("\n"));
    expect(info).toEqual(["Consultando el clima de todas las ciudades..."]);
    expect(forecastCalls).toEqual([ottawa, toronto]);
    expect(output).toContain("• Ottawa (Ontario, Canadá): 12,4 °C");
    expect(output).toContain("• Toronto (Ontario, Canadá): 12,4 °C");
    expect(warnings).toHaveLength(0);
    expect(pauseCalls).toBe(1);
  });

  test("un fallo no aborta el resto de ciudades", async () => {
    forecastImpl = async (city) => {
      if (city.id === toronto.id) throw new Error("sin red");
      return makeForecast();
    };

    await getAllWeather(makeConfig({ cities: [ottawa, toronto] }));

    const output = stripAnsi(capture.lines.join("\n"));
    expect(output).toContain("• Ottawa (Ontario, Canadá)");
    expect(warnings).toEqual(["Toronto: sin red"]);
    expect(pauseCalls).toBe(1);
  });

  test("convierte razones no-Error a texto", async () => {
    forecastImpl = async () => {
      throw "caído";
    };

    await getAllWeather(makeConfig({ cities: [ottawa] }));

    expect(warnings).toEqual(["Ottawa: caído"]);
  });
});
