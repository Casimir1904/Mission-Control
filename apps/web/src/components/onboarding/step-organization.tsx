"use client";

import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentOrganization } from "@/lib/api/hooks";

interface StepOrganizationProps {
  organizationName: string;
  onUpdate: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepOrganization({
  organizationName,
  onUpdate,
  onNext,
  onBack,
}: StepOrganizationProps) {
  const { data: currentOrg } = useCurrentOrganization();
  const [name, setName] = useState(organizationName);

  // Auto-fill from existing org
  useEffect(() => {
    if (currentOrg?.name && !name) {
      setName(currentOrg.name);
      onUpdate(currentOrg.name);
    }
  }, [currentOrg, name, onUpdate]);

  const handleNext = () => {
    onUpdate(name.trim());
    onNext();
  };

  const orgExists = !!currentOrg?.name;

  return (
    <div className="animate-fade-in-scale rounded-lg border border-border-subtle bg-bg-surface p-space-8">
      <div className="mb-space-6 flex items-center gap-space-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
          <Building2 size={20} className="text-accent-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Organization</h2>
          <p className="text-sm text-text-secondary">
            {orgExists
              ? "Your organization is already set up"
              : "Name your organization to get started"}
          </p>
        </div>
      </div>

      <div className="mb-space-6">
        <label
          htmlFor="org-name"
          className="mb-space-2 block text-sm font-medium text-text-secondary"
        >
          Organization name
        </label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Acme Corp"
          autoFocus
        />
        {orgExists && (
          <p className="mt-space-2 text-xs text-status-healthy">
            Organization &ldquo;{currentOrg.name}&rdquo; already exists
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!name.trim()}>
          Next
        </Button>
      </div>
    </div>
  );
}
