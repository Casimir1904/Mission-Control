"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GatewayFormProps {
  initialData?: {
    name?: string;
    url?: string;
    allow_insecure_tls?: boolean;
  };
  onSubmit: (data: {
    name: string;
    url: string;
    auth_token?: string;
    allow_insecure_tls: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

const inputClass = cn(
  "h-9 w-full rounded-md border border-border-default bg-bg-base px-space-3 text-sm text-text-primary placeholder:text-text-muted",
  "focus:outline-none focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
);

export function GatewayForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = "Create Gateway",
}: GatewayFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [authToken, setAuthToken] = useState("");
  const [allowInsecureTls, setAllowInsecureTls] = useState(
    initialData?.allow_insecure_tls ?? false
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onSubmit({
      name,
      url,
      auth_token: authToken || undefined,
      allow_insecure_tls: allowInsecureTls,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-space-4">
      {/* Name */}
      <div>
        <label
          htmlFor="gw-name"
          className="mb-space-1 block text-xs font-medium text-text-secondary"
        >
          Name
        </label>
        <input
          id="gw-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
          placeholder="Production Gateway"
        />
      </div>

      {/* URL */}
      <div>
        <label
          htmlFor="gw-url"
          className="mb-space-1 block text-xs font-medium text-text-secondary"
        >
          URL
        </label>
        <input
          id="gw-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className={inputClass}
          placeholder="wss://gateway.example.com"
        />
      </div>

      {/* Auth Token */}
      <div>
        <label
          htmlFor="gw-token"
          className="mb-space-1 block text-xs font-medium text-text-secondary"
        >
          Auth Token
          <span className="ml-space-1 text-text-muted">(optional)</span>
        </label>
        <input
          id="gw-token"
          type="password"
          value={authToken}
          onChange={(e) => setAuthToken(e.target.value)}
          className={inputClass}
          placeholder="Enter authentication token"
          autoComplete="off"
        />
      </div>

      {/* Allow Insecure TLS */}
      <label
        htmlFor="gw-insecure"
        className="flex cursor-pointer items-center gap-space-2"
      >
        <input
          id="gw-insecure"
          type="checkbox"
          checked={allowInsecureTls}
          onChange={(e) => setAllowInsecureTls(e.target.checked)}
          className="h-4 w-4 rounded border-border-default bg-bg-base text-accent-primary focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
        />
        <span className="text-sm text-text-secondary">
          Allow insecure TLS
          <span className="ml-space-1 text-xs text-text-muted">
            (skip certificate verification)
          </span>
        </span>
      </label>

      {/* Actions */}
      <div className="flex items-center justify-end gap-space-2 pt-space-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !name.trim() || !url.trim()}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
