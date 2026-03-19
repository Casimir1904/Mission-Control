"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ListTodo, Brain, Settings, Plus, MoreHorizontal, Trash2, Archive, MessageCircle, Crown } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/status/status-dot";
import { EmptyState } from "@/components/status/empty-state";
import { KanbanBoard } from "@/components/boards/kanban-board";
import { ChatPanel } from "@/components/chat/chat-panel";
import { LeadAgentSelector, LeadAgentBadge } from "@/components/boards/lead-agent-selector";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  useBoard,
  useTasksByBoard,
  useAgentsByBoard,
  useDeleteBoard,
  useBoardSessions,
} from "@/lib/api/hooks";
import type { Agent, TaskStatus } from "@/lib/api/types";

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const { data: board, isLoading: boardLoading } = useBoard(id);
  const { data: tasksData, isLoading: tasksLoading } = useTasksByBoard(id);
  const { data: agentsData, isLoading: agentsLoading } = useAgentsByBoard(id);
  const { data: chatSessions = [] } = useBoardSessions(id);
  const deleteBoard = useDeleteBoard();

  const activeChatCount = chatSessions.filter((s) => s.status === "active").length;

  const tasks = tasksData?.items ?? [];
  const agents = agentsData?.items ?? [];

  function handleDeleteBoard() {
    if (!board) return;
    deleteBoard.mutate(board.id, {
      onSuccess: () => router.push("/boards"),
    });
  }

  function handleCreateTaskWithStatus(status: TaskStatus) {
    router.push(`/tasks/new?board_id=${id}&status=${status}` as never);
  }

  if (boardLoading) {
    return (
      <DashboardShell>
        <div className="space-y-space-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!board) {
    return (
      <DashboardShell>
        <EmptyState
          icon={ListTodo}
          title="Board not found"
          description="This board may have been deleted or you may not have access."
          action={
            <Button asChild>
              <Link href="/boards">Back to Boards</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={board.name}
        description={board.description}
        breadcrumbs={[
          { label: "Boards", href: "/boards" },
          { label: board.name },
        ]}
        action={
          <div className="flex items-center gap-space-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatOpen(true)}
              className="relative"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Chat
              {activeChatCount > 0 && (
                <Badge
                  variant="info"
                  className="ml-space-1 h-4 min-w-[16px] px-1 text-[10px]"
                >
                  {activeChatCount}
                </Badge>
              )}
            </Button>
            <Button asChild size="sm">
              <Link href={`/tasks/new?board_id=${id}` as never}>
                <Plus size={14} aria-hidden="true" />
                Create Task
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/agents/new?board_id=${id}` as never}>
                <Plus size={14} aria-hidden="true" />
                Add Agent
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Board actions">
                  <MoreHorizontal size={16} aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/boards/${id}/edit` as never)
                  }
                >
                  <Settings size={14} aria-hidden="true" />
                  Edit Board
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive size={14} aria-hidden="true" />
                  Archive Board
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-status-critical focus:text-status-critical"
                  onClick={handleDeleteBoard}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Delete Board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="flex items-center gap-space-4 pb-space-4">
        <Badge variant={board.status === "active" ? "healthy" : "neutral"}>
          {board.status}
        </Badge>
        {board.lead_agent_id && (() => {
          const leadAgent = agents.find((a) => a.id === board.lead_agent_id);
          return leadAgent ? (
            <LeadAgentBadge agentName={leadAgent.name} />
          ) : null;
        })()}
        <span className="text-sm text-text-secondary">
          <span className="font-mono tabular-nums">{agents.length}</span> agents
        </span>
        <span className="text-sm text-text-secondary">
          <span className="font-mono tabular-nums">{tasks.length}</span> tasks
        </span>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">
            <ListTodo size={14} className="mr-space-1" aria-hidden="true" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Bot size={14} className="mr-space-1" aria-hidden="true" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="memory">
            <Brain size={14} className="mr-space-1" aria-hidden="true" />
            Memory
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={14} className="mr-space-1" aria-hidden="true" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Tasks tab -- Kanban */}
        <TabsContent value="tasks">
          {tasks.length === 0 && !tasksLoading ? (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Create a task to give your agents something to work on."
              action={
                <Button asChild>
                  <Link href={`/tasks/new?board_id=${id}` as never}>
                    <Plus size={16} aria-hidden="true" />
                    Create Task
                  </Link>
                </Button>
              }
            />
          ) : (
            <KanbanBoard
              tasks={tasks}
              isLoading={tasksLoading}
              onTaskClick={(task) => router.push(`/tasks/${task.id}` as never)}
              onCreateTask={handleCreateTaskWithStatus}
            />
          )}
        </TabsContent>

        {/* Agents tab */}
        <TabsContent value="agents">
          {agents.length === 0 && !agentsLoading ? (
            <EmptyState
              icon={Bot}
              title="No agents assigned"
              description="Add an agent to this board so they can start working on tasks."
              action={
                <Button asChild>
                  <Link href={`/agents/new?board_id=${id}` as never}>
                    <Plus size={16} aria-hidden="true" />
                    Add Agent
                  </Link>
                </Button>
              }
            />
          ) : (
            <AgentsTable agents={agents} isLoading={agentsLoading} leadAgentId={board.lead_agent_id} />
          )}
        </TabsContent>

        {/* Memory tab */}
        <TabsContent value="memory">
          <EmptyState
            icon={Brain}
            title="Board memory"
            description="Board memory and context will be available here in a future update."
          />
        </TabsContent>

        {/* Settings tab */}
        <TabsContent value="settings">
          <div className="max-w-xl space-y-space-6">
            <LeadAgentSelector
              boardId={id}
              agents={agents}
              currentLeadId={board.lead_agent_id}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ChatPanel
        boardId={id}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </DashboardShell>
  );
}

function AgentsTable({
  agents,
  isLoading,
  leadAgentId,
}: {
  agents: Agent[];
  isLoading: boolean;
  leadAgentId?: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-space-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const statusVariant = (status: Agent["status"]) => {
    switch (status) {
      case "online":
        return "healthy" as const;
      case "degraded":
        return "warning" as const;
      case "offline":
        return "critical" as const;
      case "provisioning":
        return "neutral" as const;
    }
  };

  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Last Seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <StatusDot
                  variant={statusVariant(agent.status)}
                  label={agent.status}
                />
              </TableCell>
              <TableCell className="font-medium">
                <span className="flex items-center gap-space-1">
                  {agent.name}
                  {agent.id === leadAgentId && (
                    <Crown
                      size={12}
                      className="text-accent-primary shrink-0"
                      aria-label="Lead agent"
                    />
                  )}
                </span>
              </TableCell>
              <TableCell className="text-text-secondary">
                {agent.role}
              </TableCell>
              <TableCell className="font-mono text-xs text-text-muted tabular-nums">
                {agent.last_heartbeat
                  ? new Date(agent.last_heartbeat).toLocaleString()
                  : "Never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
