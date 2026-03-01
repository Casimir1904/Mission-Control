/**
 * Manual API hooks for new endpoints (agent-roles, model-defaults, gateway models).
 * These supplement the orval-generated hooks until the OpenAPI spec is regenerated.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseQueryOptions,
} from "@tanstack/react-query";

import { customFetch } from "@/api/mutator";
import type { ApiError } from "@/api/mutator";

// ── Types ────────────────────────────────────────────────────────────────────

export type AgentRoleRead = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  avatar_emoji: string | null;
  is_preset: boolean;
  default_model: string | null;
  identity_profile: Record<string, unknown> | null;
  soul_template: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AgentRoleCreate = {
  name: string;
  description?: string | null;
  avatar_emoji?: string | null;
  default_model?: string | null;
  identity_profile?: Record<string, unknown> | null;
  soul_template?: string | null;
  sort_order?: number;
};

export type AgentRoleUpdate = Partial<AgentRoleCreate>;

export type ModelDefaultsRead = {
  id: string;
  organization_id: string;
  global_default_model: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ModelDefaultsUpdate = {
  global_default_model?: string | null;
  preferences?: Record<string, unknown> | null;
};

export type GatewayModelInfo = {
  id: string;
  name: string | null;
  provider: string | null;
};

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

type ApiResponse<T> = { data: T; status: number };

// ── Query keys ───────────────────────────────────────────────────────────────

export const agentRolesQueryKey = () => ["agent-roles"] as const;
export const modelDefaultsQueryKey = () => ["model-defaults"] as const;
export const gatewayModelsQueryKey = (gatewayId: string) =>
  ["gateway-models", gatewayId] as const;

// ── Agent Roles ──────────────────────────────────────────────────────────────

export function useListAgentRoles(
  options?: Partial<UseQueryOptions<ApiResponse<PaginatedResponse<AgentRoleRead>>, ApiError>>,
) {
  return useQuery<ApiResponse<PaginatedResponse<AgentRoleRead>>, ApiError>({
    queryKey: agentRolesQueryKey(),
    queryFn: () =>
      customFetch<ApiResponse<PaginatedResponse<AgentRoleRead>>>(
        "/api/v1/agent-roles?limit=100",
        { method: "GET" },
      ),
    ...options,
  });
}

export function useCreateAgentRole(
  options?: Partial<UseMutationOptions<ApiResponse<AgentRoleRead>, ApiError, AgentRoleCreate>>,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<AgentRoleRead>, ApiError, AgentRoleCreate>({
    mutationFn: (data) =>
      customFetch<ApiResponse<AgentRoleRead>>("/api/v1/agent-roles", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: agentRolesQueryKey() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateAgentRole(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<AgentRoleRead>,
      ApiError,
      { roleId: string; data: AgentRoleUpdate }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<AgentRoleRead>,
    ApiError,
    { roleId: string; data: AgentRoleUpdate }
  >({
    mutationFn: ({ roleId, data }) =>
      customFetch<ApiResponse<AgentRoleRead>>(`/api/v1/agent-roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: agentRolesQueryKey() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteAgentRole(
  options?: Partial<UseMutationOptions<ApiResponse<{ ok: boolean }>, ApiError, string>>,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<{ ok: boolean }>, ApiError, string>({
    mutationFn: (roleId) =>
      customFetch<ApiResponse<{ ok: boolean }>>(`/api/v1/agent-roles/${roleId}`, {
        method: "DELETE",
      }),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: agentRolesQueryKey() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Model Defaults ───────────────────────────────────────────────────────────

export function useGetModelDefaults(
  options?: Partial<UseQueryOptions<ApiResponse<ModelDefaultsRead>, ApiError>>,
) {
  return useQuery<ApiResponse<ModelDefaultsRead>, ApiError>({
    queryKey: modelDefaultsQueryKey(),
    queryFn: () =>
      customFetch<ApiResponse<ModelDefaultsRead>>("/api/v1/model-defaults", {
        method: "GET",
      }),
    ...options,
  });
}

export function useUpdateModelDefaults(
  options?: Partial<
    UseMutationOptions<ApiResponse<ModelDefaultsRead>, ApiError, ModelDefaultsUpdate>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<ModelDefaultsRead>, ApiError, ModelDefaultsUpdate>({
    mutationFn: (data) =>
      customFetch<ApiResponse<ModelDefaultsRead>>("/api/v1/model-defaults", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: modelDefaultsQueryKey() });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Planning ─────────────────────────────────────────────────────────────────

export type PlanningQuestionRead = {
  id: string;
  session_id: string;
  question_index: number;
  question_text: string;
  question_type: "text" | "multiple_choice";
  options: string[] | null;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

export type PlanningSessionRead = {
  id: string;
  task_id: string;
  gateway_id: string;
  gateway_session_key: string | null;
  status: "active" | "completed" | "cancelled" | "approved";
  current_question_index: number;
  planning_spec: Record<string, unknown> | null;
  planning_agents: Array<Record<string, unknown>> | null;
  questions: PlanningQuestionRead[];
  created_at: string;
  updated_at: string;
};

export const planningQueryKey = (taskId: string) =>
  ["planning", taskId] as const;

export function useGetPlanning(
  taskId: string | null,
  options?: Partial<UseQueryOptions<ApiResponse<PlanningSessionRead | null>, ApiError>>,
) {
  return useQuery<ApiResponse<PlanningSessionRead | null>, ApiError>({
    queryKey: planningQueryKey(taskId ?? ""),
    queryFn: () =>
      customFetch<ApiResponse<PlanningSessionRead | null>>(
        `/api/v1/tasks/${taskId}/planning`,
        { method: "GET" },
      ),
    enabled: !!taskId,
    ...options,
  });
}

export function useStartPlanning(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<PlanningSessionRead>,
      ApiError,
      { taskId: string; gatewayId: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; gatewayId: string }
  >({
    mutationFn: ({ taskId, gatewayId }) =>
      customFetch<ApiResponse<PlanningSessionRead>>(
        `/api/v1/tasks/${taskId}/planning/start`,
        {
          method: "POST",
          body: JSON.stringify({ gateway_id: gatewayId }),
        },
      ),
    onSuccess: (data, variables, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: planningQueryKey(variables.taskId),
      });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useSubmitPlanningAnswer(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<PlanningSessionRead>,
      ApiError,
      { taskId: string; answer: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; answer: string }
  >({
    mutationFn: ({ taskId, answer }) =>
      customFetch<ApiResponse<PlanningSessionRead>>(
        `/api/v1/tasks/${taskId}/planning/answer`,
        {
          method: "POST",
          body: JSON.stringify({ answer }),
        },
      ),
    onSuccess: (data, variables, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: planningQueryKey(variables.taskId),
      });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function useCancelPlanning(
  options?: Partial<
    UseMutationOptions<ApiResponse<{ ok: boolean }>, ApiError, string>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<{ ok: boolean }>, ApiError, string>({
    mutationFn: (taskId) =>
      customFetch<ApiResponse<{ ok: boolean }>>(
        `/api/v1/tasks/${taskId}/planning`,
        { method: "DELETE" },
      ),
    onSuccess: (data, taskId, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: planningQueryKey(taskId),
      });
      options?.onSuccess?.(data, taskId, ...rest);
    },
    ...options,
  });
}

export function useApprovePlanning(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<PlanningSessionRead>,
      ApiError,
      string
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<PlanningSessionRead>, ApiError, string>({
    mutationFn: (taskId) =>
      customFetch<ApiResponse<PlanningSessionRead>>(
        `/api/v1/tasks/${taskId}/planning/approve`,
        { method: "POST" },
      ),
    onSuccess: (data, taskId, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: planningQueryKey(taskId),
      });
      options?.onSuccess?.(data, taskId, ...rest);
    },
    ...options,
  });
}

// ── Chat Types ──────────────────────────────────────────────────────────────

export type ChatMessageRead = {
  id: string;
  session_id: string;
  sender_type: "user" | "agent" | "system";
  content: string;
  message_type: string;
  created_at: string;
};

export type ChatSessionRead = {
  id: string;
  task_id: string | null;
  agent_id: string | null;
  gateway_id: string;
  session_type: "standalone" | "task_scoped";
  title: string | null;
  status: string;
  last_message: ChatMessageRead | null;
  created_at: string;
  updated_at: string;
};

export type ChatSessionCreate = {
  gateway_id: string;
  agent_id?: string | null;
  task_id?: string | null;
  title?: string | null;
};

export type ChatMessageCreate = {
  content: string;
};

// ── Chat Query Keys ─────────────────────────────────────────────────────────

export const chatSessionsQueryKey = (params?: {
  gatewayId?: string;
  agentId?: string;
  taskId?: string;
}) => ["chat-sessions", params ?? {}] as const;

export const chatMessagesQueryKey = (sessionId: string) =>
  ["chat-messages", sessionId] as const;

// ── Chat Sessions ───────────────────────────────────────────────────────────

export function useListChatSessions(
  params?: { gatewayId?: string; agentId?: string; taskId?: string },
  options?: Partial<UseQueryOptions<ApiResponse<ChatSessionRead[]>, ApiError>>,
) {
  const searchParams = new URLSearchParams();
  if (params?.gatewayId) searchParams.set("gateway_id", params.gatewayId);
  if (params?.agentId) searchParams.set("agent_id", params.agentId);
  if (params?.taskId) searchParams.set("task_id", params.taskId);
  const qs = searchParams.toString();
  const url = `/api/v1/chat/sessions${qs ? `?${qs}` : ""}`;

  return useQuery<ApiResponse<ChatSessionRead[]>, ApiError>({
    queryKey: chatSessionsQueryKey(params),
    queryFn: () =>
      customFetch<ApiResponse<ChatSessionRead[]>>(url, { method: "GET" }),
    ...options,
  });
}

export function useCreateChatSession(
  options?: Partial<
    UseMutationOptions<ApiResponse<ChatSessionRead>, ApiError, ChatSessionCreate>
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<ChatSessionRead>, ApiError, ChatSessionCreate>({
    mutationFn: (data) =>
      customFetch<ApiResponse<ChatSessionRead>>("/api/v1/chat/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useGetChatSession(
  sessionId: string | null,
  options?: Partial<UseQueryOptions<ApiResponse<ChatSessionRead>, ApiError>>,
) {
  return useQuery<ApiResponse<ChatSessionRead>, ApiError>({
    queryKey: ["chat-session", sessionId],
    queryFn: () =>
      customFetch<ApiResponse<ChatSessionRead>>(
        `/api/v1/chat/sessions/${sessionId}`,
        { method: "GET" },
      ),
    enabled: !!sessionId,
    ...options,
  });
}

// ── Chat Messages ───────────────────────────────────────────────────────────

export function useListChatMessages(
  sessionId: string | null,
  options?: Partial<UseQueryOptions<ApiResponse<ChatMessageRead[]>, ApiError>>,
) {
  return useQuery<ApiResponse<ChatMessageRead[]>, ApiError>({
    queryKey: chatMessagesQueryKey(sessionId ?? ""),
    queryFn: () =>
      customFetch<ApiResponse<ChatMessageRead[]>>(
        `/api/v1/chat/sessions/${sessionId}/messages?limit=100`,
        { method: "GET" },
      ),
    enabled: !!sessionId,
    ...options,
  });
}

export function useSendChatMessage(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<ChatMessageRead>,
      ApiError,
      { sessionId: string; content: string }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<ChatMessageRead>,
    ApiError,
    { sessionId: string; content: string }
  >({
    mutationFn: ({ sessionId, content }) =>
      customFetch<ApiResponse<ChatMessageRead>>(
        `/api/v1/chat/sessions/${sessionId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      ),
    onSuccess: (data, variables, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: chatMessagesQueryKey(variables.sessionId),
      });
      void queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

export function usePollAgentResponse(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<ChatMessageRead | null>,
      ApiError,
      string
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<ChatMessageRead | null>, ApiError, string>({
    mutationFn: (sessionId) =>
      customFetch<ApiResponse<ChatMessageRead | null>>(
        `/api/v1/chat/sessions/${sessionId}/poll`,
        { method: "POST" },
      ),
    onSuccess: (data, sessionId, ...rest) => {
      if (data.data) {
        void queryClient.invalidateQueries({
          queryKey: chatMessagesQueryKey(sessionId),
        });
      }
      options?.onSuccess?.(data, sessionId, ...rest);
    },
    ...options,
  });
}

export function useArchiveChatSession(
  options?: Partial<UseMutationOptions<ApiResponse<void>, ApiError, string>>,
) {
  const queryClient = useQueryClient();
  return useMutation<ApiResponse<void>, ApiError, string>({
    mutationFn: (sessionId) =>
      customFetch<ApiResponse<void>>(
        `/api/v1/chat/sessions/${sessionId}`,
        { method: "DELETE" },
      ),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

// ── Agent Discovery ─────────────────────────────────────────────────────────

export type DiscoveredAgent = {
  gateway_agent_id: string | null;
  name: string;
  status: string | null;
  model: string | null;
  session_key: string | null;
  already_imported: boolean;
  local_agent_id: string | null;
};

export type ImportAgentEntry = {
  name: string;
  gateway_agent_id?: string | null;
  model?: string | null;
  role_id?: string | null;
};

export type ImportAgentsResponse = {
  imported: number;
  skipped: number;
  agents: Array<{ id: string; name: string }>;
};

export const discoveredAgentsQueryKey = (gatewayId: string) =>
  ["discovered-agents", gatewayId] as const;

export function useDiscoverAgents(
  gatewayId: string | null,
  options?: Partial<UseQueryOptions<ApiResponse<DiscoveredAgent[]>, ApiError>>,
) {
  return useQuery<ApiResponse<DiscoveredAgent[]>, ApiError>({
    queryKey: discoveredAgentsQueryKey(gatewayId ?? ""),
    queryFn: () =>
      customFetch<ApiResponse<DiscoveredAgent[]>>(
        `/api/v1/gateways/${gatewayId}/discover-agents`,
        { method: "GET" },
      ),
    enabled: !!gatewayId,
    ...options,
  });
}

export function useImportAgents(
  options?: Partial<
    UseMutationOptions<
      ApiResponse<ImportAgentsResponse>,
      ApiError,
      { gatewayId: string; agents: ImportAgentEntry[] }
    >
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<ImportAgentsResponse>,
    ApiError,
    { gatewayId: string; agents: ImportAgentEntry[] }
  >({
    mutationFn: ({ gatewayId, agents }) =>
      customFetch<ApiResponse<ImportAgentsResponse>>(
        `/api/v1/gateways/${gatewayId}/import-agents`,
        {
          method: "POST",
          body: JSON.stringify({ agents }),
        },
      ),
    onSuccess: (data, variables, ...rest) => {
      void queryClient.invalidateQueries({
        queryKey: discoveredAgentsQueryKey(variables.gatewayId),
      });
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
      options?.onSuccess?.(data, variables, ...rest);
    },
    ...options,
  });
}

// ── Gateway Models ───────────────────────────────────────────────────────────

export function useListGatewayModels(
  gatewayId: string | null,
  options?: Partial<UseQueryOptions<ApiResponse<GatewayModelInfo[]>, ApiError>>,
) {
  return useQuery<ApiResponse<GatewayModelInfo[]>, ApiError>({
    queryKey: gatewayModelsQueryKey(gatewayId ?? ""),
    queryFn: () =>
      customFetch<ApiResponse<GatewayModelInfo[]>>(
        `/api/v1/gateways/${gatewayId}/models`,
        { method: "GET" },
      ),
    enabled: !!gatewayId,
    ...options,
  });
}
