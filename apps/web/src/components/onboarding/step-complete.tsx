"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Building2,
  Radio,
  Bot,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingData } from "@/stores/onboarding";

interface StepCompleteProps {
  data: OnboardingData;
  onFinish: () => void;
}

export function StepComplete({ data, onFinish }: StepCompleteProps) {
  const [showCheck, setShowCheck] = useState(false);

  // Animate checkmark in
  useEffect(() => {
    const timer = setTimeout(() => setShowCheck(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="animate-fade-in-scale rounded-lg border border-border-subtle bg-bg-surface p-space-8 text-center">
      {/* Animated checkmark */}
      <div className="relative mx-auto mb-space-6 flex h-20 w-20 items-center justify-center">
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-status-healthy/10 transition-all duration-500",
            showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
        <CheckCircle2
          size={48}
          className={cn(
            "relative text-status-healthy transition-all duration-500",
            showCheck ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
          aria-hidden="true"
        />
      </div>

      <h2 className="mb-space-2 text-2xl font-bold text-text-primary">
        Your Mission Control is ready!
      </h2>
      <p className="mb-space-8 text-text-secondary">
        Everything is set up. You&apos;re ready to start managing your agents.
      </p>

      {/* Summary card */}
      <div className="mx-auto mb-space-8 max-w-sm rounded-md border border-border-subtle bg-bg-base p-space-4">
        <div className="space-y-space-3">
          {/* Org */}
          <div className="flex items-center gap-space-3">
            <Building2 size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            <span className="text-sm text-text-secondary">Organization</span>
            <span className="ml-auto text-sm font-medium text-text-primary">
              {data.organizationName || "Default"}
            </span>
          </div>

          {/* Gateway */}
          <div className="flex items-center gap-space-3">
            <Radio size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            <span className="text-sm text-text-secondary">Gateway</span>
            <span
              className={cn(
                "ml-auto text-sm font-medium",
                data.gatewayConnected
                  ? "text-status-healthy"
                  : "text-text-muted"
              )}
            >
              {data.gatewayConnected ? "Connected" : "Not connected"}
            </span>
          </div>

          {/* Template / Agents */}
          <div className="flex items-center gap-space-3">
            <Bot size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
            <span className="text-sm text-text-secondary">Template</span>
            <span className="ml-auto text-sm font-medium text-text-primary capitalize">
              {data.selectedTemplate || "Custom"}
            </span>
          </div>
        </div>
      </div>

      <Button onClick={onFinish} className="min-w-[220px]">
        Go to Dashboard
        <ArrowRight size={16} className="ml-space-2" aria-hidden="true" />
      </Button>
    </div>
  );
}
