"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReviewApproval } from "@/lib/api/hooks";
import type { Approval } from "@/lib/api/types";
import { ShieldCheck, ShieldX } from "lucide-react";

interface ReviewDialogProps {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal dialog for reviewing an approval request.
 * Shows task details, approval comment, and provides approve/reject controls.
 * Designed to feel serious and trustworthy as a governance feature.
 */
export function ReviewDialog({
  approval,
  open,
  onOpenChange,
}: ReviewDialogProps) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(
    null
  );
  const [comment, setComment] = useState("");
  const [confidence, setConfidence] = useState(80);
  const reviewMutation = useReviewApproval();

  const handleSubmit = useCallback(() => {
    if (!approval || !decision) return;

    reviewMutation.mutate(
      {
        id: approval.id,
        data: {
          status: decision,
          comment: comment || undefined,
          confidence: confidence / 100,
        },
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          // Reset form
          setDecision(null);
          setComment("");
          setConfidence(80);
        },
      }
    );
  }, [approval, decision, comment, confidence, reviewMutation, onOpenChange]);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setDecision(null);
        setComment("");
        setConfidence(80);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  if (!approval) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Approval</DialogTitle>
          <DialogDescription>
            Review the work and make your decision. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Task info */}
        <div className="space-y-space-3 py-space-2">
          <div>
            <p className="text-xs font-medium text-text-muted">Task</p>
            <p className="text-sm text-text-primary">
              {approval.task_title ?? `Task ${approval.task_id.slice(0, 8)}`}
            </p>
          </div>

          {approval.comment && (
            <div>
              <p className="text-xs font-medium text-text-muted">
                Submission Comment
              </p>
              <p className="mt-space-1 rounded-md bg-bg-elevated px-space-3 py-space-2 text-sm text-text-secondary">
                {approval.comment}
              </p>
            </div>
          )}

          {/* Rubric scores if present */}
          {approval.rubric_scores &&
            Object.keys(approval.rubric_scores).length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted">
                  Rubric Scores
                </p>
                <div className="mt-space-1 space-y-space-1">
                  {Object.entries(approval.rubric_scores).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-text-secondary capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono tabular-nums text-text-primary">
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

          <div className="text-xs text-text-muted">
            Submitted confidence:{" "}
            <span className="font-mono tabular-nums text-text-secondary">
              {(approval.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border-subtle" />

        {/* Decision radio buttons */}
        <fieldset className="space-y-space-2">
          <legend className="text-xs font-medium text-text-muted">
            Decision
          </legend>
          <div className="flex gap-space-2">
            <button
              type="button"
              onClick={() => setDecision("approved")}
              className={cn(
                "flex flex-1 items-center justify-center gap-space-2 rounded-md border px-space-3 py-space-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
                decision === "approved"
                  ? "border-status-healthy bg-status-healthy/10 text-status-healthy"
                  : "border-border-default text-text-secondary hover:border-border-strong hover:bg-bg-elevated"
              )}
              role="radio"
              aria-checked={decision === "approved"}
            >
              <ShieldCheck size={16} aria-hidden="true" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => setDecision("rejected")}
              className={cn(
                "flex flex-1 items-center justify-center gap-space-2 rounded-md border px-space-3 py-space-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong",
                decision === "rejected"
                  ? "border-status-critical bg-status-critical/10 text-status-critical"
                  : "border-border-default text-text-secondary hover:border-border-strong hover:bg-bg-elevated"
              )}
              role="radio"
              aria-checked={decision === "rejected"}
            >
              <ShieldX size={16} aria-hidden="true" />
              Reject
            </button>
          </div>
        </fieldset>

        {/* Comment */}
        <div className="space-y-space-1">
          <label
            htmlFor="review-comment"
            className="text-xs font-medium text-text-muted"
          >
            Comment {decision === "rejected" && "(recommended)"}
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your review notes..."
            rows={3}
            className="w-full resize-none rounded-md border border-border-default bg-bg-elevated px-space-3 py-space-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-border-strong"
          />
        </div>

        {/* Confidence slider */}
        <div className="space-y-space-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="review-confidence"
              className="text-xs font-medium text-text-muted"
            >
              Your Confidence
            </label>
            <span className="font-mono text-xs tabular-nums text-text-secondary">
              {confidence}%
            </span>
          </div>
          <input
            id="review-confidence"
            type="range"
            min={0}
            max={100}
            step={5}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-accent-primary"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={reviewMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!decision || reviewMutation.isPending}
            variant={decision === "rejected" ? "destructive" : "default"}
          >
            {reviewMutation.isPending
              ? "Submitting..."
              : decision === "rejected"
                ? "Reject"
                : decision === "approved"
                  ? "Approve"
                  : "Select decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
