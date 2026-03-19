"use client";

import { useState } from "react";
import { Radio, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useGateways, useTestGatewayConnection, useCreateGateway } from "@/lib/api/hooks";
import type { Gateway } from "@/lib/api/types";

interface StepGatewayProps {
  gatewayUrl: string;
  gatewayToken: string;
  gatewayId: string | null;
  gatewayConnected: boolean;
  onUpdate: (data: {
    gatewayUrl: string;
    gatewayToken: string;
    gatewayId: string | null;
    gatewayConnected: boolean;
  }) => void;
  onNext: () => void;
  onBack: () => void;
}

type ConnectionState = "idle" | "testing" | "success" | "error";

export function StepGateway({
  gatewayUrl,
  gatewayToken,
  gatewayId,
  gatewayConnected,
  onUpdate,
  onNext,
  onBack,
}: StepGatewayProps) {
  const { data: gatewaysData } = useGateways();
  const testConnection = useTestGatewayConnection();
  const createGateway = useCreateGateway();

  const [url, setUrl] = useState(gatewayUrl);
  const [token, setToken] = useState(gatewayToken);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    gatewayConnected ? "success" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  // Check if any gateways already connected
  const connectedGateways = gatewaysData?.items?.filter(
    (gw: Gateway) => gw.status === "connected"
  ) ?? [];
  const hasExistingGateway = connectedGateways.length > 0;

  const handleTestConnection = async () => {
    if (!url.trim()) return;

    setConnectionState("testing");
    setErrorMessage("");

    try {
      // If no existing gateway, create one first
      let gwId = gatewayId;
      if (!gwId) {
        const gw = await createGateway.mutateAsync({
          name: "Default Gateway",
          url: url.trim(),
        });
        gwId = gw.id;
      }

      await testConnection.mutateAsync(gwId);
      setConnectionState("success");
      onUpdate({
        gatewayUrl: url.trim(),
        gatewayToken: token,
        gatewayId: gwId,
        gatewayConnected: true,
      });
    } catch (err) {
      setConnectionState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Connection failed"
      );
      onUpdate({
        gatewayUrl: url.trim(),
        gatewayToken: token,
        gatewayId: null,
        gatewayConnected: false,
      });
    }
  };

  const handleSkip = () => {
    onUpdate({
      gatewayUrl: "",
      gatewayToken: "",
      gatewayId: null,
      gatewayConnected: false,
    });
    onNext();
  };

  const handleNext = () => {
    onNext();
  };

  return (
    <div className="animate-fade-in-scale rounded-lg border border-border-subtle bg-bg-surface p-space-8">
      <div className="mb-space-6 flex items-center gap-space-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
          <Radio size={20} className="text-accent-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Connect Gateway
          </h2>
          <p className="text-sm text-text-secondary">
            Connect to an OpenClaw gateway to manage your agents
          </p>
        </div>
      </div>

      {/* Show existing connected gateways */}
      {hasExistingGateway && (
        <div className="mb-space-6 rounded-md border border-status-healthy/30 bg-status-healthy/5 p-space-4">
          <div className="flex items-center gap-space-2 text-sm text-status-healthy">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span className="font-medium">
              {connectedGateways.length} gateway{connectedGateways.length > 1 ? "s" : ""} already connected
            </span>
          </div>
          <ul className="mt-space-2 space-y-space-1">
            {connectedGateways.map((gw: Gateway) => (
              <li key={gw.id} className="flex items-center gap-space-2 text-sm text-text-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-status-healthy" aria-hidden="true" />
                {gw.name} ({gw.agent_count} agents)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New gateway form */}
      {!hasExistingGateway && (
        <div className="mb-space-6 space-y-space-4">
          <div>
            <label
              htmlFor="gw-url"
              className="mb-space-2 block text-sm font-medium text-text-secondary"
            >
              Gateway URL
            </label>
            <Input
              id="gw-url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setConnectionState("idle");
              }}
              placeholder="https://gateway.example.com"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="gw-token"
              className="mb-space-2 block text-sm font-medium text-text-secondary"
            >
              Auth Token (optional)
            </label>
            <Input
              id="gw-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Gateway authentication token"
            />
          </div>

          {/* Test connection button + status */}
          <div className="flex items-center gap-space-3">
            <Button
              onClick={handleTestConnection}
              disabled={!url.trim() || connectionState === "testing"}
              variant="secondary"
            >
              {connectionState === "testing" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span className="ml-space-2">Testing...</span>
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            {connectionState === "success" && (
              <span className="flex items-center gap-space-1 text-sm text-status-healthy">
                <CheckCircle2 size={16} aria-hidden="true" />
                Connected
              </span>
            )}

            {connectionState === "error" && (
              <span className="flex items-center gap-space-1 text-sm text-status-critical">
                <XCircle size={16} aria-hidden="true" />
                {errorMessage || "Connection failed"}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-space-2">
          {!hasExistingGateway && connectionState !== "success" && (
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!hasExistingGateway && connectionState !== "success"}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
