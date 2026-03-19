"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NewWebhookPage() {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("");
  const [active, setActive] = useState(true);

  return (
    <DashboardShell>
      <PageHeader
        title="Add Webhook"
        description="Configure a new webhook integration"
        breadcrumbs={[
          { label: "Webhooks", href: "/webhooks" },
          { label: "Add Webhook" },
        ]}
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-space-4">
          <div className="mb-space-4 flex items-center gap-space-2">
            <Badge variant="neutral">Coming Soon</Badge>
            <span className="text-sm text-text-muted">
              Webhook CRUD is not fully wired yet. This form is a preview.
            </span>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-space-4"
          >
            {/* Name */}
            <div className="space-y-space-1">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Slack Notifications"
                autoFocus
              />
            </div>

            {/* URL */}
            <div className="space-y-space-1">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.example.com/webhook"
              />
            </div>

            {/* Events */}
            <div className="space-y-space-1">
              <Label htmlFor="webhook-events">
                Events
                <span className="ml-space-1 text-xs text-text-muted">
                  (comma-separated)
                </span>
              </Label>
              <Input
                id="webhook-events"
                value={events}
                onChange={(e) => setEvents(e.target.value)}
                placeholder="task.created, task.completed, agent.offline"
              />
            </div>

            {/* Active */}
            <label
              htmlFor="webhook-active"
              className="flex cursor-pointer items-center gap-space-2"
            >
              <input
                id="webhook-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-border-default bg-bg-base text-accent-primary focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-bg-base"
              />
              <span className="text-sm text-text-secondary">
                Active
              </span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-space-3 pt-space-2">
              <Button type="submit" disabled>
                Create Webhook
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/webhooks">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
