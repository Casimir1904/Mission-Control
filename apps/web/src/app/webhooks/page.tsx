import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";
import { Webhook, Plus } from "lucide-react";

export default function WebhooksPage() {
  return (
    <DashboardShell>
      <PageHeader
        title="Webhooks"
        description="Manage inbound and outbound webhook integrations"
        action={
          <Button asChild>
            <Link href="/webhooks/new">
              <Plus size={16} aria-hidden="true" />
              Add Webhook
            </Link>
          </Button>
        }
      />
      <EmptyState
        icon={Webhook}
        title="No webhooks configured"
        description="Webhooks let external systems trigger board events or receive notifications when things happen. Add one to connect your workflow."
        action={
          <Button asChild>
            <Link href="/webhooks/new">
              <Plus size={16} aria-hidden="true" />
              Add Webhook
            </Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
