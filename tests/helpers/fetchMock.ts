import { spyOn } from "bun:test";

export type FetchInput = Parameters<typeof fetch>[0];
export type FetchInit = Parameters<typeof fetch>[1];
export type FetchHandler = (input: FetchInput, init?: FetchInit) => Promise<Response>;

export interface FetchCall {
  url: URL;
  init?: FetchInit;
}

export interface FetchMock {
  calls: FetchCall[];
  restore(): void;
}

function toUrl(input: FetchInput): URL {
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  return new URL(input.url);
}

export function mockFetch(handler: FetchHandler): FetchMock {
  const calls: FetchCall[] = [];
  const spy = spyOn(globalThis, "fetch");
  const implementation = async (input: FetchInput, init?: FetchInit): Promise<Response> => {
    calls.push({ url: toUrl(input), init });
    return handler(input, init);
  };
  spy.mockImplementation(implementation as unknown as typeof fetch);

  return {
    calls,
    restore() {
      spy.mockRestore();
    },
  };
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

export function networkError(name = "TypeError", message = "fetch failed"): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}
