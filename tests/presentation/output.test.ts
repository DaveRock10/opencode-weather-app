import { describe, expect, spyOn, test } from "bun:test";
import {
  clearScreen,
  printCities,
  printError,
  printInfo,
  printSuccess,
  printWarning,
} from "../../src/presentation/output.ts";
import { captureConsole, stripAnsi } from "../helpers/consoleCapture.ts";
import { ottawa, toronto } from "../helpers/fixtures.ts";

function messageOf(run: () => void): string {
  const capture = captureConsole();
  try {
    run();
    return stripAnsi(capture.lines[0] ?? "");
  } finally {
    capture.restore();
  }
}

describe("mensajes", () => {
  test("printInfo", () => {
    expect(messageOf(() => printInfo("hola"))).toBe("\n  hola");
  });

  test("printSuccess", () => {
    expect(messageOf(() => printSuccess("guardado"))).toBe("\n  ✔ guardado");
  });

  test("printWarning", () => {
    expect(messageOf(() => printWarning("cuidado"))).toBe("\n  ! cuidado");
  });

  test("printError con Error y con valores arbitrarios", () => {
    expect(messageOf(() => printError(new Error("falló")))).toBe("\n  ✖ falló");
    expect(messageOf(() => printError("texto"))).toBe("\n  ✖ texto");
    expect(messageOf(() => printError(404))).toBe("\n  ✖ 404");
  });
});

describe("printCities", () => {
  test("numera las ciudades con su etiqueta", () => {
    const capture = captureConsole();
    try {
      printCities([ottawa, toronto]);
      expect(capture.lines.map(stripAnsi)).toEqual([
        "  1. Ottawa (Ontario, Canadá)",
        "  2. Toronto (Ontario, Canadá)",
      ]);
    } finally {
      capture.restore();
    }
  });

  test("no imprime nada si la lista está vacía", () => {
    const capture = captureConsole();
    try {
      printCities([]);
      expect(capture.lines).toHaveLength(0);
    } finally {
      capture.restore();
    }
  });
});

describe("clearScreen", () => {
  test("solo escribe la secuencia ANSI cuando la salida es una TTY", () => {
    const write = spyOn(process.stdout, "write").mockImplementation(
      (() => true) as typeof process.stdout.write,
    );
    try {
      clearScreen();
      if (process.stdout.isTTY) {
        expect(write).toHaveBeenCalledWith("\u001b[2J\u001b[H");
      } else {
        expect(write).not.toHaveBeenCalled();
      }
    } finally {
      write.mockRestore();
    }
  });
});
