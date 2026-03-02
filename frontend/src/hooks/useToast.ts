"use client";

import { useCallback } from "react";
import { toast } from "sonner";

export interface ToastOptions {
  description?: string;
  duration?: number;
  id?: string | number;
}

export interface UseToastReturn {
  /** Show a default toast message */
  toast: (message: string, options?: ToastOptions) => string | number;
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => string | number;
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => string | number;
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => string | number;
  /** Show a warning toast */
  warning: (message: string, options?: ToastOptions) => string | number;
  /** Show a loading toast */
  loading: (message: string, options?: ToastOptions) => string | number;
  /** Dismiss a specific toast by id, or all toasts if no id provided */
  dismiss: (id?: string | number) => void;
  /** Update an existing toast */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => Promise<T>;
}

/**
 * Hook for displaying toast notifications using sonner.
 *
 * Provides imperative methods to show success, error, info, warning,
 * and loading toast messages. Also supports promise-based toasts
 * that automatically update based on promise resolution.
 *
 * @example
 * const { success, error } = useToast();
 * success("Agent created successfully");
 * error("Failed to create agent");
 */
export function useToast(): UseToastReturn {
  const showToast = useCallback((message: string, options?: ToastOptions) => {
    return toast(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const success = useCallback((message: string, options?: ToastOptions) => {
    return toast.success(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const error = useCallback((message: string, options?: ToastOptions) => {
    return toast.error(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const info = useCallback((message: string, options?: ToastOptions) => {
    return toast.info(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const loading = useCallback((message: string, options?: ToastOptions) => {
    return toast.loading(message, {
      description: options?.description,
      duration: options?.duration,
      id: options?.id,
    });
  }, []);

  const dismiss = useCallback((id?: string | number) => {
    toast.dismiss(id);
  }, []);

  const promise = useCallback(
    <T>(
      promiseInstance: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      },
      options?: ToastOptions
    ): Promise<T> => {
      // Sonner's toast.promise returns a toast ID, not the promise result
      // We call toast.promise for the side effect and return the original promise
      toast.promise(promiseInstance, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
        ...options,
      });
      return promiseInstance;
    },
    []
  );

  return {
    toast: showToast,
    success,
    error,
    info,
    warning,
    loading,
    dismiss,
    promise,
  };
}
