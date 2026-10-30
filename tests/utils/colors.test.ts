import { describe, expect, test } from "bun:test";
import { colorEnabled, style } from "../../src/utils/colors.ts";
import { projectRoot, srcUrl } from "../helpers/mockPath.ts";
import { runBun } from "../helpers/runBun.ts";

interface ColorProbe {
  enabled: boolean;
  painted: string;
}

async function probeColors(env: Record<string, string | undefined>): Promise<ColorProbe> {
  const colorsUrl = srcUrl("utils/colors.ts");
  const script = [
    `import { colorEnabled, style } from ${JSON.stringify(colorsUrl)};`,
    `console.log(JSON.stringify({ enabled: colorEnabled(), painted: style.cyan("x") }));`,
  ].join("\n");

  const result = await runBun(["-e", script], { cwd: projectRoot(), env });
  expect(result.exitCode).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout.trim()) as ColorProbe;
}

describe("style", () => {
  test("pinta o deja el texto plano según colorEnabled()", () => {
    const enabled = colorEnabled();
    const painters = [style.bold, style.dim, style.cyan, style.green, style.yellow, style.red];

    for (const paint of painters) {
      const painted = paint("x");
      if (enabled) {
        expect(painted).toMatch(/^\u001b\[\d+mx\u001b\[0m$/);
      } else {
        expect(painted).toBe("x");
      }
    }
  });
});

describe("detección de color", () => {
  test("NO_COLOR desactiva los colores", async () => {
    const probe = await probeColors({ NO_COLOR: "1", FORCE_COLOR: undefined });
    expect(probe).toEqual({ enabled: false, painted: "x" });
  });

  test("NO_COLOR tiene prioridad sobre FORCE_COLOR", async () => {
    const probe = await probeColors({ NO_COLOR: "", FORCE_COLOR: "1" });
    expect(probe).toEqual({ enabled: false, painted: "x" });
  });

  test("FORCE_COLOR activa los colores", async () => {
    const probe = await probeColors({ NO_COLOR: undefined, FORCE_COLOR: "1" });
    expect(probe.enabled).toBe(true);
    expect(probe.painted).toBe("\u001b[36mx\u001b[0m");
  });

  test("FORCE_COLOR=0 no fuerza los colores", async () => {
    const probe = await probeColors({ NO_COLOR: undefined, FORCE_COLOR: "0" });
    expect(probe).toEqual({ enabled: false, painted: "x" });
  });
});
