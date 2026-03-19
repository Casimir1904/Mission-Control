"use client";

import { useState } from "react";
import { FileText, Link2, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateDeliverable } from "@/lib/api/hooks";
import type { CreateDeliverableInput } from "@/lib/api/types";

interface AddDeliverableDialogProps {
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DeliverableType = "file" | "link" | "text";

const TYPE_OPTIONS: Array<{
  value: DeliverableType;
  label: string;
  icon: typeof FileText;
  description: string;
}> = [
  { value: "text", icon: Type, label: "Text", description: "Plain text or markdown content" },
  { value: "file", icon: FileText, label: "File", description: "Code or file content" },
  { value: "link", icon: Link2, label: "Link", description: "URL to an external resource" },
];

export function AddDeliverableDialog({
  taskId,
  open,
  onOpenChange,
}: AddDeliverableDialogProps) {
  const [type, setType] = useState<DeliverableType>("text");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [mimeType, setMimeType] = useState("");
  const createDeliverable = useCreateDeliverable();

  const reset = () => {
    setType("text");
    setName("");
    setContent("");
    setMimeType("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    const data: CreateDeliverableInput = {
      type,
      name: name.trim(),
      content: content.trim(),
    };
    if (mimeType.trim()) {
      data.mime_type = mimeType.trim();
    }

    createDeliverable.mutate(
      { taskId, data },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  const isValid = name.trim().length > 0 && content.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Deliverable</DialogTitle>
          <DialogDescription>
            Attach a work product to this task.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-space-4">
          {/* Type selector */}
          <fieldset>
            <legend className="text-xs font-medium text-text-secondary mb-space-2">
              Type
            </legend>
            <div className="grid grid-cols-3 gap-space-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-md border px-space-2 py-space-2 text-xs transition-colors",
                      selected
                        ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
                        : "border-border-subtle bg-bg-surface text-text-muted hover:border-border-default hover:text-text-secondary"
                    )}
                  >
                    <Icon size={16} aria-hidden="true" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Name */}
          <div>
            <label
              htmlFor="deliverable-name"
              className="text-xs font-medium text-text-secondary block mb-space-1"
            >
              Name
            </label>
            <input
              id="deliverable-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                type === "link"
                  ? "e.g. Demo Link"
                  : type === "file"
                    ? "e.g. report.md"
                    : "e.g. Analysis Summary"
              }
              className={cn(
                "w-full rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-primary",
                "placeholder:text-text-muted/50",
                "focus:outline-none focus:ring-2 focus:ring-border-strong"
              )}
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="deliverable-content"
              className="text-xs font-medium text-text-secondary block mb-space-1"
            >
              {type === "link" ? "URL" : "Content"}
            </label>
            {type === "link" ? (
              <input
                id="deliverable-content"
                type="url"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="https://example.com/resource"
                className={cn(
                  "w-full rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-primary font-mono",
                  "placeholder:text-text-muted/50",
                  "focus:outline-none focus:ring-2 focus:ring-border-strong"
                )}
              />
            ) : (
              <textarea
                id="deliverable-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  type === "file"
                    ? "Paste file content here..."
                    : "Enter text content..."
                }
                rows={8}
                className={cn(
                  "w-full rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-primary",
                  type === "file" && "font-mono text-xs",
                  "placeholder:text-text-muted/50",
                  "focus:outline-none focus:ring-2 focus:ring-border-strong",
                  "resize-y min-h-[120px]"
                )}
              />
            )}
          </div>

          {/* MIME type (optional, for file type) */}
          {type === "file" && (
            <div>
              <label
                htmlFor="deliverable-mime"
                className="text-xs font-medium text-text-secondary block mb-space-1"
              >
                MIME Type{" "}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                id="deliverable-mime"
                type="text"
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
                placeholder="e.g. text/markdown, application/json"
                className={cn(
                  "w-full rounded-md border border-border-default bg-bg-base px-space-3 py-space-2 text-sm text-text-primary font-mono",
                  "placeholder:text-text-muted/50",
                  "focus:outline-none focus:ring-2 focus:ring-border-strong"
                )}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!isValid || createDeliverable.isPending}
            >
              {createDeliverable.isPending ? "Adding..." : "Add Deliverable"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
