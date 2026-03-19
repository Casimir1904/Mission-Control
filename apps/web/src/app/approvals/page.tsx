"use client";

import { useState, useCallback, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/status/empty-state";
import { StatusDot } from "@/components/status/status-dot";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/approvals";
import { useApprovals } from "@/lib/api/hooks";
import type { Approval, ApprovalStatus, ApprovalListParams } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";

const STATUS_FILTER_OPTIONS: { label: string; value: ApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const STATUS_VARIANT_MAP: Record<ApprovalStatus, "warning" | "healthy" | "critical"> = {
  pending: "warning",
  approved: "healthy",
  rejected: "critical",
};

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

export default function ApprovalsPage() {
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("all");
  const [reviewApproval, setReviewApproval] = useState<Approval | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const params: ApprovalListParams = useMemo(
    () => ({
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      per_page: 50,
    }),
    [statusFilter]
  );

  const { data, isLoading } = useApprovals(params);

  const handleReview = useCallback((approval: Approval) => {
    setReviewApproval(approval);
    setReviewOpen(true);
  }, []);

  const columns: ColumnDef<Approval, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <div className="flex items-center gap-space-2">
              <StatusDot
                variant={STATUS_VARIANT_MAP[status]}
                label={status}
              />
              <span className="text-sm capitalize text-text-secondary">
                {status}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "task_title",
        header: "Task",
        cell: ({ row }) => (
          <span className="text-sm font-medium text-text-primary">
            {row.original.task_title ??
              `Task ${row.original.task_id.slice(0, 8)}`}
          </span>
        ),
      },
      {
        accessorKey: "board_name",
        header: "Board",
        cell: ({ row }) => (
          <span className="text-sm text-text-secondary">
            {row.original.board_name ?? "--"}
          </span>
        ),
      },
      {
        accessorKey: "submitted_by",
        header: "Submitted By",
        cell: ({ row }) => (
          <span className="text-sm text-text-secondary">
            {row.original.submitted_by ?? "--"}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Submitted At",
        cell: ({ row }) => (
          <span className="font-mono text-xs tabular-nums text-text-muted">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "confidence",
        header: "Confidence",
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums text-text-primary">
            {(row.original.confidence * 100).toFixed(0)}%
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        size: 100,
        cell: ({ row }) => {
          if (row.original.status !== "pending") return null;
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleReview(row.original);
              }}
            >
              Review
            </Button>
          );
        },
      },
    ],
    [handleReview]
  );

  const approvals = data?.items ?? [];

  return (
    <DashboardShell>
      <PageHeader
        title="Approvals"
        description="Review and approve agent work before it ships"
      />

      {/* Status filter */}
      <div className="mb-space-4 flex gap-space-1" role="tablist" aria-label="Filter by status">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            role="tab"
            aria-selected={statusFilter === opt.value}
            className={cn(
              "rounded-md px-space-3 py-space-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
              statusFilter === opt.value
                ? "bg-bg-elevated text-text-primary"
                : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={approvals}
        isLoading={isLoading}
        pageSize={20}
        onRowClick={(row) => {
          if (row.status === "pending") handleReview(row);
        }}
        emptyState={
          <EmptyState
            icon={ShieldCheck}
            title={
              statusFilter === "all"
                ? "No approvals yet"
                : `No ${statusFilter} approvals`
            }
            description={
              statusFilter === "pending"
                ? "All caught up. No pending reviews right now."
                : "When agents complete tasks that require human review, approval requests will appear here."
            }
          />
        }
      />

      {/* Review dialog */}
      <ReviewDialog
        approval={reviewApproval}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </DashboardShell>
  );
}
