"use client";

import { useState } from "react";
import { FlaskConical, Code2, Headset, LayoutTemplate, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgents } from "@/lib/api/hooks";
import type { LucideIcon } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  agentCount: number;
  agents: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "research",
    name: "Research Team",
    description: "Perfect for knowledge gathering and analysis workflows",
    icon: FlaskConical,
    agentCount: 3,
    agents: ["Researcher", "Analyst", "Writer"],
  },
  {
    id: "development",
    name: "Development Team",
    description: "Build, test, and review code collaboratively",
    icon: Code2,
    agentCount: 3,
    agents: ["Coder", "Tester", "Reviewer"],
  },
  {
    id: "support",
    name: "Support Team",
    description: "Handle incoming requests and escalations",
    icon: Headset,
    agentCount: 3,
    agents: ["Triage", "Responder", "Escalator"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start with an empty board and build your own team",
    icon: LayoutTemplate,
    agentCount: 0,
    agents: [],
  },
];

interface StepTemplateProps {
  selectedTemplate: string | null;
  onUpdate: (template: string, agentCount: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepTemplate({
  selectedTemplate,
  onUpdate,
  onNext,
  onBack,
}: StepTemplateProps) {
  const { data: agentsData } = useAgents({ per_page: 1 });
  const [selected, setSelected] = useState<string | null>(selectedTemplate);

  const existingAgentCount = agentsData?.total ?? 0;
  const hasExistingAgents = existingAgentCount > 0;

  const handleSelect = (template: Template) => {
    setSelected(template.id);
    onUpdate(template.id, template.agentCount);
  };

  const handleNext = () => {
    if (selected) {
      onNext();
    }
  };

  return (
    <div className="animate-fade-in-scale rounded-lg border border-border-subtle bg-bg-surface p-space-8">
      <div className="mb-space-6 flex items-center gap-space-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
          <Bot size={20} className="text-accent-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Choose a Template
          </h2>
          <p className="text-sm text-text-secondary">
            Select a team structure to get started quickly
          </p>
        </div>
      </div>

      {/* Existing agents banner */}
      {hasExistingAgents && (
        <div className="mb-space-6 rounded-md border border-status-info/30 bg-status-info/5 p-space-4">
          <div className="flex items-center gap-space-2 text-sm text-status-info">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span className="font-medium">
              {existingAgentCount} agent{existingAgentCount !== 1 ? "s" : ""} already connected!
            </span>
          </div>
          <p className="mt-space-1 text-xs text-text-secondary">
            You can still choose a template to organize them, or start custom.
          </p>
        </div>
      )}

      {/* Template cards */}
      <div className="mb-space-6 grid gap-space-3 sm:grid-cols-2">
        {TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          const Icon = template.icon;

          return (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "flex flex-col rounded-lg border p-space-4 text-left transition-all duration-200",
                isSelected
                  ? "border-accent-primary bg-accent-muted/30 ring-1 ring-accent-primary"
                  : "border-border-default bg-bg-base hover:border-border-strong hover:bg-bg-elevated"
              )}
              aria-pressed={isSelected}
            >
              <div className="mb-space-3 flex items-center gap-space-2">
                <Icon
                  size={20}
                  className={cn(
                    isSelected ? "text-accent-primary" : "text-text-muted"
                  )}
                  aria-hidden="true"
                />
                <span className="font-medium text-text-primary">
                  {template.name}
                </span>
              </div>

              <p className="mb-space-3 text-xs text-text-secondary leading-relaxed">
                {template.description}
              </p>

              {template.agents.length > 0 && (
                <div className="flex flex-wrap gap-space-1">
                  {template.agents.map((agent) => (
                    <span
                      key={agent}
                      className="rounded-full bg-bg-overlay px-space-2 py-0.5 text-xs text-text-muted"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}

              {template.id === "custom" && (
                <span className="text-xs text-text-muted">
                  Build from scratch
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!selected}>
          Next
        </Button>
      </div>
    </div>
  );
}
