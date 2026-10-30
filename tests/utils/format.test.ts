import { describe, expect, test } from "bun:test";
import {
  cityLabel,
  cityRegion,
  describeWeather,
  formatDay,
  formatTemperature,
  formatTime,
  renderSummaryLine,
  renderWeather,
  unitSymbol,
} from "../../src/utils/format.ts";
import { stripAnsi } from "../helpers/consoleCapture.ts";
import { makeCity, makeForecast } from "../helpers/fixtures.ts";

describe("describeWeather", () => {
  test("devuelve la condición conocida", () => {
    expect(describeWeather(0)).toEqual({ text: "Despejado", icon: "☀️" });
    expect(describeWeather(95)).toEqual({ text: "Tormenta", icon: "⛈️" });
  });

  test("devuelve la condición desconocida para códigos no mapeados o ausentes", () => {
    expect(describeWeather(999)).toEqual({ text: "Condición desconocida", icon: "❔" });
    expect(describeWeather(undefined)).toEqual({ text: "Condición desconocida", icon: "❔" });
  });
});

describe("unitSymbol", () => {
  test("devuelve el símbolo correcto", () => {
    expect(unitSymbol("celsius")).toBe("°C");
    expect(unitSymbol("fahrenheit")).toBe("°F");
  });
});

describe("formatTemperature", () => {
  test("formatea con un decimal y coma decimal en español", () => {
    expect(stripAnsi(formatTemperature(20.4, "celsius"))).toBe("20,4 °C");
    expect(stripAnsi(formatTemperature(20, "fahrenheit"))).toBe("20,0 °F");
    expect(stripAnsi(formatTemperature(-3.25, "celsius"))).toBe("-3,3 °C");
  });
});

describe("formatDay", () => {
  test("el primer día siempre es Hoy", () => {
    expect(formatDay("2026-10-28", 0)).toBe("Hoy");
  });

  test("formatea días posteriores en español", () => {
    const formatted = formatDay("2026-10-29", 1);
    expect(formatted).not.toBe("Hoy");
    expect(formatted).toContain("29");
    expect(formatted).toContain("oct");
    expect(formatted.endsWith(".")).toBe(false);
  });

  test("devuelve la fecha original si no se puede interpretar", () => {
    expect(formatDay("no-es-fecha", 2)).toBe("no-es-fecha");
  });
});

describe("formatTime", () => {
  test("extrae la hora de un ISO", () => {
    expect(formatTime("2026-10-28T14:05")).toBe("14:05");
    expect(formatTime("2026-10-28T14:05:30")).toBe("14:05");
  });

  test("devuelve un guion cuando no hay hora", () => {
    expect(formatTime("2026-10-28")).toBe("—");
    expect(formatTime("")).toBe("—");
  });
});

describe("cityRegion y cityLabel", () => {
  test("une provincia y país", () => {
    expect(cityRegion(makeCity())).toBe("Ontario, Canadá");
    expect(cityLabel(makeCity())).toBe("Ottawa (Ontario, Canadá)");
  });

  test("omite partes ausentes o vacías", () => {
    expect(cityRegion(makeCity({ admin1: undefined }))).toBe("Canadá");
    expect(cityRegion(makeCity({ country: undefined }))).toBe("Ontario");
    expect(cityRegion(makeCity({ country: "", admin1: "" }))).toBe("");
    expect(cityLabel(makeCity({ country: undefined, admin1: undefined }))).toBe("Ottawa");
  });
});

describe("renderWeather", () => {
  test("incluye ciudad, clima actual, viento, humedad, hora y pronóstico", () => {
    const output = stripAnsi(renderWeather(makeCity(), makeForecast(), "celsius"));

    expect(output).toContain("Ottawa — Ontario, Canadá");
    expect(output).toContain("Ahora: 12,4 °C · ⛅ Parcialmente nublado");
    expect(output).toContain("Viento: 15,3 km/h · Humedad: 66%");
    expect(output).toContain("Hora local: 14:05 (America/Toronto)");
    expect(output).toContain("Pronóstico de 7 días");
    expect(output).toContain("Hoy: ⛅ Parcialmente nublado, 6,8 °C / 15,2 °C");
    expect(output.split("\n").filter((line) => line.includes(":")).length).toBeGreaterThanOrEqual(8);
  });

  test("usa guiones cuando faltan temperaturas y muestra condición desconocida", () => {
    const forecast = makeForecast();
    const output = stripAnsi(
      renderWeather(
        makeCity({ country: undefined, admin1: undefined }),
        {
          ...forecast,
          timezone: "",
          current: { ...forecast.current, time: "" },
          daily: {
            ...forecast.daily,
            weather_code: [],
            temperature_2m_min: [],
            temperature_2m_max: [],
          },
        },
        "fahrenheit",
      ),
    );

    expect(output).toContain("  Ottawa");
    expect(output).not.toContain("Ottawa —");
    expect(output).toContain("Hora local: —");
    expect(output).not.toContain("(America/Toronto)");
    expect(output).toContain("Hoy: ❔ Condición desconocida, —");
  });
});

describe("renderSummaryLine", () => {
  test("resume la ciudad y el rango de hoy", () => {
    const output = stripAnsi(renderSummaryLine(makeCity(), makeForecast(), "celsius"));
    expect(output).toContain("• Ottawa (Ontario, Canadá): 12,4 °C");
    expect(output).toContain("⛅ Parcialmente nublado");
    expect(output).toContain("(hoy 6,8 °C / 15,2 °C)");
  });
});
