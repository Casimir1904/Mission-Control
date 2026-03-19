"use client";

import { useState } from "react";
import { FileText, Link2, Type, ChevronDown, ChevronRight, Trash2, ExternalLink, Download, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeViewer, detectLanguage } from "./code-viewer";
import { MarkdownRenderer } from "./markdown-renderer";
import { AddDeliverableDialog } from "./add-deliverable-dialog";
import { useTaskDeliverables, useDeleteDeliverable } from "@/lib/api/hooks";
import type { Deliverable } from "@/lib/api/types";

interface DeliverableListProps {
  taskId: string;
  className?: string;
}

const LINE_COLLAPSE_THRESHOLD = 10;

export function DeliverableList({ taskId, className }: DeliverableListProps) {
  const { data: deliverables, isLoading } = useTaskDeliverables(taskId);
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-space-2">
            <Paperclip size={14} aria-hidden="true" />
            Deliverables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-space-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const items = deliverables ?? [];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-space-2">
            <Paperclip size={14} aria-hidden="true" />
            Deliverables
            {items.length > 0 && (
              <span className="rounded bg-bg-elevated px-space-1 py-0.5 font-mono text-[10px] text-text-muted tabular-nums">
                {items.length}
              </span>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="text-xs"
          >
            + Add Deliverable
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="py-space-6 text-center">
            <Paperclip size={24} className="mx-auto mb-space-2 text-text-muted" aria-hidden="true" />
            <p className="text-sm text-text-muted">
              No deliverables yet. Agent work products will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-space-3">
            {items.map((d) => (
              <DeliverableItem key={d.id} deliverable={d} />
            ))}
          </div>
        )}
      </CardContent>

      <AddDeliverableDialog
        taskId={taskId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
    </Card>
  );
}

function DeliverableItem({ deliverable }: { deliverable: Deliverable }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteDeliverable();

  const d = deliverable;
  const lineCount = d.content.split("\n").length;
  const isLongContent = lineCount > LINE_COLLAPSE_THRESHOLD;
  const shouldCollapse = isLongContent && !expanded;

  const isMarkdown =
    d.mime_type === "text/markdown" ||
    d.name.endsWith(".md") ||
    d.name.endsWith(".mdx");

  const isCode =
    d.type === "file" &&
    !isMarkdown &&
    (d.mime_type?.startsWith("text/") ||
      d.mime_type?.includes("javascript") ||
      d.mime_type?.includes("typescript") ||
      d.mime_type?.includes("json") ||
      d.mime_type?.includes("xml") ||
      d.mime_type?.includes("yaml") ||
      /\.(ts|tsx|js|jsx|py|rb|rs|go|java|css|html|json|yaml|yml|toml|sh|sql|graphql|tf)$/i.test(d.name));

  const typeIcon = d.type === "link" ? Link2 : d.type === "text" ? Type : FileText;
  const TypeIcon = typeIcon;

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteMutation.mutate(d.id);
  };

  return (
    <div className="rounded-md border border-border-subtle bg-bg-elevated overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-space-2 px-space-3 py-space-2 border-b border-border-subtle/50">
        <TypeIcon size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
        <span className="flex-1 truncate text-sm font-medium text-text-primary">
          {d.name}
        </span>
        {d.mime_type && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            {d.mime_type}
          </Badge>
        )}
        {d.size_bytes != null && (
          <span className="text-[10px] text-text-muted font-mono tabular-nums">
            {formatBytes(d.size_bytes)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {d.type === "link" ? (
          <div className="px-space-3 py-space-2">
            <a
              href={d.content}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-space-1 text-sm text-accent-primary hover:text-accent-hover underline"
            >
              <ExternalLink size={12} aria-hidden="true" />
              {d.content}
            </a>
          </div>
        ) : isMarkdown ? (
          <div className={cn("px-space-3 py-space-2", shouldCollapse && "max-h-[200px] overflow-hidden")}>
            <MarkdownRenderer content={d.content} />
            {shouldCollapse && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-elevated to-transparent" />
            )}
          </div>
        ) : isCode ? (
          <div className={cn(shouldCollapse && "max-h-[200px] overflow-hidden")}>
            <CodeViewer
              code={d.content}
              language={detectLanguage(d.name, d.mime_type)}
              fileName={d.name}
              className="border-0 rounded-none"
            />
            {shouldCollapse && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-elevated to-transparent" />
            )}
          </div>
        ) : (
          <div className={cn("px-space-3 py-space-2", shouldCollapse && "max-h-[200px] overflow-hidden")}>
            <pre className="whitespace-pre-wrap text-xs font-mono text-text-secondary leading-5">
              {d.content}
            </pre>
            {shouldCollapse && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg-elevated to-transparent" />
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between border-t border-border-subtle/50 px-space-3 py-space-1">
        <div className="flex items-center gap-space-1">
          {isLongContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-0.5 rounded px-space-1 py-0.5 text-[11px] text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-surface"
            >
              {expanded ? (
                <>
                  <ChevronDown size={12} aria-hidden="true" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronRight size={12} aria-hidden="true" />
                  Expand ({lineCount} lines)
                </>
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-space-1">
          {d.type === "link" ? (
            <a
              href={d.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 rounded px-space-1 py-0.5 text-[11px] text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-surface"
            >
              <ExternalLink size={10} aria-hidden="true" />
              Open
            </a>
          ) : (
            <button
              onClick={() => {
                const blob = new Blob([d.content], { type: d.mime_type || "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = d.name;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-0.5 rounded px-space-1 py-0.5 text-[11px] text-text-muted transition-colors hover:text-text-secondary hover:bg-bg-surface"
            >
              <Download size={10} aria-hidden="true" />
              Download
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={cn(
              "flex items-center gap-0.5 rounded px-space-1 py-0.5 text-[11px] transition-colors",
              confirmDelete
                ? "text-status-critical bg-status-critical/10"
                : "text-text-muted hover:text-status-critical hover:bg-bg-surface"
            )}
          >
            <Trash2 size={10} aria-hidden="true" />
            {confirmDelete ? "Confirm?" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
