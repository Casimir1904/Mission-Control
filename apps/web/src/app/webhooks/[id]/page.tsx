"use client";

import { use } from "react";
import Link from "next/link";
import { Webhook } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/status/empty-state";
import { Button } from "@/components/ui/button";

export default function WebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <DashboardShell>
      <PageHeader
        title="Webhook Details"
        breadcrumbs={[
          { label: "Webhooks", href: "/webhooks" },
          { label: id },
        ]}
      />

      <EmptyState
        icon={Webhook}
        title="Webhook details coming soon"
        description="Webhook detail view and configuration management will be available in a future update."
        action={
          <Button asChild>
            <Link href="/webhooks">Back to Webhooks</Link>
          </Button>
        }
      />
    </DashboardShell>
  );
}
