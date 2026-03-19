"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, ListTodo, Brain, Settings, Plus, MoreHorizontal, Trash2, Archive } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/status/status-dot";
import { EmptyState } from "@/components/status/empty-state";
import { KanbanBoard } from "@/components/boards/kanban-board";
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
} from "@/lib/api/hooks";
import type { Agent, TaskStatus } from "@/lib/api/types";

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: board, isLoading: boardLoading } = useBoard(id);
  const { data: tasksData, isLoading: tasksLoading } = useTasksByBoard(id);
  const { data: agentsData, isLoading: agentsLoading } = useAgentsByBoard(id);
  const deleteBoard = useDeleteBoard();

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
            <AgentsTable agents={agents} isLoading={agentsLoading} />
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
          <EmptyState
            icon={Settings}
            title="Board settings"
            description="Board configuration options will be available here in a future update."
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function AgentsTable({
  agents,
  isLoading,
}: {
  agents: Agent[];
  isLoading: boolean;
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
              <TableCell className="font-medium">{agent.name}</TableCell>
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
