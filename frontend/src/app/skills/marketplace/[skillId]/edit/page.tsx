"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/auth/clerk";

import { DashboardPageLayout } from "@/components/templates/DashboardPageLayout";
import { useOrganizationMembership } from "@/lib/use-organization-membership";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function EditMarketplaceSkillPage() {
  const router = useRouter();
  const params = useParams();
  const skillIdParam = params?.skillId;
  const skillId = Array.isArray(skillIdParam) ? skillIdParam[0] : skillIdParam;
  const { isSignedIn } = useAuth();
  const { isAdmin } = useOrganizationMembership(isSignedIn);

  // Redirect to marketplace list since editing is not implemented
  useEffect(() => {
    router.replace("/skills/marketplace");
  }, [router]);

  return (
    <DashboardPageLayout
      signedOut={{
        message: "Sign in to manage marketplace skills.",
        forceRedirectUrl: `/skills/marketplace/${skillId ?? ""}/edit`,
        signUpForceRedirectUrl: `/skills/marketplace/${skillId ?? ""}/edit`,
      }}
      title="Edit Marketplace Skill"
      description="Update marketplace skill details."
      isAdmin={isAdmin}
      adminOnlyMessage="Only organization owners and admins can manage marketplace skills."
      stickyHeader
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/skills/marketplace">
                Skills Marketplace
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Redirecting to skills marketplace…
      </div>
    </DashboardPageLayout>
  );
}
