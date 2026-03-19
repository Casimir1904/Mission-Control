"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Welcome",
  "Organization",
  "Gateway",
  "Template",
  "Complete",
];

interface WizardShellProps {
  currentStep: number;
  children: ReactNode;
}

export function WizardShell({ currentStep, children }: WizardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      {/* Progress indicator */}
      <header className="flex items-center justify-center py-space-8">
        <nav aria-label="Onboarding progress" className="flex items-center gap-space-3">
          {STEPS.map((step, i) => {
            const isComplete = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={step} className="flex items-center gap-space-3">
                {i > 0 && (
                  <div
                    className={cn(
                      "h-px w-8 transition-colors duration-300",
                      isComplete ? "bg-accent-primary" : "bg-border-subtle"
                    )}
                    aria-hidden="true"
                  />
                )}
                <div className="flex flex-col items-center gap-space-1">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                      isComplete
                        ? "bg-accent-primary text-white"
                        : isCurrent
                        ? "border-2 border-accent-primary bg-accent-muted text-accent-primary"
                        : "border border-border-default bg-bg-surface text-text-muted"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${i + 1}: ${step}${isComplete ? " (completed)" : isCurrent ? " (current)" : ""}`}
                  >
                    {isComplete ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M2.5 7L5.5 10L11.5 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs sm:block",
                      isCurrent ? "text-text-primary font-medium" : "text-text-muted"
                    )}
                  >
                    {step}
                  </span>
                </div>
              </div>
            );
          })}
        </nav>
      </header>

      {/* Step content */}
      <main className="flex flex-1 items-start justify-center px-space-4 pb-space-8">
        <div className="w-full max-w-[640px]">
          <div
            className="overflow-hidden"
            style={{
              // Slide animation handled per-step via CSS class
            }}
          >
            {children}
          </div>
        </div>
      </main>

      {/* Branding footer */}
      <footer className="py-space-4 text-center text-xs text-text-muted">
        Mission Control
      </footer>
    </div>
  );
}
