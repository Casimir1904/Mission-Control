"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="animate-fade-in-scale rounded-lg border border-border-subtle bg-bg-surface p-space-8 text-center">
      <div className="mx-auto mb-space-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted">
        <Rocket size={32} className="text-accent-primary" aria-hidden="true" />
      </div>

      <h1 className="mb-space-3 text-2xl font-bold text-text-primary">
        Welcome to Mission Control
      </h1>

      <p className="mx-auto mb-space-8 max-w-md text-text-secondary leading-relaxed">
        Set up your operations center in under a minute. We&apos;ll walk you
        through creating your organization, connecting a gateway, and getting
        your agents ready.
      </p>

      <Button onClick={onNext} className="min-w-[200px]">
        Get Started
      </Button>
    </div>
  );
}
