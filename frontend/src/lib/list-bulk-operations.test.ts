import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { createOptimisticListBulkDeleteMutation } from "./list-bulk-operations";

type Item = { id: string; label: string };
type Response = {
  status: number;
  data: {
    items: Item[];
    total: number;
  };
};

describe("createOptimisticListBulkDeleteMutation", () => {
  it("optimistically removes multiple items and restores on error", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous: Response = {
      status: 200,
      data: {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
          { id: "d", label: "D" },
        ],
        total: 4,
      },
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    const context = await callbacks.onMutate({ ids: ["a", "c"] });
    const updated = queryClient.getQueryData<Response>(key);

    expect(updated?.data.items.map((item) => item.id)).toEqual(["b", "d"]);
    expect(updated?.data.total).toBe(2);

    callbacks.onError(new Error("boom"), { ids: ["a", "c"] }, context);
    expect(queryClient.getQueryData<Response>(key)).toEqual(previous);
  });

  it("optimistically removes a single item when only one id is provided", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous: Response = {
      status: 200,
      data: {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        total: 2,
      },
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    const context = await callbacks.onMutate({ ids: ["b"] });
    const updated = queryClient.getQueryData<Response>(key);

    expect(updated?.data.items.map((item) => item.id)).toEqual(["a"]);
    expect(updated?.data.total).toBe(1);

    callbacks.onError(new Error("boom"), { ids: ["b"] }, context);
    expect(queryClient.getQueryData<Response>(key)).toEqual(previous);
  });

  it("handles non-existent ids gracefully", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous: Response = {
      status: 200,
      data: {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        total: 2,
      },
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    await callbacks.onMutate({ ids: ["x", "y"] });
    const updated = queryClient.getQueryData<Response>(key);

    // No items should be removed since ids don't exist
    expect(updated?.data.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(updated?.data.total).toBe(2);
  });

  it("does not modify data when response status is not 200", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous: Response = {
      status: 500,
      data: {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        total: 2,
      },
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    await callbacks.onMutate({ ids: ["a"] });
    const updated = queryClient.getQueryData<Response>(key);

    // Data should remain unchanged due to non-200 status
    expect(updated).toEqual(previous);
  });

  it("handles missing data property in response", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous = {
      status: 200,
      // No data property
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      typeof previous,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    const context = await callbacks.onMutate({ ids: ["a"] });

    // Should return previous in context
    expect(context.previous).toEqual(previous);
  });

  it("runs success callback and invalidates configured query keys", async () => {
    const queryClient = new QueryClient();
    const keyA = ["items"];
    const keyB = ["boards"];
    const onSuccess = vi.fn();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: keyA,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
      onSuccess,
      invalidateQueryKeys: [keyA, keyB],
    });

    callbacks.onSuccess();
    callbacks.onSettled();

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keyA });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: keyB });
  });

  it("invalidates default query key when invalidateQueryKeys is not provided", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    callbacks.onSettled();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
  });

  it("handles empty ids array", async () => {
    const queryClient = new QueryClient();
    const key = ["items"];
    const previous: Response = {
      status: 200,
      data: {
        items: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        total: 2,
      },
    };
    queryClient.setQueryData(key, previous);

    const callbacks = createOptimisticListBulkDeleteMutation<
      Item,
      Response,
      { ids: string[] }
    >({
      queryClient,
      queryKey: key,
      getItemId: (item) => item.id,
      getDeleteIds: ({ ids }) => ids,
    });

    await callbacks.onMutate({ ids: [] });
    const updated = queryClient.getQueryData<Response>(key);

    // No items should be removed
    expect(updated?.data.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(updated?.data.total).toBe(2);
  });
});
