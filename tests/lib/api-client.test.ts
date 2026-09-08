import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiRequestError } from "@/lib/api-client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("apiRequest retry behavior", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  it("returns immediately on success without retrying", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiRequest("/api/v1/thing");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a dropped connection and succeeds once it recovers", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiRequest("/api/v1/thing");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("retries a transient 503 and succeeds once the server recovers", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { error: "REQUEST_FAILED" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await apiRequest("/api/v1/thing");
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("gives up after exhausting retries on persistent failures", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue(jsonResponse(503, { error: "REQUEST_FAILED" }));

    await expect(apiRequest("/api/v1/thing")).rejects.toBeInstanceOf(ApiRequestError);
    // Default max retries is 3: the original attempt plus 3 retries = 4 calls.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  }, 10_000);

  it("never retries a deterministic 4xx response", async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "VALIDATION_ERROR", details: { fieldErrors: { name: ["Required"] } } }),
    );

    await expect(apiRequest("/api/v1/thing")).rejects.toBeInstanceOf(ApiRequestError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
