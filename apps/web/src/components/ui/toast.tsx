"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-l-status-healthy",
  error: "border-l-status-critical",
  warning: "border-l-status-warning",
  info: "border-l-status-info",
};

const AUTO_DISMISS_MS: Record<ToastVariant, number | null> = {
  success: 3000,
  error: null, // persistent
  warning: 5000,
  info: 3000,
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);

    const dismissTime = AUTO_DISMISS_MS[toast.variant];
    if (dismissTime !== null) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, dismissTime);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-space-4 right-space-4 z-50 flex flex-col gap-space-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "animate-slide-in-bottom rounded-md border border-border-subtle bg-bg-surface p-space-3 shadow-lg",
            "flex items-start gap-space-3 border-l-[3px]",
            "min-w-[320px] max-w-[420px]",
            VARIANT_STYLES[toast.variant]
          )}
          role="alert"
        >
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              {toast.message}
            </p>
            {toast.description && (
              <p className="mt-space-1 text-xs text-text-secondary">
                {toast.description}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-muted transition-colors hover:text-text-secondary"
            aria-label="Dismiss notification"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
