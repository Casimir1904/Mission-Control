"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";

import { useToast } from "@/hooks/useToast";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ToastMessages {
  /** Message to display on successful mutation */
  successMessage?: string;
  /** Message to display on failed mutation */
  errorMessage?: string;
  /** Description text for success toast */
  successDescription?: string;
  /** Description text for error toast */
  errorDescription?: string;
}

export type UseMutationWithToastOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = UseMutationOptions<TData, TError, TVariables, TContext> & ToastMessages;

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wrapper around useMutation that adds toast notifications for success/error states.
 *
 * This hook extends the standard useMutation from @tanstack/react-query by
 * automatically displaying toast notifications when the mutation succeeds or fails.
 * It preserves all existing mutation functionality including callbacks, retry logic,
 * and query invalidation patterns.
 *
 * @example
 * // Basic usage with default messages
 * const mutation = useMutationWithToast({
 *   mutationFn: createAgent,
 *   successMessage: "Agent created successfully",
 *   errorMessage: "Failed to create agent",
 * });
 *
 * @example
 * // With custom callbacks - toast shows first, then onSuccess/onError called
 * const mutation = useMutationWithToast({
 *   mutationFn: updateSettings,
 *   successMessage: "Settings saved",
 *   errorMessage: "Failed to save settings",
 *   onSuccess: (data) => {
 *     // Called after toast is shown
 *     router.push("/settings");
 *   },
 * });
 *
 * @example
 * // Without toast messages (falls back to standard mutation behavior)
 * const mutation = useMutationWithToast({
 *   mutationFn: deleteItem,
 * });
 */
export function useMutationWithToast<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationWithToastOptions<TData, TError, TVariables, TContext>,
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { success, error: showError } = useToast();

  const {
    successMessage,
    errorMessage,
    successDescription,
    errorDescription,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Show success toast if message is provided
      if (successMessage) {
        success(successMessage, { description: successDescription });
      }
      // Call the original onSuccess callback if provided
      onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      // Show error toast if message is provided
      if (errorMessage) {
        showError(errorMessage, { description: errorDescription });
      }
      // Call the original onError callback if provided
      onError?.(error, variables, context);
    },
  });
}
