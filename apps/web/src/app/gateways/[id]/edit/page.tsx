"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { GatewayForm } from "@/components/gateways/gateway-form";
import { useGateway, useUpdateGateway } from "@/lib/api/hooks";

export default function EditGatewayPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: gateway, isLoading } = useGateway(id);
  const updateGateway = useUpdateGateway();

  const handleSubmit = useCallback(
    (data: {
      name: string;
      url: string;
      auth_token?: string;
      allow_insecure_tls: boolean;
    }) => {
      updateGateway.mutate(
        { id, data },
        {
          onSuccess: () => {
            router.push(`/gateways/${id}`);
          },
        }
      );
    },
    [id, updateGateway, router]
  );

  if (isLoading) {
    return (
      <DashboardShell>
        <PageHeader
          title=""
          breadcrumbs={[
            { label: "Gateways", href: "/gateways" },
            { label: "Loading..." },
          ]}
        />
        <div className="mx-auto max-w-lg space-y-space-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </DashboardShell>
    );
  }

  if (!gateway) {
    return (
      <DashboardShell>
        <PageHeader
          title="Gateway Not Found"
          breadcrumbs={[
            { label: "Gateways", href: "/gateways" },
            { label: "Not Found" },
          ]}
        />
        <p className="text-sm text-text-secondary">
          This gateway does not exist or has been removed.
        </p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <PageHeader
        title={`Edit ${gateway.name}`}
        description="Update gateway configuration"
        breadcrumbs={[
          { label: "Gateways", href: "/gateways" },
          { label: gateway.name, href: `/gateways/${id}` },
          { label: "Edit" },
        ]}
      />
      <div className="mx-auto max-w-lg">
        <GatewayForm
          initialData={{
            name: gateway.name,
            url: gateway.url,
            allow_insecure_tls: gateway.allow_insecure_tls,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/gateways/${id}`)}
          isSubmitting={updateGateway.isPending}
          submitLabel="Save Changes"
        />
      </div>
    </DashboardShell>
  );
}
