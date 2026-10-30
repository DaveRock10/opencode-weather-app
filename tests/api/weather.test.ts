import { afterEach, describe, expect, mock, test } from "bun:test";
import { ApiError } from "../../src/api/client.ts";
import { fetchForecast } from "../../src/api/weather.ts";
import { jsonResponse, mockFetch } from "../helpers/fetchMock.ts";
import { makeCity, makeForecast } from "../helpers/fixtures.ts";

afterEach(() => {
  mock.restore();
});

function rawForecast(): Record<string, unknown> {
  const forecast = makeForecast();
  return {
    timezone: forecast.timezone,
    current_units: forecast.current_units,
    current: forecast.current,
    daily: forecast.daily,
  };
}

function rawDaily(): Record<string, unknown> {
  return rawForecast().daily as Record<string, unknown>;
}

describe("fetchForecast", () => {
  test("construye la URL y mapea la respuesta", async () => {
    const fetcher = mockFetch(async () => jsonResponse(rawForecast()));

    const forecast = await fetchForecast(makeCity(), "celsius");

    expect(forecast).toEqual(makeForecast());
    const url = fetcher.calls[0]?.url;
    expect(url?.origin).toBe("https://api.open-meteo.com");
    expect(url?.pathname).toBe("/v1/forecast");
    expect(url?.searchParams.get("latitude")).toBe("45.41117");
    expect(url?.searchParams.get("longitude")).toBe("-75.69812");
    expect(url?.searchParams.get("current")).toBe(
      "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
    );
    expect(url?.searchParams.get("daily")).toBe(
      "weather_code,temperature_2m_max,temperature_2m_min",
    );
    expect(url?.searchParams.get("timezone")).toBe("auto");
    expect(url?.searchParams.get("forecast_days")).toBe("7");
    expect(url?.searchParams.has("temperature_unit")).toBe(false);
  });

  test("pide Fahrenheit cuando la unidad es fahrenheit", async () => {
    const fetcher = mockFetch(async () => jsonResponse(rawForecast()));

    await fetchForecast(makeCity(), "fahrenheit");

    expect(fetcher.calls[0]?.url.searchParams.get("temperature_unit")).toBe("fahrenheit");
  });

  test("rellena valores ausentes con los valores por defecto", async () => {
    mockFetch(async () =>
      jsonResponse({
        current: { temperature_2m: 10, weather_code: 0 },
        daily: rawDaily(),
      }),
    );

    const forecast = await fetchForecast(makeCity(), "fahrenheit");

    expect(forecast.timezone).toBe("");
    expect(forecast.current.time).toBe("");
    expect(forecast.current.wind_speed_10m).toBe(0);
    expect(forecast.current.relative_humidity_2m).toBe(0);
    expect(forecast.current_units.temperature_2m).toBe("°F");
    expect(forecast.current_units.wind_speed_10m).toBe("km/h");
  });

  test("usa °C por defecto cuando falta current_units en celsius", async () => {
    mockFetch(async () =>
      jsonResponse({
        current: { temperature_2m: 10, weather_code: 0 },
        daily: rawDaily(),
      }),
    );

    const forecast = await fetchForecast(makeCity(), "celsius");
    expect(forecast.current_units.temperature_2m).toBe("°C");
  });

  test("lanza ApiError si falta el clima actual", async () => {
    mockFetch(async () => jsonResponse({ daily: rawDaily() }));

    await expect(fetchForecast(makeCity(), "celsius")).rejects.toThrow(
      "La respuesta del clima está incompleta. Inténtalo de nuevo.",
    );
  });

  test("lanza ApiError si faltan temperatura o código actual", async () => {
    const incompleteCurrents: unknown[] = [
      { weather_code: 0 },
      { temperature_2m: 10 },
      { temperature_2m: "10", weather_code: 0 },
    ];

    for (const current of incompleteCurrents) {
      mock.restore();
      mockFetch(async () => jsonResponse({ current, daily: rawDaily() }));
      await expect(fetchForecast(makeCity(), "celsius")).rejects.toBeInstanceOf(ApiError);
    }
  });

  test("lanza ApiError si faltan datos diarios", async () => {
    const daily = rawDaily();
    const invalidDailies: unknown[] = [
      undefined,
      {},
      { ...daily, time: [] },
      { ...daily, time: "2026-10-28" },
      { ...daily, weather_code: undefined },
      { ...daily, temperature_2m_max: undefined },
      { ...daily, temperature_2m_min: undefined },
    ];

    for (const value of invalidDailies) {
      mock.restore();
      mockFetch(async () =>
        jsonResponse({
          current: { temperature_2m: 10, weather_code: 0 },
          daily: value,
        }),
      );
      await expect(fetchForecast(makeCity(), "celsius")).rejects.toThrow(
        "No hay datos de pronóstico disponibles para esta ciudad.",
      );
    }
  });
});
