import { apiFetch, ApiError } from "@/lib/api-client";
import type {
  Organization,
  OrganizationMember,
  UpdateOrganizationInput,
  Board,
  CreateBoardInput,
  UpdateBoardInput,
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentListParams,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TransitionTaskInput,
  TaskListParams,
  Tag,
  CreateTagInput,
  PaginatedResponse,
  ListParams,
  DashboardOverview,
  ActivityEvent,
  ActivityListParams,
  Approval,
  ApprovalListParams,
  CreateApprovalInput,
  ReviewApprovalInput,
  BoardMemory,
  CreateMemoryInput,
  UpdateMemoryInput,
  MemoryListParams,
  Notification,
  NotificationListParams,
  CostRecord,
  CreateCostRecordInput,
  CostSummary,
  CostSummaryParams,
  CostListParams,
  Trace,
  TraceListParams,
  Gateway,
  CreateGatewayInput,
  UpdateGatewayInput,
  TestConnectionResult,
  SyncResult,
  ChatSession,
  ChatMessage,
  SendMessageInput,
  CreateChatSessionInput,
  DispatchStatus,
  Deliverable,
  CreateDeliverableInput,
  TeamTemplate,
  TeamRun,
  CreateTeamRunInput,
  TeamRunListParams,
} from "./types";

export { ApiError };

// ── Helper to build query params ──

function toParams(obj: Record<string, unknown>): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params[key] = String(value);
    }
  }
  return params;
}

// ── Organizations ──

export const organizationsApi = {
  list: () => apiFetch<Organization[]>("/api/v1/organizations"),

  get: (id: string) => apiFetch<Organization>(`/api/v1/organizations/${id}`),

  getCurrent: () => apiFetch<Organization>("/api/v1/organizations/me"),

  update: (id: string, data: UpdateOrganizationInput) =>
    apiFetch<Organization>(`/api/v1/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listMembers: (orgId: string, params?: ListParams) =>
    apiFetch<PaginatedResponse<OrganizationMember>>(
      `/api/v1/organizations/${orgId}/members`,
      { params: params ? toParams({ ...params }) : undefined }
    ),
};

// ── Boards ──

export const boardsApi = {
  list: (params?: ListParams) =>
    apiFetch<PaginatedResponse<Board>>("/api/v1/boards", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Board>(`/api/v1/boards/${id}`),

  create: (data: CreateBoardInput) =>
    apiFetch<Board>("/api/v1/boards", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateBoardInput) =>
    apiFetch<Board>(`/api/v1/boards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/boards/${id}`, { method: "DELETE" }),

  archive: (id: string) =>
    apiFetch<Board>(`/api/v1/boards/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    }),
};

// ── Agents ──

export const agentsApi = {
  list: (params?: AgentListParams) =>
    apiFetch<PaginatedResponse<Agent>>("/api/v1/agents", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Agent>(`/api/v1/agents/${id}`),

  create: (data: CreateAgentInput) =>
    apiFetch<Agent>("/api/v1/agents", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateAgentInput) =>
    apiFetch<Agent>(`/api/v1/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/agents/${id}`, { method: "DELETE" }),

  listByBoard: (boardId: string, params?: ListParams) =>
    apiFetch<PaginatedResponse<Agent>>(
      `/api/v1/boards/${boardId}/agents`,
      { params: params ? toParams({ ...params }) : undefined }
    ),
};

// ── Tasks ──

export const tasksApi = {
  list: (params?: TaskListParams) =>
    apiFetch<PaginatedResponse<Task>>("/api/v1/tasks", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Task>(`/api/v1/tasks/${id}`),

  create: (data: CreateTaskInput) =>
    apiFetch<Task>("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTaskInput) =>
    apiFetch<Task>(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/tasks/${id}`, { method: "DELETE" }),

  transition: (id: string, data: TransitionTaskInput) =>
    apiFetch<Task>(`/api/v1/tasks/${id}/transition`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listByBoard: (boardId: string, params?: TaskListParams) =>
    apiFetch<PaginatedResponse<Task>>(
      `/api/v1/boards/${boardId}/tasks`,
      { params: params ? toParams({ ...params }) : undefined }
    ),
};

// ── Tags ──

export const tagsApi = {
  list: (params?: ListParams) =>
    apiFetch<PaginatedResponse<Tag>>("/api/v1/tags", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  create: (data: CreateTagInput) =>
    apiFetch<Tag>("/api/v1/tags", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/tags/${id}`, { method: "DELETE" }),
};

// ── Dashboard ──

export const dashboardApi = {
  get: () => apiFetch<DashboardOverview>("/api/v1/dashboard"),
};

// ── Activity ──

export const activityApi = {
  list: (params?: ActivityListParams) =>
    apiFetch<PaginatedResponse<ActivityEvent>>("/api/v1/activity", {
      params: params ? toParams({ ...params }) : undefined,
    }),
};

// ── Approvals ──

export const approvalsApi = {
  list: (params?: ApprovalListParams) =>
    apiFetch<PaginatedResponse<Approval>>("/api/v1/approvals", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Approval>(`/api/v1/approvals/${id}`),

  create: (data: CreateApprovalInput) =>
    apiFetch<Approval>("/api/v1/approvals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  review: (id: string, data: ReviewApprovalInput) =>
    apiFetch<Approval>(`/api/v1/approvals/${id}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Memory ──

export const memoryApi = {
  list: (boardId: string, params?: MemoryListParams) =>
    apiFetch<PaginatedResponse<BoardMemory>>(
      `/api/v1/boards/${boardId}/memory`,
      { params: params ? toParams({ ...params }) : undefined }
    ),

  get: (id: string) => apiFetch<BoardMemory>(`/api/v1/memory/${id}`),

  create: (boardId: string, data: CreateMemoryInput) =>
    apiFetch<BoardMemory>(`/api/v1/boards/${boardId}/memory`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateMemoryInput) =>
    apiFetch<BoardMemory>(`/api/v1/memory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/memory/${id}`, { method: "DELETE" }),
};

// ── Notifications ──

export const notificationsApi = {
  list: (params?: NotificationListParams) =>
    apiFetch<PaginatedResponse<Notification>>("/api/v1/notifications", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  unreadCount: () =>
    apiFetch<{ count: number }>("/api/v1/notifications/unread-count"),

  markRead: (id: string) =>
    apiFetch<void>(`/api/v1/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllRead: () =>
    apiFetch<void>("/api/v1/notifications/read-all", {
      method: "POST",
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/notifications/${id}`, { method: "DELETE" }),
};

// ── Costs ──

export const costsApi = {
  list: (params?: CostListParams) =>
    apiFetch<PaginatedResponse<CostRecord>>("/api/v1/costs", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  create: (data: CreateCostRecordInput) =>
    apiFetch<CostRecord>("/api/v1/costs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  summary: (params?: CostSummaryParams) =>
    apiFetch<CostSummary>("/api/v1/costs/summary", {
      params: params ? toParams({ ...params }) : undefined,
    }),
};

// ── Traces ──

export const tracesApi = {
  list: (params?: TraceListParams) =>
    apiFetch<PaginatedResponse<Trace>>("/api/v1/traces", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Trace>(`/api/v1/traces/${id}`),

  create: (data: Partial<Trace>) =>
    apiFetch<Trace>("/api/v1/traces", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ── Gateways ──

export const gatewaysApi = {
  list: (params?: ListParams) =>
    apiFetch<PaginatedResponse<Gateway>>("/api/v1/gateways", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  get: (id: string) => apiFetch<Gateway>(`/api/v1/gateways/${id}`),

  create: (data: CreateGatewayInput) =>
    apiFetch<Gateway>("/api/v1/gateways", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateGatewayInput) =>
    apiFetch<Gateway>(`/api/v1/gateways/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/gateways/${id}`, { method: "DELETE" }),

  testConnection: (id: string) =>
    apiFetch<TestConnectionResult>(`/api/v1/gateways/${id}/test`, {
      method: "POST",
    }),

  sync: (id: string) =>
    apiFetch<SyncResult>(`/api/v1/gateways/${id}/sync`, {
      method: "POST",
    }),
};

// ── Chat Sessions ──

export const chatApi = {
  createSession: (boardId: string, data?: CreateChatSessionInput) =>
    apiFetch<ChatSession>(`/api/v1/boards/${boardId}/chat/sessions`, {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    }),

  listSessions: async (boardId: string): Promise<ChatSession[]> => {
    const res = await apiFetch<{ items: ChatSession[]; total: number }>(
      `/api/v1/boards/${boardId}/chat/sessions`
    );
    return res.items ?? [];
  },

  sendMessage: (sessionKey: string, data: SendMessageInput) =>
    apiFetch<ChatMessage>(
      `/api/v1/chat/sessions/${sessionKey}/messages`,
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),

  getMessages: (sessionKey: string) =>
    apiFetch<ChatMessage[]>(
      `/api/v1/chat/sessions/${sessionKey}/messages`
    ),

  abortGeneration: (sessionKey: string) =>
    apiFetch<Record<string, never>>(
      `/api/v1/chat/sessions/${sessionKey}/abort`,
      { method: "POST" }
    ),

  endSession: (sessionKey: string) =>
    apiFetch<Record<string, never>>(
      `/api/v1/chat/sessions/${sessionKey}`,
      { method: "DELETE" }
    ),
};

// ── Deliverables ──

export const deliverablesApi = {
  list: (taskId: string) =>
    apiFetch<Deliverable[]>(`/api/v1/tasks/${taskId}/deliverables`),

  get: (id: string) =>
    apiFetch<Deliverable>(`/api/v1/deliverables/${id}`),

  create: (taskId: string, data: CreateDeliverableInput) =>
    apiFetch<Deliverable>(`/api/v1/tasks/${taskId}/deliverables`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/api/v1/deliverables/${id}`, { method: "DELETE" }),
};

// ── Task Dispatch ──

export const dispatchApi = {
  dispatch: (taskId: string) =>
    apiFetch<DispatchStatus>(`/api/v1/tasks/${taskId}/dispatch`, {
      method: "POST",
    }),

  getStatus: (taskId: string) =>
    apiFetch<DispatchStatus>(`/api/v1/tasks/${taskId}/dispatch`),
};

// ── Teams (ClawTeam) ──

export const teamsApi = {
  listTemplates: () =>
    apiFetch<TeamTemplate[]>("/api/v1/teams/templates"),

  createRun: (data: CreateTeamRunInput) =>
    apiFetch<TeamRun>("/api/v1/teams/runs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listRuns: (params?: TeamRunListParams) =>
    apiFetch<TeamRun[]>("/api/v1/teams/runs", {
      params: params ? toParams({ ...params }) : undefined,
    }),

  getRun: (id: string) =>
    apiFetch<TeamRun>(`/api/v1/teams/runs/${id}`),

  cancelRun: (id: string) =>
    apiFetch<void>(`/api/v1/teams/runs/${id}`, { method: "DELETE" }),

  syncRun: (id: string) =>
    apiFetch<TeamRun>(`/api/v1/teams/runs/${id}/sync`, { method: "POST" }),
};
