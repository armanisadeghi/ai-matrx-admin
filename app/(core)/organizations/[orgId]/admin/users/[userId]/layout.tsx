// record-view: none — an admin support view; the admin seat never edits an organization's fields
"use client";

// One member's page for an organization's owners and admins — the platform user page's frame and
// tabs scoped to this organization (UserRecordPage with an organization scope → OrgMemberRecord).
// The record lives in THIS layout (keyed by the member), so moving between Overview
// (/organizations/<slug>/admin/users/<id>) and a tab (/<id>/<tab>) never remounts it.

import { useMemo, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { OrgAdminBoundary } from "@/features/organizations/admin/components/OrgAdminBoundary";
import { UserRecordPage } from "@/features/admin/users/record/UserRecordPage";
import type { UserRecordScope } from "@/features/admin/users/record/userSurfaces";
import type { Organization } from "@/features/organizations/types";

function MemberRecord({ orgId, organization, userId }: { orgId: string; organization: Organization; userId: string }) {
  // Stable for the tabs' loaders (each keys its fetch on the scope).
  const scope = useMemo<UserRecordScope>(
    () => ({ kind: "organization", orgId, orgSlug: organization.slug, orgName: organization.name }),
    [orgId, organization.slug, organization.name],
  );
  return <UserRecordPage userId={userId} scope={scope} />;
}

export default function OrgAdminMemberLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgIdParam = params.orgId as string;
  const userId = params.userId as string;
  return (
    <OrgAdminBoundary orgIdParam={orgIdParam}>
      {({ orgId, organization }) => (
        // (core) content scrolls under the shell header; the record frame starts below it.
        <div className="flex h-full flex-col pt-[var(--shell-header-h)]">
          <MemberRecord orgId={orgId} organization={organization} userId={userId} />
          {children}
        </div>
      )}
    </OrgAdminBoundary>
  );
}
