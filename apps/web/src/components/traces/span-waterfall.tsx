"use client";

import { cn } from "@/lib/utils";
import type { Span } from "@/lib/api/types";

interface SpanWaterfallProps {
  spans: Span[];
  traceDurationMs: number;
}

const STATUS_COLORS: Record<string, string> = {
  ok: "bg-status-healthy",
  error: "bg-status-critical",
  unset: "bg-status-info",
};

function getSpanDurationMs(span: Span): number {
  const start = new Date(span.start_time).getTime();
  const end = new Date(span.end_time).getTime();
  return Math.max(end - start, 1);
}

function getSpanOffsetMs(span: Span, traceStart: number): number {
  return new Date(span.start_time).getTime() - traceStart;
}

function buildTree(spans: Span[]): Map<string, Span[]> {
  const children = new Map<string, Span[]>();
  for (const span of spans) {
    const parentId = span.parent_span_id || "__root__";
    if (!children.has(parentId)) children.set(parentId, []);
    children.get(parentId)!.push(span);
  }
  return children;
}

function flattenTree(
  tree: Map<string, Span[]>,
  parentId: string,
  depth: number
): Array<{ span: Span; depth: number }> {
  const result: Array<{ span: Span; depth: number }> = [];
  const children = tree.get(parentId) ?? [];
  for (const span of children) {
    result.push({ span, depth });
    result.push(...flattenTree(tree, span.span_id, depth + 1));
  }
  return result;
}

function SpanRow({
  span,
  depth,
  traceStart,
  traceDurationMs,
}: {
  span: Span;
  depth: number;
  traceStart: number;
  traceDurationMs: number;
}) {
  const offsetMs = getSpanOffsetMs(span, traceStart);
  const durationMs = getSpanDurationMs(span);
  const leftPct = traceDurationMs > 0 ? (offsetMs / traceDurationMs) * 100 : 0;
  const widthPct = traceDurationMs > 0 ? (durationMs / traceDurationMs) * 100 : 0;
  const statusColor = STATUS_COLORS[span.status] ?? STATUS_COLORS.unset;

  return (
    <div className="flex items-center gap-space-2 border-b border-border-subtle py-space-1 hover:bg-bg-elevated">
      {/* Name column */}
      <div
        className="w-48 shrink-0 truncate text-xs text-text-primary"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        title={span.name}
      >
        <span
          className={cn(
            "mr-space-1 inline-block h-2 w-2 rounded-full",
            statusColor
          )}
          aria-hidden="true"
        />
        {span.name}
      </div>

      {/* Waterfall bar */}
      <div className="relative h-5 flex-1">
        <div
          className={cn(
            "absolute top-0.5 h-4 rounded-sm transition-all",
            statusColor,
            "opacity-80 hover:opacity-100"
          )}
          style={{
            left: `${leftPct}%`,
            width: `${Math.max(widthPct, 0.5)}%`,
          }}
          title={`${span.name}: ${durationMs.toFixed(0)}ms`}
        />
      </div>

      {/* Duration column */}
      <div className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted">
        {durationMs.toFixed(0)}ms
      </div>
    </div>
  );
}

export function SpanWaterfall({ spans, traceDurationMs }: SpanWaterfallProps) {
  if (spans.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-text-muted">
        No spans recorded
      </div>
    );
  }

  const traceStart = Math.min(
    ...spans.map((s) => new Date(s.start_time).getTime())
  );

  const tree = buildTree(spans);

  // Find root spans (spans whose parent_span_id doesn't exist in our set)
  const spanIds = new Set(spans.map((s) => s.span_id));
  const rootParentIds: string[] = [];
  for (const span of spans) {
    if (!span.parent_span_id || !spanIds.has(span.parent_span_id)) {
      if (!rootParentIds.includes(span.parent_span_id || "__root__")) {
        rootParentIds.push(span.parent_span_id || "__root__");
      }
    }
  }

  const flatSpans: Array<{ span: Span; depth: number }> = [];
  for (const parentId of rootParentIds) {
    flatSpans.push(...flattenTree(tree, parentId, 0));
  }

  // If flattenTree missed some spans (orphans), add them at depth 0
  const rendered = new Set(flatSpans.map((f) => f.span.span_id));
  for (const span of spans) {
    if (!rendered.has(span.span_id)) {
      flatSpans.push({ span, depth: 0 });
    }
  }

  return (
    <div
      className="rounded-md border border-border-subtle bg-bg-surface"
      role="tree"
      aria-label="Span waterfall"
    >
      {/* Header */}
      <div className="flex items-center gap-space-2 border-b border-border-subtle px-space-2 py-space-1">
        <div className="w-48 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Span
        </div>
        <div className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Timeline
        </div>
        <div className="w-20 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Duration
        </div>
      </div>

      {/* Spans */}
      <div className="max-h-96 overflow-y-auto">
        {flatSpans.map(({ span, depth }) => (
          <SpanRow
            key={span.id}
            span={span}
            depth={depth}
            traceStart={traceStart}
            traceDurationMs={traceDurationMs}
          />
        ))}
      </div>
    </div>
  );
}
