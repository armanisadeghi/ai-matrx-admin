"use client";

// One subject's spend approval on an organization's own seat: its admins see and decide it
// (billing.run_approval_list(p_org_id) refuses everyone else; OrgAdminBoundary says so).
import { OrgAdminBoundary } from "@/features/organizations/admin/components/OrgAdminBoundary";
import { SubjectApprovalsPanel } from "./SubjectApprovalsPanel";
import type { ApprovalSubject } from "./spendApprovals";

export function OrgSubjectApprovals({ orgIdParam, subject }: { orgIdParam: string | null; subject: ApprovalSubject }) {
  if (!orgIdParam) return <div className="p-3 text-sm text-muted-foreground">No organization</div>;
  return (
    <OrgAdminBoundary orgIdParam={orgIdParam}>
      {({ orgId, organization }) => (
        <SubjectApprovalsPanel subject={subject} seat="org" orgId={orgId} orgSlug={organization.slug} />
      )}
    </OrgAdminBoundary>
  );
}
