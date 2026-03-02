"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface PaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items per page */
  itemsPerPage: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional className for styling */
  className?: string;
  /** Whether to show items info (e.g., "Showing 1-10 of 50 items") */
  showItemsInfo?: boolean;
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage,
      onPageChange,
      className,
      showItemsInfo = true,
    },
    ref,
  ) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    const handlePrevious = () => {
      if (canGoPrevious) {
        onPageChange(currentPage - 1);
      }
    };

    const handleNext = () => {
      if (canGoNext) {
        onPageChange(currentPage + 1);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-4",
          className,
        )}
      >
        {/* Items info */}
        {showItemsInfo && (
          <div className="text-sm text-[color:var(--text-quiet)]">
            Showing{" "}
            <span className="font-medium text-[color:var(--text-strong)]">
              {startItem}-{endItem}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[color:var(--text-strong)]">
              {totalItems}
            </span>{" "}
            items
          </div>
        )}

        {/* Pagination controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-[color:var(--text-quiet)]">
            Page{" "}
            <span className="font-medium text-[color:var(--text-strong)]">
              {currentPage}
            </span>{" "}
            of{" "}
            <span className="font-medium text-[color:var(--text-strong)]">
              {totalPages}
            </span>
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label="Go to next page"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  },
);
Pagination.displayName = "Pagination";

export { Pagination };
