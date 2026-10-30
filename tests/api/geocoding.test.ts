import { afterEach, describe, expect, mock, test } from "bun:test";
import { geocodeCity } from "../../src/api/geocoding.ts";
import { jsonResponse, mockFetch } from "../helpers/fetchMock.ts";
import { ottawa } from "../helpers/fixtures.ts";

afterEach(() => {
  mock.restore();
});

const rawOttawa = {
  id: ottawa.id,
  name: ottawa.name,
  country: ottawa.country,
  admin1: ottawa.admin1,
  latitude: ottawa.latitude,
  longitude: ottawa.longitude,
};

describe("geocodeCity", () => {
  test("construye la URL y mapea el primer resultado", async () => {
    const fetcher = mockFetch(async () => jsonResponse({ results: [rawOttawa] }));

    const city = await geocodeCity("Ottawa");

    expect(city).toEqual(ottawa);
    const url = fetcher.calls[0]?.url;
    expect(url?.origin).toBe("https://geocoding-api.open-meteo.com");
    expect(url?.pathname).toBe("/v1/search");
    expect(url?.searchParams.get("name")).toBe("Ottawa");
    expect(url?.searchParams.get("count")).toBe("1");
    expect(url?.searchParams.get("language")).toBe("es");
    expect(url?.searchParams.get("format")).toBe("json");
  });

  test("recorta la consulta antes de buscar", async () => {
    const fetcher = mockFetch(async () => jsonResponse({ results: [rawOttawa] }));

    await geocodeCity("  Ottawa  ");

    expect(fetcher.calls[0]?.url.searchParams.get("name")).toBe("Ottawa");
  });

  test("devuelve null sin llamar a la API si la consulta está vacía", async () => {
    const fetcher = mockFetch(async () => {
      throw new Error("no debería llamarse");
    });

    expect(await geocodeCity("")).toBeNull();
    expect(await geocodeCity("   ")).toBeNull();
    expect(fetcher.calls).toHaveLength(0);
  });

  test("devuelve null si no hay resultados", async () => {
    mockFetch(async () => jsonResponse({}));
    expect(await geocodeCity("Atlantis")).toBeNull();

    mock.restore();
    mockFetch(async () => jsonResponse({ results: [] }));
    expect(await geocodeCity("Atlantis")).toBeNull();
  });

  test("omite país y provincia si no son texto", async () => {
    mockFetch(async () =>
      jsonResponse({
        results: [
          {
            ...rawOttawa,
            country: 5,
            admin1: null,
          },
        ],
      }),
    );

    expect(await geocodeCity("Ottawa")).toEqual({
      id: ottawa.id,
      name: ottawa.name,
      latitude: ottawa.latitude,
      longitude: ottawa.longitude,
    });
  });

  test("devuelve null si el resultado está incompleto o tiene tipos inválidos", async () => {
    const invalidResults: unknown[] = [
      { ...rawOttawa, id: "1" },
      { ...rawOttawa, name: 5 },
      { ...rawOttawa, latitude: "45" },
      { ...rawOttawa, longitude: null },
      {},
    ];

    for (const result of invalidResults) {
      mock.restore();
      mockFetch(async () => jsonResponse({ results: [result] }));
      expect(await geocodeCity("Ottawa")).toBeNull();
    }
  });

  test("propaga el ApiError de la capa HTTP", async () => {
    mockFetch(async () => new Response("error", { status: 500 }));

    await expect(geocodeCity("Ottawa")).rejects.toThrow(
      "Open-Meteo respondió con un error HTTP 500.",
    );
  });
});
