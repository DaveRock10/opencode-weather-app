import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  loadConfig,
  normalizeConfig,
  saveConfig,
  toCity,
} from "../../src/storage/settingsStorage.ts";
import type { Config } from "../../src/types/Config.ts";
import { makeCity, makeConfig, ottawa } from "../helpers/fixtures.ts";
import { makeTempDir } from "../helpers/tempDir.ts";

const cleanups: Array<() => Promise<void>> = [];

async function tempDir(prefix = "weather-cli-settings-"): Promise<string> {
  const dir = await makeTempDir(prefix);
  cleanups.push(dir.cleanup);
  return dir.path;
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe("toCity", () => {
  test("normaliza un registro válido", () => {
    const city = toCity({
      id: 1,
      name: "  Ottawa  ",
      latitude: 45.4,
      longitude: -75.7,
      country: "Canadá",
      admin1: "Ontario",
    });

    expect(city).toEqual({
      id: 1,
      name: "Ottawa",
      latitude: 45.4,
      longitude: -75.7,
      country: "Canadá",
      admin1: "Ontario",
    });
  });

  test("omite campos opcionales que no son texto", () => {
    const city = toCity({
      id: 1,
      name: "Ottawa",
      latitude: 45.4,
      longitude: -75.7,
      country: 5,
      admin1: null,
    });

    expect(city).toEqual({ id: 1, name: "Ottawa", latitude: 45.4, longitude: -75.7 });
    expect(city).not.toHaveProperty("country");
    expect(city).not.toHaveProperty("admin1");
  });

  test("rechaza registros inválidos", () => {
    expect(toCity(null)).toBeNull();
    expect(toCity("Ottawa")).toBeNull();
    expect(toCity({})).toBeNull();
    expect(toCity({ id: "1", name: "Ottawa", latitude: 0, longitude: 0 })).toBeNull();
    expect(toCity({ id: 1, name: "   ", latitude: 0, longitude: 0 })).toBeNull();
    expect(toCity({ id: 1, name: "Ottawa", latitude: "0", longitude: 0 })).toBeNull();
    expect(toCity({ id: 1, name: "Ottawa", latitude: 0, longitude: Number.NaN })).toBeNull();
  });
});

describe("normalizeConfig", () => {
  test("devuelve la configuración por defecto para valores no válidos", () => {
    const expected: Config = { unit: "celsius", defaultCityId: null, cities: [] };
    expect(normalizeConfig(null)).toEqual(expected);
    expect(normalizeConfig("texto")).toEqual(expected);
    expect(normalizeConfig(42)).toEqual(expected);
    expect(normalizeConfig([])).toEqual(expected);
  });

  test("normaliza unidad, ciudades y default", () => {
    const config = normalizeConfig({
      unit: "fahrenheit",
      defaultCityId: ottawa.id,
      cities: [ottawa, { ...ottawa, name: "Duplicada" }, makeCity({ id: 2, name: "Toronto" })],
    });

    expect(config.unit).toBe("fahrenheit");
    expect(config.defaultCityId).toBe(ottawa.id);
    expect(config.cities).toHaveLength(2);
    expect(config.cities[0]?.name).toBe("Ottawa");
    expect(config.cities[1]?.name).toBe("Toronto");
  });

  test("descarta ciudades inválidas", () => {
    const config = normalizeConfig({
      cities: [
        null,
        {},
        { id: "1", name: "X", latitude: 0, longitude: 0 },
        { id: 1, name: "X", latitude: 0, longitude: 0 },
      ],
    });

    expect(config.cities).toHaveLength(1);
    expect(config.cities[0]?.name).toBe("X");
  });

  test("usa celsius para unidades desconocidas", () => {
    expect(normalizeConfig({ unit: "kelvin" }).unit).toBe("celsius");
    expect(normalizeConfig({ unit: 1 }).unit).toBe("celsius");
  });

  test("anula defaultCityId si no existe en la lista", () => {
    expect(normalizeConfig({ defaultCityId: 999, cities: [ottawa] }).defaultCityId).toBeNull();
    expect(normalizeConfig({ defaultCityId: "1", cities: [ottawa] }).defaultCityId).toBeNull();
    expect(normalizeConfig({ defaultCityId: null, cities: [ottawa] }).defaultCityId).toBeNull();
  });
});

describe("loadConfig", () => {
  test("devuelve la configuración por defecto si el archivo no existe", async () => {
    const dir = await tempDir();
    const config = await loadConfig(join(dir, "no-existe.json"));

    expect(config).toEqual({ unit: "celsius", defaultCityId: null, cities: [] });
  });

  test("devuelve la configuración por defecto si el JSON es inválido", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    await writeFile(file, "{ esto no es json", "utf8");

    expect(await loadConfig(file)).toEqual({ unit: "celsius", defaultCityId: null, cities: [] });
  });

  test("lee y normaliza una configuración válida", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    await writeFile(
      file,
      JSON.stringify({
        unit: "fahrenheit",
        defaultCityId: ottawa.id,
        cities: [ottawa, { id: ottawa.id, name: "Duplicada" }],
      }),
      "utf8",
    );

    const config = await loadConfig(file);
    expect(config.unit).toBe("fahrenheit");
    expect(config.defaultCityId).toBe(ottawa.id);
    expect(config.cities).toHaveLength(1);
  });
});

describe("saveConfig", () => {
  test("escribe JSON legible y elimina el archivo temporal", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    const config = makeConfig({ unit: "fahrenheit", defaultCityId: ottawa.id, cities: [ottawa] });

    await saveConfig(config, file);

    const text = await readFile(file, "utf8");
    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text)).toEqual(config);
    expect(text).toContain('\n  "unit": "fahrenheit"');
    expect(existsSync(`${file}.tmp`)).toBe(false);
  });

  test("sobrescribe un archivo existente", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    await writeFile(file, "contenido anterior", "utf8");

    const config = makeConfig({ cities: [ottawa] });
    await saveConfig(config, file);

    expect(JSON.parse(await readFile(file, "utf8"))).toEqual(config);
  });

  test("hace round-trip con loadConfig", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    const config: Config = makeConfig({
      unit: "fahrenheit",
      defaultCityId: ottawa.id,
      cities: [ottawa, makeCity({ id: 2, name: "Toronto" })],
    });

    await saveConfig(config, file);
    expect(await loadConfig(file)).toEqual(config);
  });

  test("envuelve los errores de escritura con un mensaje en español", async () => {
    const dir = await tempDir();
    const file = join(dir, "carpeta-inexistente", "config.json");

    await expect(saveConfig(makeConfig(), file)).rejects.toThrow(
      `No se pudo guardar la configuración en ${file}`,
    );
  });
});
