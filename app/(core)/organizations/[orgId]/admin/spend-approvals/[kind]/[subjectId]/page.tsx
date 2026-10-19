"use client";

// record-view: none — a spend approval (billing.run_approval) takes no custom fields
// SubjectApprovalsPanel — one subject's spend approval on this organization's seat.
// Route: /organizations/[orgId]/admin/spend-approvals/[kind]/[subjectId]  ([orgId] = slug or UUID)
import { useParams } from "next/navigation";
import { OrgSubjectApprovals } from "@/features/admin/spend-approvals/OrgSubjectApprovals";
import { SUBJECT_KIND_LABEL, type ApprovalSubjectKind } from "@/features/admin/spend-approvals/spendApprovals";

export default function OrgSpendApprovalSubjectPage() {
  const params = useParams();
  const kind = String(params.kind ?? "");
  const subjectId = decodeURIComponent(String(params.subjectId ?? ""));
  if (!(kind in SUBJECT_KIND_LABEL)) {
    return <div className="p-4 text-sm text-muted-foreground">Unknown approval type: {kind}</div>;
  }
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
      <OrgSubjectApprovals
        orgIdParam={params.orgId as string}
        subject={{ kind: kind as ApprovalSubjectKind, id: subjectId }}
      />
    </div>
  );
}
