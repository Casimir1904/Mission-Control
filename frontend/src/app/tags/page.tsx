"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { RowSelectionState } from "@tanstack/react-table";
import { useAuth } from "@/auth/clerk";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/api/mutator";
import {
  getListTagsApiV1TagsGetQueryKey,
  type listTagsApiV1TagsGetResponse,
  deleteTagApiV1TagsTagIdDelete,
  useDeleteTagApiV1TagsTagIdDelete,
  useListTagsApiV1TagsGet,
} from "@/api/generated/tags/tags";
import type { TagRead } from "@/api/generated/model";
import { TagsTable } from "@/components/tags/TagsTable";
import { DashboardPageLayout } from "@/components/templates/DashboardPageLayout";
import { buttonVariants } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { createOptimisticListBulkDeleteMutation } from "@/lib/list-bulk-operations";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import { useUrlSorting } from "@/lib/use-url-sorting";

const TAG_SORTABLE_COLUMNS = ["name", "task_count", "updated_at"];

const extractErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

export default function TagsPage() {
  const { isSignedIn } = useAuth();
  const { isAdmin } = useOrganizationMembership(isSignedIn);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { sorting, onSortingChange } = useUrlSorting({
    allowedColumnIds: TAG_SORTABLE_COLUMNS,
    defaultSorting: [{ id: "name", desc: false }],
    paramPrefix: "tags",
  });

  const [deleteTarget, setDeleteTarget] = useState<TagRead | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const tagsQuery = useListTagsApiV1TagsGet<
    listTagsApiV1TagsGetResponse,
    ApiError
  >(undefined, {
    query: {
      enabled: Boolean(isSignedIn),
      refetchOnMount: "always",
      refetchInterval: 30_000,
    },
  });
  const tags = useMemo(
    () =>
      tagsQuery.data?.status === 200 ? (tagsQuery.data.data.items ?? []) : [],
    [tagsQuery.data],
  );
  const tagsKey = getListTagsApiV1TagsGetQueryKey();

  const selectedTagIds = useMemo(() => {
    return Object.keys(rowSelection);
  }, [rowSelection]);

  const deleteMutation = useDeleteTagApiV1TagsTagIdDelete({
    mutation: {
      onSuccess: async () => {
        setDeleteTarget(null);
        await queryClient.invalidateQueries({ queryKey: tagsKey });
      },
    },
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ tagId: deleteTarget.id });
  };

  const bulkDeleteMutation = useMutation<
    void,
    ApiError,
    { tagIds: string[] },
    { previous?: listTagsApiV1TagsGetResponse }
  >({
    mutationFn: async ({ tagIds }) => {
      await Promise.all(
        tagIds.map((tagId) => deleteTagApiV1TagsTagIdDelete(tagId)),
      );
    },
    ...createOptimisticListBulkDeleteMutation<
      TagRead,
      listTagsApiV1TagsGetResponse,
      { tagIds: string[] }
    >({
      queryClient,
      queryKey: tagsKey,
      getItemId: (tag) => tag.id,
      getDeleteIds: ({ tagIds }) => tagIds,
      onSuccess: () => {
        setRowSelection({});
        setIsBulkDeleteOpen(false);
      },
      invalidateQueryKeys: [tagsKey],
    }),
  });

  const handleBulkDelete = () => {
    if (selectedTagIds.length === 0) return;
    bulkDeleteMutation.mutate({ tagIds: selectedTagIds });
  };

  return (
    <>
      <DashboardPageLayout
        signedOut={{
          message: "Sign in to manage tags.",
          forceRedirectUrl: "/tags",
          signUpForceRedirectUrl: "/tags",
        }}
        title="Tags"
        description={`${tags.length} tag${tags.length === 1 ? "" : "s"} configured.`}
        headerActions={
          isAdmin ? (
            <Link
              href="/tags/add"
              className={buttonVariants({ size: "md", variant: "primary" })}
            >
              New tag
            </Link>
          ) : null
        }
        isAdmin={isAdmin}
        adminOnlyMessage="Only organization owners and admins can manage tags."
        stickyHeader
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <TagsTable
            tags={tags}
            isLoading={tagsQuery.isLoading}
            sorting={sorting}
            onSortingChange={onSortingChange}
            stickyHeader
            onEdit={
              isAdmin
                ? (tag) => {
                    router.push(`/tags/${tag.id}/edit`);
                  }
                : undefined
            }
            onDelete={isAdmin ? setDeleteTarget : undefined}
            enableRowSelection={isAdmin}
            rowSelection={rowSelection}
            onSelectionChange={setRowSelection}
            getRowId={(tag) => tag.id}
            emptyState={{
              title: "No tags yet",
              description:
                "Create tags to classify and group tasks across your boards.",
              actionHref: isAdmin ? "/tags/add" : undefined,
              actionLabel: isAdmin ? "Create your first tag" : undefined,
            }}
          />
        </div>
        {tagsQuery.error ? (
          <p className="mt-4 text-sm text-rose-600">
            {tagsQuery.error.message}
          </p>
        ) : null}
      </DashboardPageLayout>

      <ConfirmActionDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        ariaLabel="Delete tag"
        title="Delete tag"
        description={
          <>
            This will remove <strong>{deleteTarget?.name}</strong> from all
            tagged tasks. This action cannot be undone.
          </>
        }
        errorMessage={
          deleteMutation.error
            ? extractErrorMessage(deleteMutation.error, "Unable to delete tag.")
            : undefined
        }
        onConfirm={handleDelete}
        isConfirming={deleteMutation.isPending}
      />

      <ConfirmActionDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) setIsBulkDeleteOpen(false);
        }}
        ariaLabel="Delete tags"
        title="Delete tags"
        description={
          <>
            This will remove {selectedTagIds.length} selected tag
            {selectedTagIds.length === 1 ? "" : "s"} from all tagged tasks.
            This action cannot be undone.
          </>
        }
        errorMessage={
          bulkDeleteMutation.error
            ? extractErrorMessage(bulkDeleteMutation.error, "Unable to delete tags.")
            : undefined
        }
        onConfirm={handleBulkDelete}
        isConfirming={bulkDeleteMutation.isPending}
      />
    </>
  );
}
