import { describe, expect, test } from "bun:test";
import {
  addCityOnDisk,
  findDefaultCity,
  hasCity,
  removeCityFromDisk,
  setDefaultCityOnDisk,
  type PersistConfig,
} from "../../src/storage/citiesStorage.ts";
import type { Config } from "../../src/types/Config.ts";
import { makeCity, makeConfig, ottawa, toronto } from "../helpers/fixtures.ts";

interface PersistenceRecorder {
  calls: Config[];
  persist: PersistConfig;
}

function recorder(): PersistenceRecorder {
  const calls: Config[] = [];
  return {
    calls,
    persist: async (config) => {
      calls.push(config);
    },
  };
}

describe("findDefaultCity", () => {
  test("encuentra la ciudad default", () => {
    const config = makeConfig({ cities: [ottawa, toronto], defaultCityId: toronto.id });
    expect(findDefaultCity(config)).toEqual(toronto);
  });

  test("devuelve undefined sin default o con un id inexistente", () => {
    expect(findDefaultCity(makeConfig({ cities: [ottawa] }))).toBeUndefined();
    expect(findDefaultCity(makeConfig({ cities: [ottawa], defaultCityId: 999 }))).toBeUndefined();
  });
});

describe("hasCity", () => {
  test("comprueba por id", () => {
    const config = makeConfig({ cities: [ottawa] });
    expect(hasCity(config, ottawa.id)).toBe(true);
    expect(hasCity(config, toronto.id)).toBe(false);
  });
});

describe("addCityOnDisk", () => {
  test("agrega una ciudad y persiste la configuración", async () => {
    const config = makeConfig();
    const persistence = recorder();

    const added = await addCityOnDisk(config, ottawa, persistence.persist);

    expect(added).toBe(true);
    expect(config.cities).toEqual([ottawa]);
    expect(persistence.calls).toEqual([config]);
  });

  test("no duplica una ciudad existente ni persiste", async () => {
    const config = makeConfig({ cities: [ottawa] });
    const persistence = recorder();

    const added = await addCityOnDisk(config, ottawa, persistence.persist);

    expect(added).toBe(false);
    expect(config.cities).toEqual([ottawa]);
    expect(persistence.calls).toHaveLength(0);
  });

  test("propaga errores de persistencia", async () => {
    const config = makeConfig();
    const failing: PersistConfig = async () => {
      throw new Error("disco lleno");
    };

    await expect(addCityOnDisk(config, ottawa, failing)).rejects.toThrow("disco lleno");
  });
});

describe("removeCityFromDisk", () => {
  test("elimina una ciudad que no es default", async () => {
    const config = makeConfig({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    const persistence = recorder();

    const result = await removeCityFromDisk(config, toronto.id, persistence.persist);

    expect(result).toEqual({ removed: true, wasDefault: false });
    expect(config.cities).toEqual([ottawa]);
    expect(config.defaultCityId).toBe(ottawa.id);
    expect(persistence.calls).toEqual([config]);
  });

  test("limpia la ciudad default al eliminarla", async () => {
    const config = makeConfig({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    const persistence = recorder();

    const result = await removeCityFromDisk(config, ottawa.id, persistence.persist);

    expect(result).toEqual({ removed: true, wasDefault: true });
    expect(config.cities).toEqual([toronto]);
    expect(config.defaultCityId).toBeNull();
    expect(persistence.calls).toHaveLength(1);
  });

  test("no hace nada si la ciudad no existe", async () => {
    const config = makeConfig({ cities: [ottawa] });
    const persistence = recorder();

    const result = await removeCityFromDisk(config, toronto.id, persistence.persist);

    expect(result).toEqual({ removed: false, wasDefault: false });
    expect(config.cities).toEqual([ottawa]);
    expect(persistence.calls).toHaveLength(0);
  });
});

describe("setDefaultCityOnDisk", () => {
  test("establece y persiste una ciudad existente", async () => {
    const config = makeConfig({ cities: [ottawa, toronto] });
    const persistence = recorder();

    const result = await setDefaultCityOnDisk(config, toronto.id, persistence.persist);

    expect(result).toBe(true);
    expect(config.defaultCityId).toBe(toronto.id);
    expect(persistence.calls).toEqual([config]);
  });

  test("no establece una ciudad inexistente ni persiste", async () => {
    const config = makeConfig({ cities: [makeCity({ id: 1, name: "Otra" })] });
    const persistence = recorder();

    const result = await setDefaultCityOnDisk(config, toronto.id, persistence.persist);

    expect(result).toBe(false);
    expect(config.defaultCityId).toBeNull();
    expect(persistence.calls).toHaveLength(0);
  });
});
