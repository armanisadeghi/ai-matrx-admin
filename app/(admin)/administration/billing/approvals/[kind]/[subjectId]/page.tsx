"use client";

// record-view: none — a spend approval (billing.run_approval) takes no custom fields
// ApprovalRecordView — one subject's spend approval by kind + id, for every kind
// (agent, mandate, workflow, Agent Factory door, coding session, scheduled task, trigger), drawn
// beside the approvals list (../../layout.tsx). Agents, mandates and workflows also have it as a
// tab on their own pages (SubjectApprovalsPanel).
import { useParams } from "next/navigation";
import { EmptyState } from "@ai-matrx/design-system/controls";
import { ApprovalRecordView } from "@/features/admin/spend-approvals/ApprovalRecordView";
import { SUBJECT_KIND_LABEL, type ApprovalSubjectKind } from "@/features/admin/spend-approvals/spendApprovals";

export default function SpendApprovalSubjectRoute() {
  const params = useParams();
  const kind = String(params.kind ?? "");
  const subjectId = decodeURIComponent(String(params.subjectId ?? ""));
  return (
    <div className="h-full min-h-0 overflow-y-auto" data-matrx-page-scroll="">
      {kind in SUBJECT_KIND_LABEL ? (
        <ApprovalRecordView subject={{ kind: kind as ApprovalSubjectKind, id: subjectId }} seat="admin" />
      ) : (
        <EmptyState icon={null} title="Unknown approval type" line={kind} />
      )}
    </div>
  );
}
