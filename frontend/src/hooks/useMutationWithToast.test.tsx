import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { useMutationWithToast } from "./useMutationWithToast";

// Mock useToast hook
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: mockSuccess,
    error: mockError,
  }),
}));

describe("useMutationWithToast", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  it("shows success toast when mutation succeeds and successMessage is provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1", name: "Test" });

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          successMessage: "Item created successfully",
        }),
      { wrapper }
    );

    result.current.mutate({ name: "Test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSuccess).toHaveBeenCalledWith("Item created successfully", {
      description: undefined,
    });
  });

  it("shows success toast with description when provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1" });

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          successMessage: "Item created",
          successDescription: "The item was saved to the database",
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSuccess).toHaveBeenCalledWith("Item created", {
      description: "The item was saved to the database",
    });
  });

  it("shows error toast when mutation fails and errorMessage is provided", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          errorMessage: "Failed to create item",
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockError).toHaveBeenCalledWith("Failed to create item", {
      description: undefined,
    });
  });

  it("shows error toast with description when provided", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          errorMessage: "Operation failed",
          errorDescription: "Please try again later",
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockError).toHaveBeenCalledWith("Operation failed", {
      description: "Please try again later",
    });
  });

  it("calls original onSuccess callback after showing toast", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1" });
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          successMessage: "Success",
          onSuccess,
        }),
      { wrapper }
    );

    result.current.mutate({ name: "Test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    // Verify onSuccess was called with correct data and variables (3rd and 4th args are context and mutation)
    const onSuccessCalls = onSuccess.mock.calls[0];
    expect(onSuccessCalls[0]).toEqual({ id: "1" });
    expect(onSuccessCalls[1]).toEqual({ name: "Test" });
  });

  it("calls original onError callback after showing toast", async () => {
    const error = new Error("Test error");
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          errorMessage: "Error occurred",
          onError,
        }),
      { wrapper }
    );

    result.current.mutate({ input: "data" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    // Verify onError was called with correct error and variables (3rd and 4th args are context and mutation)
    const onErrorCalls = onError.mock.calls[0];
    expect(onErrorCalls[0]).toEqual(error);
    expect(onErrorCalls[1]).toEqual({ input: "data" });
  });

  it("does not show success toast when successMessage is not provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1" });

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it("does not show error toast when errorMessage is not provided", async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error("Test error"));

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockError).not.toHaveBeenCalled();
  });

  it("calls original onSuccess without toast when no message provided", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1" });
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          onSuccess,
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSuccess).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("calls original onError without toast when no message provided", async () => {
    const error = new Error("Test error");
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          onError,
        }),
      { wrapper }
    );

    result.current.mutate({});

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mockError).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("passes through other mutation options correctly", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "1" });
    const onMutate = vi.fn().mockReturnValue({ previousId: "0" });
    const onSettled = vi.fn();

    const { result } = renderHook(
      () =>
        useMutationWithToast({
          mutationFn,
          successMessage: "Success",
          onMutate,
          onSettled,
        }),
      { wrapper }
    );

    result.current.mutate({ name: "Test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onMutate).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
