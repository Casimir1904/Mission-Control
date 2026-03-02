import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

import { useToast } from "./useToast";

// Mock sonner toast - toast is the default export (callable) with methods attached
vi.mock("sonner", () => {
  const mockToastFn = vi.fn(() => "toast-id-1");
  return {
    toast: Object.assign(mockToastFn, {
      success: vi.fn(() => "toast-id-success"),
      error: vi.fn(() => "toast-id-error"),
      info: vi.fn(() => "toast-id-info"),
      warning: vi.fn(() => "toast-id-warning"),
      loading: vi.fn(() => "toast-id-loading"),
      dismiss: vi.fn(),
      promise: vi.fn((promise: Promise<unknown>) => promise),
    }),
  };
});

import { toast } from "sonner";

describe("useToast", () => {
  it("returns toast methods", () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toast).toBeInstanceOf(Function);
    expect(result.current.success).toBeInstanceOf(Function);
    expect(result.current.error).toBeInstanceOf(Function);
    expect(result.current.info).toBeInstanceOf(Function);
    expect(result.current.warning).toBeInstanceOf(Function);
    expect(result.current.loading).toBeInstanceOf(Function);
    expect(result.current.dismiss).toBeInstanceOf(Function);
    expect(result.current.promise).toBeInstanceOf(Function);
  });

  describe("toast", () => {
    it("shows a default toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.toast("Hello World");

      expect(toast).toHaveBeenCalledWith("Hello World", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-1");
    });

    it("shows a default toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.toast("Hello World", {
        description: "This is a description",
        duration: 5000,
        id: "custom-id",
      });

      expect(toast).toHaveBeenCalledWith("Hello World", {
        description: "This is a description",
        duration: 5000,
        id: "custom-id",
      });
    });
  });

  describe("success", () => {
    it("shows a success toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.success("Operation successful");

      expect(toast.success).toHaveBeenCalledWith("Operation successful", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-success");
    });

    it("shows a success toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.success("Operation successful", {
        description: "Data saved",
        duration: 3000,
        id: "success-id",
      });

      expect(toast.success).toHaveBeenCalledWith("Operation successful", {
        description: "Data saved",
        duration: 3000,
        id: "success-id",
      });
    });
  });

  describe("error", () => {
    it("shows an error toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.error("Something went wrong");

      expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-error");
    });

    it("shows an error toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.error("Something went wrong", {
        description: "Please try again",
        duration: 5000,
        id: "error-id",
      });

      expect(toast.error).toHaveBeenCalledWith("Something went wrong", {
        description: "Please try again",
        duration: 5000,
        id: "error-id",
      });
    });
  });

  describe("info", () => {
    it("shows an info toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.info("Information message");

      expect(toast.info).toHaveBeenCalledWith("Information message", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-info");
    });

    it("shows an info toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.info("Information message", {
        description: "More details",
        duration: 4000,
        id: "info-id",
      });

      expect(toast.info).toHaveBeenCalledWith("Information message", {
        description: "More details",
        duration: 4000,
        id: "info-id",
      });
    });
  });

  describe("warning", () => {
    it("shows a warning toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.warning("Warning message");

      expect(toast.warning).toHaveBeenCalledWith("Warning message", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-warning");
    });

    it("shows a warning toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.warning("Warning message", {
        description: "Be careful",
        duration: 6000,
        id: "warning-id",
      });

      expect(toast.warning).toHaveBeenCalledWith("Warning message", {
        description: "Be careful",
        duration: 6000,
        id: "warning-id",
      });
    });
  });

  describe("loading", () => {
    it("shows a loading toast with message", () => {
      const { result } = renderHook(() => useToast());
      const id = result.current.loading("Loading...");

      expect(toast.loading).toHaveBeenCalledWith("Loading...", {
        description: undefined,
        duration: undefined,
        id: undefined,
      });
      expect(id).toBe("toast-id-loading");
    });

    it("shows a loading toast with options", () => {
      const { result } = renderHook(() => useToast());
      result.current.loading("Loading...", {
        description: "Please wait",
        duration: 10000,
        id: "loading-id",
      });

      expect(toast.loading).toHaveBeenCalledWith("Loading...", {
        description: "Please wait",
        duration: 10000,
        id: "loading-id",
      });
    });
  });

  describe("dismiss", () => {
    it("dismisses a specific toast by id", () => {
      const { result } = renderHook(() => useToast());
      result.current.dismiss("toast-id-1");

      expect(toast.dismiss).toHaveBeenCalledWith("toast-id-1");
    });

    it("dismisses all toasts when no id provided", () => {
      const { result } = renderHook(() => useToast());
      result.current.dismiss();

      expect(toast.dismiss).toHaveBeenCalledWith(undefined);
    });
  });

  describe("promise", () => {
    it("shows a promise toast with loading state", async () => {
      const { result } = renderHook(() => useToast());
      const mockPromise = Promise.resolve("success data");
      const messages = {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
      };

      await result.current.promise(mockPromise, messages);

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
      });
    });

    it("shows a promise toast with custom options", async () => {
      const { result } = renderHook(() => useToast());
      const mockPromise = Promise.resolve("success data");
      const messages = {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
      };

      await result.current.promise(mockPromise, messages, {
        description: "Processing your request",
        duration: 5000,
        id: "promise-id",
      });

      expect(toast.promise).toHaveBeenCalledWith(mockPromise, {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
        description: "Processing your request",
        duration: 5000,
        id: "promise-id",
      });
    });

    it("returns the promise result on success", async () => {
      const { result } = renderHook(() => useToast());
      const mockPromise = Promise.resolve({ data: "test" });
      const messages = {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
      };

      const response = await result.current.promise(mockPromise, messages);

      expect(response).toEqual({ data: "test" });
    });

    it("rejects when promise fails", async () => {
      const { result } = renderHook(() => useToast());
      const error = new Error("Failed");
      const mockPromise = Promise.reject(error);
      const messages = {
        loading: "Loading...",
        success: "Success!",
        error: "Error!",
      };

      await expect(
        result.current.promise(mockPromise, messages)
      ).rejects.toThrow("Failed");
    });
  });
});
