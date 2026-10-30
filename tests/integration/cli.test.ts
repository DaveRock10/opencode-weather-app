import { describe, expect, test } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Config } from "../../src/types/Config.ts";
import { makeConfig, ottawa, toronto } from "../helpers/fixtures.ts";
import { projectRoot } from "../helpers/mockPath.ts";
import { runBun, type RunBunResult } from "../helpers/runBun.ts";
import { makeTempDir } from "../helpers/tempDir.ts";

const CONFIG_FILE = ".weather-cli.json";
const TIMEOUT_MS = 15_000;

async function withCli(
  config: Config | undefined,
  stdin: string,
  check: (dir: string, result: RunBunResult) => Promise<void> | void,
): Promise<void> {
  const temp = await makeTempDir("weather-cli-cli-");
  try {
    if (config) await writeFile(join(temp.path, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
    const result = await runBun(["run", "src/index.ts"], {
      cwd: projectRoot(),
      stdin,
      env: {
        HOME: temp.path,
        USERPROFILE: temp.path,
        NO_COLOR: "1",
        FORCE_COLOR: undefined,
      },
    });
    await check(temp.path, result);
  } finally {
    await temp.cleanup();
  }
}

async function readConfig(dir: string): Promise<Config> {
  return JSON.parse(await readFile(join(dir, CONFIG_FILE), "utf8")) as Config;
}

describe("CLI de extremo a extremo", () => {
  test(
    "arranca, muestra el menú y sale con la opción 9",
    async () => {
      await withCli(undefined, "9\n", (_dir, result) => {
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe("");
        expect(result.stdout).toContain("WEATHER CLI");
        expect(result.stdout).toContain("1. Clima de ciudad default");
        expect(result.stdout).toContain("9. Salir");
        expect(result.stdout).toContain("¡Hasta luego!");
      });
    },
    TIMEOUT_MS,
  );

  test(
    "una opción inválida avisa y vuelve al menú",
    async () => {
      await withCli(undefined, "x\n\n9\n", (_dir, result) => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Opción no válida: «x».");
        expect(result.stdout.split("WEATHER CLI").length - 1).toBe(2);
        expect(result.stdout).toContain("¡Hasta luego!");
      });
    },
    TIMEOUT_MS,
  );

  test(
    "lista las ciudades guardadas",
    async () => {
      await withCli(makeConfig({ cities: [ottawa, toronto] }), "6\n\n9\n", (_dir, result) => {
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain("Ottawa (Ontario, Canadá)");
        expect(result.stdout).toContain("Toronto (Ontario, Canadá)");
      });
    },
    TIMEOUT_MS,
  );

  test(
    "avisa cuando no hay ciudades guardadas",
    async () => {
      await withCli(makeConfig(), "6\n\n9\n", (_dir, result) => {
        expect(result.stdout).toContain(
          "Todavía no tienes ciudades guardadas. Usa la opción 3 para agregar una.",
        );
      });
    },
    TIMEOUT_MS,
  );

  test(
    "cambia las unidades y lo persiste en el archivo de configuración",
    async () => {
      await withCli(makeConfig({ unit: "celsius" }), "8\n2\n\n9\n", async (dir, result) => {
        expect(result.stdout).toContain("Unidad establecida en Fahrenheit (°F).");
        expect((await readConfig(dir)).unit).toBe("fahrenheit");
      });
    },
    TIMEOUT_MS,
  );

  test(
    "establece la ciudad default y lo persiste",
    async () => {
      await withCli(
        makeConfig({ cities: [ottawa, toronto] }),
        "5\n2\n\n9\n",
        async (dir, result) => {
          expect(result.stdout).toContain("«Toronto (Ontario, Canadá)» es ahora la ciudad default.");
          expect((await readConfig(dir)).defaultCityId).toBe(toronto.id);
        },
      );
    },
    TIMEOUT_MS,
  );

  test(
    "elimina una ciudad, limpia el default y lo persiste",
    async () => {
      await withCli(
        makeConfig({ cities: [ottawa, toronto], defaultCityId: ottawa.id }),
        "4\n1\ns\n\n9\n",
        async (dir, result) => {
          expect(result.stdout).toContain("«Ottawa (Ontario, Canadá)» eliminada.");
          expect(result.stdout).toContain(
            "Ya no hay ciudad default. Usa la opción 5 para establecer una.",
          );
          const config = await readConfig(dir);
          expect(config.cities).toEqual([toronto]);
          expect(config.defaultCityId).toBeNull();
        },
      );
    },
    TIMEOUT_MS,
  );
});
