import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Calendar"
        description="See your operations across time — tasks, recurring jobs, approvals, and milestones."
      />
      <EmptyState
        icon={CalendarDays}
        title="No events scheduled"
        description="Tasks with due dates, recurring jobs, and approval deadlines will appear here. Create a task with a due date to get started."
        action={
          <Button asChild>
            <Link href="/tasks">Create Task</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
