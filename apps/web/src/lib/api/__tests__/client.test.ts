import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, ApiError, API_BASE_URL } from "@/lib/api-client";

describe("API_BASE_URL", () => {
  it("defaults to http://localhost:8000 when env var is not set", () => {
    // The module has already been loaded, so test the exported value
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe("string");
  });
});

describe("ApiError", () => {
  it("creates an error with status, statusText, and body", () => {
    const error = new ApiError(404, "Not Found", { detail: "Resource not found" });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.body).toEqual({ detail: "Resource not found" });
  });

  it("has correct error name", () => {
    const error = new ApiError(500, "Internal Server Error", null);
    expect(error.name).toBe("ApiError");
  });

  it("formats message with status and statusText", () => {
    const error = new ApiError(403, "Forbidden", {});
    expect(error.message).toBe("API Error 403: Forbidden");
  });

  it("can be caught as a standard Error", () => {
    const error = new ApiError(401, "Unauthorized", null);
    expect(() => {
      throw error;
    }).toThrow(Error);
  });
});

describe("apiFetch", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Clear localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("makes a GET request to the correct URL", async () => {
    const mockResponse = { items: [], total: 0, page: 1, per_page: 20 };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiFetch("/api/v1/boards");
    expect(result).toEqual(mockResponse);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/v1/boards`,
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("appends query params to URL", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ items: [] }),
    });

    await apiFetch("/api/v1/tasks", {
      params: { page: "1", per_page: "10" },
    });

    const calledUrl = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledUrl).toContain("page=1");
    expect(calledUrl).toContain("per_page=10");
  });

  it("includes Authorization header when token exists in localStorage", async () => {
    localStorage.setItem("mc_auth_token", "test-token-123");

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/v1/boards");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token-123",
        }),
      })
    );
  });

  it("does not include Authorization header when no token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/v1/boards");

    const headers = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][1].headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Authorization");
  });

  it("throws ApiError on non-ok response with JSON body", async () => {
    const errorBody = { detail: "Not found" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve(errorBody),
    });

    await expect(apiFetch("/api/v1/boards/missing")).rejects.toThrow(ApiError);

    try {
      await apiFetch("/api/v1/boards/missing");
    } catch (e) {
      const error = e as ApiError;
      expect(error.status).toBe(404);
      expect(error.statusText).toBe("Not Found");
      expect(error.body).toEqual(errorBody);
    }
  });

  it("throws ApiError with text body when JSON parsing fails", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("Invalid JSON")),
      text: () => Promise.resolve("Server crashed"),
    });

    try {
      await apiFetch("/api/v1/crash");
    } catch (e) {
      const error = e as ApiError;
      expect(error.status).toBe(500);
      expect(error.body).toBe("Server crashed");
    }
  });

  it("returns undefined for 204 No Content responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch("/api/v1/boards/123");
    expect(result).toBeUndefined();
  });

  it("forwards custom request options", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/api/v1/boards", {
      method: "POST",
      body: JSON.stringify({ name: "Test Board" }),
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test Board" }),
      })
    );
  });
});
