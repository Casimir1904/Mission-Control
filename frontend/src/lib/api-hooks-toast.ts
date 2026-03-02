/**
 * Toast-wrapped versions of api-hooks mutations.
 *
 * These hooks extend the base mutations from api-hooks.ts by automatically
 * displaying toast notifications for success and error states. They preserve
 * all existing functionality including callbacks, query invalidation, and
 * TypeScript types.
 *
 * @example
 * // Using toast-wrapped mutation
 * const createRole = useCreateAgentRoleWithToast();
 * createRole.mutate({ name: "Admin" });
 * // Shows "Agent role created" on success, "Failed to create agent role" on error
 */

import type {
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";

import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type { ToastMessages } from "@/hooks/useMutationWithToast";
import type { ApiError } from "@/api/mutator";

// Import types from api-hooks
import type {
  AgentRoleRead,
  AgentRoleCreate,
  AgentRoleUpdate,
  ModelDefaultsRead,
  ModelDefaultsUpdate,
  PlanningSessionRead,
  ChatSessionRead,
  ChatSessionCreate,
  ChatMessageRead,
  ImportAgentsResponse,
  ImportAgentEntry,
} from "./api-hooks";

// Import types from generated models
import type { AgentRead, AgentCreate } from "@/api/generated/model";

// Re-export all query hooks and keys from api-hooks (they don't need toast wrapping)
export {
  useListAgentRoles,
  useGetModelDefaults,
  useGetPlanning,
  useListChatSessions,
  useGetChatSession,
  useListChatMessages,
  useDiscoverAgents,
  useListGatewayModels,
  agentRolesQueryKey,
  modelDefaultsQueryKey,
  gatewayModelsQueryKey,
  planningQueryKey,
  chatSessionsQueryKey,
  chatMessagesQueryKey,
  discoveredAgentsQueryKey,
} from "./api-hooks";

// Re-export all types from api-hooks
export type {
  AgentRoleRead,
  AgentRoleCreate,
  AgentRoleUpdate,
  ModelDefaultsRead,
  ModelDefaultsUpdate,
  GatewayModelInfo,
  PlanningQuestionRead,
  PlanningSessionRead,
  ChatMessageRead,
  ChatSessionRead,
  ChatSessionCreate,
  ChatMessageCreate,
  DiscoveredAgent,
  ImportAgentEntry,
  ImportAgentsResponse,
} from "./api-hooks";

// ── Types ────────────────────────────────────────────────────────────────────

type ApiResponse<T> = { data: T; status: number };

// ── Agent Roles ──────────────────────────────────────────────────────────────

export type UseCreateAgentRoleWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<AgentRoleRead>, ApiError, AgentRoleCreate>
> &
  ToastMessages;

export function useCreateAgentRoleWithToast(
  options?: UseCreateAgentRoleWithToastOptions,
): UseMutationResult<ApiResponse<AgentRoleRead>, ApiError, AgentRoleCreate> {
  return useMutationWithToast<ApiResponse<AgentRoleRead>, ApiError, AgentRoleCreate>({
    ...options,
    mutationFn: (data) =>
      fetch("/api/v1/agent-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Agent role created",
    errorMessage: options?.errorMessage ?? "Failed to create agent role",
  });
}

export type UseUpdateAgentRoleWithToastOptions = Partial<
  UseMutationOptions<
    ApiResponse<AgentRoleRead>,
    ApiError,
    { roleId: string; data: AgentRoleUpdate }
  >
> &
  ToastMessages;

export function useUpdateAgentRoleWithToast(
  options?: UseUpdateAgentRoleWithToastOptions,
): UseMutationResult<
  ApiResponse<AgentRoleRead>,
  ApiError,
  { roleId: string; data: AgentRoleUpdate }
> {
  return useMutationWithToast<
    ApiResponse<AgentRoleRead>,
    ApiError,
    { roleId: string; data: AgentRoleUpdate }
  >({
    ...options,
    mutationFn: ({ roleId, data }) =>
      fetch(`/api/v1/agent-roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Agent role updated",
    errorMessage: options?.errorMessage ?? "Failed to update agent role",
  });
}

export type UseDeleteAgentRoleWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<{ ok: boolean }>, ApiError, string>
> &
  ToastMessages;

export function useDeleteAgentRoleWithToast(
  options?: UseDeleteAgentRoleWithToastOptions,
): UseMutationResult<ApiResponse<{ ok: boolean }>, ApiError, string> {
  return useMutationWithToast<ApiResponse<{ ok: boolean }>, ApiError, string>({
    ...options,
    mutationFn: (roleId) =>
      fetch(`/api/v1/agent-roles/${roleId}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Agent role deleted",
    errorMessage: options?.errorMessage ?? "Failed to delete agent role",
  });
}

// ── Model Defaults ───────────────────────────────────────────────────────────

export type UseUpdateModelDefaultsWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<ModelDefaultsRead>, ApiError, ModelDefaultsUpdate>
> &
  ToastMessages;

export function useUpdateModelDefaultsWithToast(
  options?: UseUpdateModelDefaultsWithToastOptions,
): UseMutationResult<ApiResponse<ModelDefaultsRead>, ApiError, ModelDefaultsUpdate> {
  return useMutationWithToast<ApiResponse<ModelDefaultsRead>, ApiError, ModelDefaultsUpdate>({
    ...options,
    mutationFn: (data) =>
      fetch("/api/v1/model-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Model defaults updated",
    errorMessage: options?.errorMessage ?? "Failed to update model defaults",
  });
}

// ── Planning ─────────────────────────────────────────────────────────────────

export type UseStartPlanningWithToastOptions = Partial<
  UseMutationOptions<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; gatewayId: string }
  >
> &
  ToastMessages;

export function useStartPlanningWithToast(
  options?: UseStartPlanningWithToastOptions,
): UseMutationResult<
  ApiResponse<PlanningSessionRead>,
  ApiError,
  { taskId: string; gatewayId: string }
> {
  return useMutationWithToast<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; gatewayId: string }
  >({
    ...options,
    mutationFn: ({ taskId, gatewayId }) =>
      fetch(`/api/v1/tasks/${taskId}/planning/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gateway_id: gatewayId }),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Planning session started",
    errorMessage: options?.errorMessage ?? "Failed to start planning session",
  });
}

export type UseSubmitPlanningAnswerWithToastOptions = Partial<
  UseMutationOptions<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; answer: string }
  >
> &
  ToastMessages;

export function useSubmitPlanningAnswerWithToast(
  options?: UseSubmitPlanningAnswerWithToastOptions,
): UseMutationResult<
  ApiResponse<PlanningSessionRead>,
  ApiError,
  { taskId: string; answer: string }
> {
  return useMutationWithToast<
    ApiResponse<PlanningSessionRead>,
    ApiError,
    { taskId: string; answer: string }
  >({
    ...options,
    mutationFn: ({ taskId, answer }) =>
      fetch(`/api/v1/tasks/${taskId}/planning/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Answer submitted",
    errorMessage: options?.errorMessage ?? "Failed to submit answer",
  });
}

export type UseCancelPlanningWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<{ ok: boolean }>, ApiError, string>
> &
  ToastMessages;

export function useCancelPlanningWithToast(
  options?: UseCancelPlanningWithToastOptions,
): UseMutationResult<ApiResponse<{ ok: boolean }>, ApiError, string> {
  return useMutationWithToast<ApiResponse<{ ok: boolean }>, ApiError, string>({
    ...options,
    mutationFn: (taskId) =>
      fetch(`/api/v1/tasks/${taskId}/planning`, {
        method: "DELETE",
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Planning session cancelled",
    errorMessage: options?.errorMessage ?? "Failed to cancel planning session",
  });
}

export type UseApprovePlanningWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<PlanningSessionRead>, ApiError, string>
> &
  ToastMessages;

export function useApprovePlanningWithToast(
  options?: UseApprovePlanningWithToastOptions,
): UseMutationResult<ApiResponse<PlanningSessionRead>, ApiError, string> {
  return useMutationWithToast<ApiResponse<PlanningSessionRead>, ApiError, string>({
    ...options,
    mutationFn: (taskId) =>
      fetch(`/api/v1/tasks/${taskId}/planning/approve`, {
        method: "POST",
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Planning approved",
    errorMessage: options?.errorMessage ?? "Failed to approve planning",
  });
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type UseCreateChatSessionWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<ChatSessionRead>, ApiError, ChatSessionCreate>
> &
  ToastMessages;

export function useCreateChatSessionWithToast(
  options?: UseCreateChatSessionWithToastOptions,
): UseMutationResult<ApiResponse<ChatSessionRead>, ApiError, ChatSessionCreate> {
  return useMutationWithToast<ApiResponse<ChatSessionRead>, ApiError, ChatSessionCreate>({
    ...options,
    mutationFn: (data) =>
      fetch("/api/v1/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Chat session created",
    errorMessage: options?.errorMessage ?? "Failed to create chat session",
  });
}

export type UseSendChatMessageWithToastOptions = Partial<
  UseMutationOptions<
    ApiResponse<ChatMessageRead>,
    ApiError,
    { sessionId: string; content: string }
  >
> &
  ToastMessages;

export function useSendChatMessageWithToast(
  options?: UseSendChatMessageWithToastOptions,
): UseMutationResult<
  ApiResponse<ChatMessageRead>,
  ApiError,
  { sessionId: string; content: string }
> {
  return useMutationWithToast<
    ApiResponse<ChatMessageRead>,
    ApiError,
    { sessionId: string; content: string }
  >({
    ...options,
    mutationFn: ({ sessionId, content }) =>
      fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Message sent",
    errorMessage: options?.errorMessage ?? "Failed to send message",
  });
}

export type UsePollAgentResponseWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<ChatMessageRead | null>, ApiError, string>
> &
  ToastMessages;

export function usePollAgentResponseWithToast(
  options?: UsePollAgentResponseWithToastOptions,
): UseMutationResult<ApiResponse<ChatMessageRead | null>, ApiError, string> {
  return useMutationWithToast<ApiResponse<ChatMessageRead | null>, ApiError, string>({
    ...options,
    mutationFn: (sessionId) =>
      fetch(`/api/v1/chat/sessions/${sessionId}/poll`, {
        method: "POST",
      }).then((res) => res.json()),
    successMessage: options?.successMessage,
    errorMessage: options?.errorMessage ?? "Failed to poll for response",
  });
}

export type UseArchiveChatSessionWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<void>, ApiError, string>
> &
  ToastMessages;

export function useArchiveChatSessionWithToast(
  options?: UseArchiveChatSessionWithToastOptions,
): UseMutationResult<ApiResponse<void>, ApiError, string> {
  return useMutationWithToast<ApiResponse<void>, ApiError, string>({
    ...options,
    mutationFn: (sessionId) =>
      fetch(`/api/v1/chat/sessions/${sessionId}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Chat session archived",
    errorMessage: options?.errorMessage ?? "Failed to archive chat session",
  });
}

// ── Agents ───────────────────────────────────────────────────────────────────

export type UseCreateAgentWithToastOptions = Partial<
  UseMutationOptions<ApiResponse<AgentRead>, ApiError, { data: AgentCreate }>
> &
  ToastMessages;

export function useCreateAgentWithToast(
  options?: UseCreateAgentWithToastOptions,
): UseMutationResult<ApiResponse<AgentRead>, ApiError, { data: AgentCreate }> {
  return useMutationWithToast<ApiResponse<AgentRead>, ApiError, { data: AgentCreate }>({
    ...options,
    mutationFn: ({ data }) =>
      fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Agent created",
    errorMessage: options?.errorMessage ?? "Failed to create agent",
  });
}

// ── Agent Discovery ──────────────────────────────────────────────────────────

export type UseImportAgentsWithToastOptions = Partial<
  UseMutationOptions<
    ApiResponse<ImportAgentsResponse>,
    ApiError,
    { gatewayId: string; agents: ImportAgentEntry[] }
  >
> &
  ToastMessages;

export function useImportAgentsWithToast(
  options?: UseImportAgentsWithToastOptions,
): UseMutationResult<
  ApiResponse<ImportAgentsResponse>,
  ApiError,
  { gatewayId: string; agents: ImportAgentEntry[] }
> {
  return useMutationWithToast<
    ApiResponse<ImportAgentsResponse>,
    ApiError,
    { gatewayId: string; agents: ImportAgentEntry[] }
  >({
    ...options,
    mutationFn: ({ gatewayId, agents }) =>
      fetch(`/api/v1/gateways/${gatewayId}/import-agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agents }),
      }).then((res) => res.json()),
    successMessage: options?.successMessage ?? "Agents imported",
    errorMessage: options?.errorMessage ?? "Failed to import agents",
  });
}
