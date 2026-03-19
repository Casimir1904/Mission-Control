"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import {
  organizationsApi,
  boardsApi,
  agentsApi,
  tasksApi,
  tagsApi,
  dashboardApi,
  activityApi,
  approvalsApi,
  memoryApi,
  notificationsApi,
  costsApi,
  tracesApi,
  gatewaysApi,
  ApiError,
} from "./client";
import type {
  CreateBoardInput,
  UpdateBoardInput,
  CreateAgentInput,
  UpdateAgentInput,
  AgentListParams,
  CreateTaskInput,
  UpdateTaskInput,
  TransitionTaskInput,
  TaskListParams,
  CreateTagInput,
  ListParams,
  UpdateOrganizationInput,
  ActivityListParams,
  ApprovalListParams,
  CreateApprovalInput,
  ReviewApprovalInput,
  MemoryListParams,
  CreateMemoryInput,
  UpdateMemoryInput,
  NotificationListParams,
  CostSummaryParams,
  CostListParams,
  TraceListParams,
  CreateGatewayInput,
  UpdateGatewayInput,
} from "./types";

// ── Query Keys ──

export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
    current: ["organizations", "current"] as const,
    members: (orgId: string) => ["organizations", orgId, "members"] as const,
  },
  boards: {
    all: ["boards"] as const,
    list: (params?: ListParams) => ["boards", "list", params] as const,
    detail: (id: string) => ["boards", id] as const,
  },
  agents: {
    all: ["agents"] as const,
    list: (params?: AgentListParams) => ["agents", "list", params] as const,
    detail: (id: string) => ["agents", id] as const,
    byBoard: (boardId: string) => ["agents", "board", boardId] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (params?: TaskListParams) => ["tasks", "list", params] as const,
    detail: (id: string) => ["tasks", id] as const,
    byBoard: (boardId: string, params?: TaskListParams) =>
      ["tasks", "board", boardId, params] as const,
  },
  tags: {
    all: ["tags"] as const,
    list: (params?: ListParams) => ["tags", "list", params] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
  },
  activity: {
    all: ["activity"] as const,
    list: (params?: ActivityListParams) => ["activity", "list", params] as const,
  },
  approvals: {
    all: ["approvals"] as const,
    list: (params?: ApprovalListParams) => ["approvals", "list", params] as const,
    detail: (id: string) => ["approvals", id] as const,
  },
  memory: {
    all: ["memory"] as const,
    list: (boardId: string, params?: MemoryListParams) =>
      ["memory", "list", boardId, params] as const,
    detail: (id: string) => ["memory", id] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: (params?: NotificationListParams) =>
      ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
  costs: {
    all: ["costs"] as const,
    list: (params?: CostListParams) => ["costs", "list", params] as const,
    summary: (params?: CostSummaryParams) =>
      ["costs", "summary", params] as const,
  },
  traces: {
    all: ["traces"] as const,
    list: (params?: TraceListParams) => ["traces", "list", params] as const,
    detail: (id: string) => ["traces", id] as const,
  },
  gateways: {
    all: ["gateways"] as const,
    list: (params?: ListParams) => ["gateways", "list", params] as const,
    detail: (id: string) => ["gateways", id] as const,
  },
};

// ── Error helper ──

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as { detail?: string } | undefined;
    return body?.detail ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

// ── Organizations ──

export function useOrganizations() {
  return useQuery({
    queryKey: queryKeys.organizations.all,
    queryFn: () => organizationsApi.list(),
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: () => organizationsApi.get(id),
    enabled: !!id,
  });
}

export function useCurrentOrganization() {
  return useQuery({
    queryKey: queryKeys.organizations.current,
    queryFn: () => organizationsApi.getCurrent(),
  });
}

export function useOrganizationMembers(orgId: string) {
  return useQuery({
    queryKey: queryKeys.organizations.members(orgId),
    queryFn: () => organizationsApi.listMembers(orgId),
    enabled: !!orgId,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationInput }) =>
      organizationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.current,
      });
      addToast({ variant: "success", message: "Organization updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update organization",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Boards ──

export function useBoards(params?: ListParams) {
  return useQuery({
    queryKey: queryKeys.boards.list(params),
    queryFn: () => boardsApi.list(params),
  });
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: queryKeys.boards.detail(id),
    queryFn: () => boardsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateBoardInput) => boardsApi.create(data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addToast({
        variant: "success",
        message: `Board "${board.name}" created`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create board",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBoardInput }) =>
      boardsApi.update(id, data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.detail(board.id),
      });
      addToast({ variant: "success", message: "Board updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update board",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => boardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addToast({ variant: "success", message: "Board deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete board",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Agents ──

export function useAgents(params?: AgentListParams) {
  return useQuery({
    queryKey: queryKeys.agents.list(params),
    queryFn: () => agentsApi.list(params),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: queryKeys.agents.detail(id),
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  });
}

export function useAgentsByBoard(boardId: string) {
  return useQuery({
    queryKey: queryKeys.agents.byBoard(boardId),
    queryFn: () => agentsApi.listByBoard(boardId),
    enabled: !!boardId,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAgentInput) => agentsApi.create(data),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.byBoard(agent.board_id),
      });
      addToast({
        variant: "success",
        message: `Agent "${agent.name}" created`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create agent",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAgentInput }) =>
      agentsApi.update(id, data),
    onSuccess: (agent) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(agent.id),
      });
      addToast({ variant: "success", message: "Agent updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update agent",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => agentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      addToast({ variant: "success", message: "Agent deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete agent",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Tasks ──

export function useTasks(params?: TaskListParams) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => tasksApi.list(params),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksApi.get(id),
    enabled: !!id,
  });
}

export function useTasksByBoard(boardId: string, params?: TaskListParams) {
  return useQuery({
    queryKey: queryKeys.tasks.byBoard(boardId, params),
    queryFn: () => tasksApi.listByBoard(boardId, params),
    enabled: !!boardId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => tasksApi.create(data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byBoard(task.board_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addToast({
        variant: "success",
        message: `Task "${task.title}" created`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create task",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      tasksApi.update(id, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(task.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byBoard(task.board_id),
      });
      addToast({ variant: "success", message: "Task updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update task",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      addToast({ variant: "success", message: "Task deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete task",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useTransitionTask() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: TransitionTaskInput;
    }) => tasksApi.transition(id, data),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.detail(task.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byBoard(task.board_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addToast({
        variant: "success",
        message: `Task moved to ${task.status.replace("_", " ")}`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to transition task",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Tags ──

export function useTags(params?: ListParams) {
  return useQuery({
    queryKey: queryKeys.tags.list(params),
    queryFn: () => tagsApi.list(params),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateTagInput) => tagsApi.create(data),
    onSuccess: (tag) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      addToast({ variant: "success", message: `Tag "${tag.name}" created` });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create tag",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags.all });
      addToast({ variant: "success", message: "Tag deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete tag",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Dashboard ──

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardApi.get(),
    refetchInterval: 10_000, // Live data: 10s polling baseline
  });
}

// ── Activity ──

export function useActivity(params?: ActivityListParams) {
  return useQuery({
    queryKey: queryKeys.activity.list(params),
    queryFn: () => activityApi.list(params),
  });
}

// ── Approvals ──

export function useApprovals(params?: ApprovalListParams) {
  return useQuery({
    queryKey: queryKeys.approvals.list(params),
    queryFn: () => approvalsApi.list(params),
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: queryKeys.approvals.detail(id),
    queryFn: () => approvalsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateApproval() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateApprovalInput) => approvalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      addToast({ variant: "success", message: "Approval submitted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to submit approval",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useReviewApproval() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ReviewApprovalInput;
    }) => approvalsApi.review(id, data),
    onSuccess: (approval) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.approvals.detail(approval.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      addToast({
        variant: "success",
        message: `Approval ${approval.status}`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to review approval",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Memory ──

export function useMemory(boardId: string, params?: MemoryListParams) {
  return useQuery({
    queryKey: queryKeys.memory.list(boardId, params),
    queryFn: () => memoryApi.list(boardId, params),
    enabled: !!boardId,
  });
}

export function useMemoryEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.memory.detail(id),
    queryFn: () => memoryApi.get(id),
    enabled: !!id,
  });
}

export function useCreateMemory() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({
      boardId,
      data,
    }: {
      boardId: string;
      data: CreateMemoryInput;
    }) => memoryApi.create(boardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      addToast({ variant: "success", message: "Memory entry created" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create memory entry",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateMemory() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMemoryInput;
    }) => memoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      addToast({ variant: "success", message: "Memory entry updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update memory entry",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => memoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memory.all });
      addToast({ variant: "success", message: "Memory entry deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete memory entry",
        description: getErrorMessage(error),
      });
    },
  });
}

// ── Notifications ──

export function useNotifications(params?: NotificationListParams) {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsApi.list(params),
    // Notifications are non-critical: suppress errors gracefully.
    // A 404 (endpoint not yet deployed) or network error should not
    // surface as an error banner — treat as empty list.
    retry: 1,
    meta: { suppressErrors: true },
  });
}

export function useNotificationUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      try {
        return await notificationsApi.unreadCount();
      } catch {
        // If endpoint is unavailable, return zero rather than error
        return { count: 0 };
      }
    },
    refetchInterval: 30_000, // Poll every 30s as baseline
    retry: 1,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      addToast({ variant: "success", message: "All notifications marked as read" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to mark notifications as read",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// ── Costs ──

export function useCosts(params?: CostListParams) {
  return useQuery({
    queryKey: queryKeys.costs.list(params),
    queryFn: () => costsApi.list(params),
  });
}

export function useCostSummary(params?: CostSummaryParams) {
  return useQuery({
    queryKey: queryKeys.costs.summary(params),
    queryFn: () => costsApi.summary(params),
  });
}

// ── Traces ──

export function useTraces(params?: TraceListParams) {
  return useQuery({
    queryKey: queryKeys.traces.list(params),
    queryFn: () => tracesApi.list(params),
  });
}

export function useTrace(id: string) {
  return useQuery({
    queryKey: queryKeys.traces.detail(id),
    queryFn: () => tracesApi.get(id),
    enabled: !!id,
  });
}

// ── Gateways ──

export function useGateways(params?: ListParams) {
  return useQuery({
    queryKey: queryKeys.gateways.list(params),
    queryFn: () => gatewaysApi.list(params),
  });
}

export function useGateway(id: string) {
  return useQuery({
    queryKey: queryKeys.gateways.detail(id),
    queryFn: () => gatewaysApi.get(id),
    enabled: !!id,
  });
}

export function useCreateGateway() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (data: CreateGatewayInput) => gatewaysApi.create(data),
    onSuccess: (gw) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
      addToast({
        variant: "success",
        message: `Gateway "${gw.name}" created`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to create gateway",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateGateway() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateGatewayInput;
    }) => gatewaysApi.update(id, data),
    onSuccess: (gw) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.gateways.detail(gw.id),
      });
      addToast({ variant: "success", message: "Gateway updated" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to update gateway",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteGateway() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => gatewaysApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
      addToast({ variant: "success", message: "Gateway deleted" });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to delete gateway",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useTestGatewayConnection() {
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => gatewaysApi.testConnection(id),
    onSuccess: (result) => {
      if (result.success) {
        addToast({
          variant: "success",
          message: `Connection successful (${result.latency_ms}ms)`,
        });
      } else {
        addToast({
          variant: "error",
          message: "Connection failed",
          description: result.error,
        });
      }
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to test connection",
        description: getErrorMessage(error),
      });
    },
  });
}

export function useSyncGateway() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: (id: string) => gatewaysApi.sync(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gateways.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      addToast({
        variant: "success",
        message: `Synced ${result.agents_synced} agent(s)`,
      });
    },
    onError: (error) => {
      addToast({
        variant: "error",
        message: "Failed to sync gateway",
        description: getErrorMessage(error),
      });
    },
  });
}
