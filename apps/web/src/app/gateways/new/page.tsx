"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { GatewayForm } from "@/components/gateways/gateway-form";
import { useCreateGateway } from "@/lib/api/hooks";

export default function NewGatewayPage() {
  const router = useRouter();
  const createGateway = useCreateGateway();

  const handleSubmit = useCallback(
    (data: {
      name: string;
      url: string;
      auth_token?: string;
      allow_insecure_tls: boolean;
    }) => {
      createGateway.mutate(data, {
        onSuccess: (gw) => {
          router.push(`/gateways/${gw.id}`);
        },
      });
    },
    [createGateway, router]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Add Gateway"
        description="Connect a new gateway to bring agents online"
        breadcrumbs={[
          { label: "Gateways", href: "/gateways" },
          { label: "Add Gateway" },
        ]}
      />
      <div className="mx-auto max-w-lg">
        <GatewayForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/gateways")}
          isSubmitting={createGateway.isPending}
        />
      </div>
    </DashboardShell>
  );
}
