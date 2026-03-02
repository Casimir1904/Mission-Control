"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Code, HeadphonesIcon, Sparkles } from "lucide-react";

import type { RowSelectionState } from "@tanstack/react-table";
import { useAuth } from "@/auth/clerk";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AgentsTable } from "@/components/agents/AgentsTable";
import { DashboardPageLayout } from "@/components/templates/DashboardPageLayout";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/ui/confirm-action-dialog";
import { Pagination } from "@/components/ui/pagination";

import { ApiError } from "@/api/mutator";
import {
  type listAgentsApiV1AgentsGetResponse,
  deleteAgentApiV1AgentsAgentIdDelete,
  getListAgentsApiV1AgentsGetQueryKey,
  useDeleteAgentApiV1AgentsAgentIdDelete,
  useListAgentsApiV1AgentsGet,
} from "@/api/generated/agents/agents";
import {
  type listBoardsApiV1BoardsGetResponse,
  getListBoardsApiV1BoardsGetQueryKey,
  useListBoardsApiV1BoardsGet,
} from "@/api/generated/boards/boards";
import { type AgentRead } from "@/api/generated/model";
import { createOptimisticListDeleteMutation } from "@/lib/list-delete";
import { createOptimisticListBulkDeleteMutation } from "@/lib/list-bulk-operations";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import { useUrlSorting } from "@/lib/use-url-sorting";

const ITEMS_PER_PAGE = 10;

const AGENT_SORTABLE_COLUMNS = [
  "name",
  "status",
  "openclaw_session_id",
  "board_id",
  "last_seen_at",
  "updated_at",
];

export default function AgentsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { isAdmin } = useOrganizationMembership(isSignedIn);
  const { sorting, onSortingChange } = useUrlSorting({
    allowedColumnIds: AGENT_SORTABLE_COLUMNS,
    defaultSorting: [{ id: "name", desc: false }],
    paramPrefix: "agents",
  });

  const [deleteTarget, setDeleteTarget] = useState<AgentRead | null>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const boardsKey = getListBoardsApiV1BoardsGetQueryKey();
  const agentsKey = getListAgentsApiV1AgentsGetQueryKey();

  const boardsQuery = useListBoardsApiV1BoardsGet<
    listBoardsApiV1BoardsGetResponse,
    ApiError
  >(undefined, {
    query: {
      enabled: Boolean(isSignedIn && isAdmin),
      refetchInterval: 30_000,
      refetchOnMount: "always",
    },
  });

  const agentsQuery = useListAgentsApiV1AgentsGet<
    listAgentsApiV1AgentsGetResponse,
    ApiError
  >(undefined, {
    query: {
      enabled: Boolean(isSignedIn && isAdmin),
      refetchInterval: 15_000,
      refetchOnMount: "always",
    },
  });

  const boards = useMemo(
    () =>
      boardsQuery.data?.status === 200
        ? (boardsQuery.data.data.items ?? [])
        : [],
    [boardsQuery.data],
  );
  const agents = useMemo(
    () =>
      agentsQuery.data?.status === 200
        ? (agentsQuery.data.data.items ?? [])
        : [],
    [agentsQuery.data],
  );

  // Pagination logic
  const totalItems = agents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return agents.slice(start, end);
  }, [agents, currentPage]);

  const selectedAgentIds = useMemo(() => {
    return Object.keys(rowSelection);
  }, [rowSelection]);

  const deleteMutation = useDeleteAgentApiV1AgentsAgentIdDelete<
    ApiError,
    { previous?: listAgentsApiV1AgentsGetResponse }
  >(
    {
      mutation: createOptimisticListDeleteMutation<
        AgentRead,
        listAgentsApiV1AgentsGetResponse,
        { agentId: string }
      >({
        queryClient,
        queryKey: agentsKey,
        getItemId: (agent) => agent.id,
        getDeleteId: ({ agentId }) => agentId,
        onSuccess: () => {
          setDeleteTarget(null);
        },
        invalidateQueryKeys: [agentsKey, boardsKey],
      }),
    },
    queryClient,
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ agentId: deleteTarget.id });
  };

  const bulkDeleteMutation = useMutation<
    void,
    ApiError,
    { agentIds: string[] },
    { previous?: listAgentsApiV1AgentsGetResponse }
  >({
    mutationFn: async ({ agentIds }) => {
      await Promise.all(
        agentIds.map((agentId) => deleteAgentApiV1AgentsAgentIdDelete(agentId)),
      );
    },
    ...createOptimisticListBulkDeleteMutation<
      AgentRead,
      listAgentsApiV1AgentsGetResponse,
      { agentIds: string[] }
    >({
      queryClient,
      queryKey: agentsKey,
      getItemId: (agent) => agent.id,
      getDeleteIds: ({ agentIds }) => agentIds,
      onSuccess: () => {
        setRowSelection({});
        setIsBulkDeleteOpen(false);
      },
      invalidateQueryKeys: [agentsKey, boardsKey],
    }),
  });

  const handleBulkDelete = () => {
    if (selectedAgentIds.length === 0) return;
    bulkDeleteMutation.mutate({ agentIds: selectedAgentIds });
  };

  return (
    <>
      <DashboardPageLayout
        signedOut={{
          message: "Sign in to view agents.",
          forceRedirectUrl: "/agents",
          signUpForceRedirectUrl: "/agents",
        }}
        title="Agents"
        description={`${agents.length} agent${agents.length === 1 ? "" : "s"} total.`}
        headerActions={
          agents.length > 0 ? (
            <Button onClick={() => router.push("/agents/new")}>
              New agent
            </Button>
          ) : null
        }
        isAdmin={isAdmin}
        adminOnlyMessage="Only organization owners and admins can access agents."
        stickyHeader
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <AgentsTable
            agents={paginatedAgents}
            boards={boards}
            isLoading={agentsQuery.isLoading}
            sorting={sorting}
            onSortingChange={onSortingChange}
            showActions
            stickyHeader
            onDelete={setDeleteTarget}
            enableRowSelection
            rowSelection={rowSelection}
            onSelectionChange={setRowSelection}
            getRowId={(agent) => agent.id}
            emptyState={{
              title: "No agents yet",
              description:
                "Create your first agent to start executing tasks on this board. Agents run autonomously and check in periodically based on their heartbeat schedule.",
              quickActions: [
                {
                  label: "Generalist",
                  href: "/agents/new?role=generalist",
                  variant: "outline",
                  icon: <Bot className="h-4 w-4" />,
                },
                {
                  label: "Developer",
                  href: "/agents/new?role=developer",
                  variant: "outline",
                  icon: <Code className="h-4 w-4" />,
                },
                {
                  label: "Support",
                  href: "/agents/new?role=support",
                  variant: "outline",
                  icon: <HeadphonesIcon className="h-4 w-4" />,
                },
                {
                  label: "Creative",
                  href: "/agents/new?role=creative",
                  variant: "outline",
                  icon: <Sparkles className="h-4 w-4" />,
                },
              ],
              learnMoreHref: "/docs/agents",
            }}
          />
        </div>

        {agents.length > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

        {agentsQuery.error ? (
          <p className="mt-4 text-sm text-red-500">
            {agentsQuery.error.message}
          </p>
        ) : null}
      </DashboardPageLayout>

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        ariaLabel="Delete agent"
        title="Delete agent"
        description={
          <>
            This will remove {deleteTarget?.name}. This action cannot be undone.
          </>
        }
        errorMessage={deleteMutation.error?.message}
        onConfirm={handleDelete}
        isConfirming={deleteMutation.isPending}
      />

      <ConfirmActionDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsBulkDeleteOpen(false);
          }
        }}
        ariaLabel="Delete agents"
        title="Delete agents"
        description={
          <>
            This will remove {selectedAgentIds.length} selected agent
            {selectedAgentIds.length === 1 ? "" : "s"}. This action cannot be
            undone.
          </>
        }
        errorMessage={bulkDeleteMutation.error?.message}
        onConfirm={handleBulkDelete}
        isConfirming={bulkDeleteMutation.isPending}
      />
    </>
  );
}
