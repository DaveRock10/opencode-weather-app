import { afterEach, describe, expect, mock, test } from "bun:test";
import { ApiError, fetchJson } from "../../src/api/client.ts";
import { jsonResponse, mockFetch, networkError } from "../helpers/fetchMock.ts";

afterEach(() => {
  mock.restore();
});

describe("fetchJson", () => {
  test("devuelve el JSON de una respuesta correcta", async () => {
    const fetcher = mockFetch(async () => jsonResponse({ temperature: 12.4 }));

    const data = await fetchJson<{ temperature: number }>(new URL("https://example.test/data"));

    expect(data).toEqual({ temperature: 12.4 });
    expect(fetcher.calls[0]?.url.href).toBe("https://example.test/data");
  });

  test("pasa un AbortSignal a fetch", async () => {
    const fetcher = mockFetch(async () => jsonResponse({ ok: true }));

    await fetchJson(new URL("https://example.test/data"));

    expect(fetcher.calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
    expect(fetcher.calls[0]?.init?.signal?.aborted).toBe(false);
  });

  test("lanza ApiError cuando la respuesta HTTP no es correcta", async () => {
    mockFetch(async () => new Response("error", { status: 503 }));

    await expect(fetchJson(new URL("https://example.test/data"))).rejects.toThrow(
      "Open-Meteo respondió con un error HTTP 503.",
    );
  });

  test("lanza ApiError cuando el cuerpo no es JSON", async () => {
    mockFetch(async () => new Response("no es json", { status: 200 }));

    await expect(fetchJson(new URL("https://example.test/data"))).rejects.toThrow(
      "Open-Meteo devolvió una respuesta que no se pudo leer.",
    );
  });

  test("lanza ApiError cuando la petición tarda demasiado", async () => {
    mockFetch(async () => {
      throw networkError("TimeoutError", "timeout");
    });

    await expect(fetchJson(new URL("https://example.test/data"))).rejects.toThrow(
      "La solicitud tardó demasiado. Inténtalo de nuevo.",
    );
  });

  test("lanza ApiError cuando la petición se aborta", async () => {
    mockFetch(async () => {
      throw networkError("AbortError", "aborted");
    });

    await expect(fetchJson(new URL("https://example.test/data"))).rejects.toThrow(
      "La solicitud tardó demasiado. Inténtalo de nuevo.",
    );
  });

  test("lanza ApiError ante un fallo de conexión genérico", async () => {
    mockFetch(async () => {
      throw new TypeError("fetch failed");
    });

    const promise = fetchJson(new URL("https://example.test/data"));
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toThrow(
      "No se pudo conectar con Open-Meteo. Revisa tu conexión a internet.",
    );
  });

  test("ApiError conserva el nombre y el mensaje", () => {
    const error = new ApiError("fallo");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("fallo");
  });
});
