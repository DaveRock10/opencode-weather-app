import { REQUEST_TIMEOUT_MS } from "../utils/constants.ts";

export class ApiError extends Error {
  override name = "ApiError";
}

export async function fetchJson<T>(url: URL): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new ApiError("La solicitud tardó demasiado. Inténtalo de nuevo.");
    }
    throw new ApiError("No se pudo conectar con Open-Meteo. Revisa tu conexión a internet.");
  }

  if (!response.ok) {
    throw new ApiError(`Open-Meteo respondió con un error HTTP ${response.status}.`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("Open-Meteo devolvió una respuesta que no se pudo leer.");
  }
}
