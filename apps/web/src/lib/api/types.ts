// ── Entity types matching backend DTOs ──

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  status: "active" | "archived";
  organization_id: string;
  board_group_id?: string;
  agent_count: number;
  task_counts: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  backstory: string;
  goal: string;
  board_id: string;
  board_name?: string;
  gateway_id?: string;
  current_task?: string;
  last_heartbeat?: string;
  created_at: string;
  updated_at: string;
}

export type AgentStatus = "online" | "offline" | "degraded" | "provisioning";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  board_id: string;
  board_name?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  dependencies: string[];
  created_at: string;
  updated_at: string;
}

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "review"
  | "approved"
  | "rejected"
  | "done"
  | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Tag {
  id: string;
  name: string;
  color: string;
  organization_id: string;
}

// ── Pagination ──

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// ── Input types ──

export interface CreateBoardInput {
  name: string;
  description?: string;
  board_group_id?: string;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string;
  status?: "active" | "archived";
}

export interface CreateAgentInput {
  name: string;
  role: string;
  backstory?: string;
  goal?: string;
  board_id: string;
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  backstory?: string;
  goal?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  board_id: string;
  assigned_agent_id?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigned_agent_id?: string | null;
  status?: TaskStatus;
}

export interface TransitionTaskInput {
  status: TaskStatus;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
}

// ── Query params ──

export interface ListParams {
  page?: number;
  per_page?: number;
}

export interface TaskListParams extends ListParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  board_id?: string;
}

export interface AgentListParams extends ListParams {
  board_id?: string;
  status?: AgentStatus;
}

// ── Phase 2: Real-time Operations ──

export interface DashboardOverview {
  agents_by_status: Record<string, number>;
  tasks_by_status: Record<string, number>;
  pending_approvals: number;
  tasks_completed_today: number;
  recent_activity: ActivityEvent[];
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Approval {
  id: string;
  task_id: string;
  task_title?: string;
  board_id?: string;
  board_name?: string;
  status: ApprovalStatus;
  confidence: number;
  rubric_scores: Record<string, number>;
  comment: string;
  submitted_by?: string;
  reviewer_id?: string;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface CreateApprovalInput {
  task_id: string;
  comment: string;
  confidence: number;
  rubric_scores?: Record<string, number>;
}

export interface ReviewApprovalInput {
  status: "approved" | "rejected";
  comment?: string;
  confidence?: number;
  rubric_scores?: Record<string, number>;
}

export interface ActivityListParams extends ListParams {
  entity_type?: string;
  board_id?: string;
}

export interface ApprovalListParams extends ListParams {
  status?: ApprovalStatus;
  board_id?: string;
}

// ── Phase 3: Intelligence Features ──

export interface BoardMemory {
  id: string;
  board_id: string;
  content: string;
  category: string;
  importance: number;
  scope: "agent" | "board" | "group";
  created_at: string;
  updated_at: string;
}

export interface CreateMemoryInput {
  board_id: string;
  content: string;
  category: string;
  importance: number;
  scope: "agent" | "board" | "group";
}

export interface UpdateMemoryInput {
  content?: string;
  category?: string;
  importance?: number;
}

export interface MemoryListParams extends ListParams {
  search?: string;
  category?: string;
  scope?: "agent" | "board" | "group";
  board_id?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  channel: "in_app" | "webhook";
  created_at: string;
}

export interface NotificationListParams extends ListParams {
  read?: boolean;
}

export interface CostRecord {
  id: string;
  amount: number;
  token_count: number;
  model: string;
  agent_id: string;
  board_id: string;
  period: string;
  created_at: string;
}

export interface CreateCostRecordInput {
  amount: number;
  token_count: number;
  model: string;
  agent_id: string;
  board_id: string;
  period: string;
}

export interface CostSummary {
  total_cost: number;
  total_tokens: number;
  cost_by_agent: Record<string, number>;
  cost_by_model: Record<string, number>;
  cost_by_board: Record<string, number>;
  daily_trend: CostDailyTrend[];
}

export interface CostDailyTrend {
  date: string;
  total_cost: number;
  token_count: number;
}

export interface CostSummaryParams {
  board_id?: string;
  days?: number;
}

export interface CostListParams extends ListParams {
  board_id?: string;
  agent_id?: string;
}

export interface Trace {
  id: string;
  trace_id: string;
  name: string;
  status: string;
  duration_ms: number;
  token_count: number;
  cost: number;
  agent_id: string;
  spans?: Span[];
  created_at: string;
}

export interface Span {
  id: string;
  span_id: string;
  parent_span_id: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  attributes: Record<string, unknown>;
}

export interface TraceListParams extends ListParams {
  agent_id?: string;
  status?: string;
}

export interface Gateway {
  id: string;
  name: string;
  url: string;
  status: "connected" | "disconnected";
  allow_insecure_tls: boolean;
  agent_count: number;
  last_connected_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGatewayInput {
  name: string;
  url: string;
  auth_token?: string;
  allow_insecure_tls?: boolean;
}

export interface UpdateGatewayInput {
  name?: string;
  url?: string;
  auth_token?: string;
  allow_insecure_tls?: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  latency_ms?: number;
  error?: string;
}

export interface SyncResult {
  agents_synced: number;
  errors: string[];
}
