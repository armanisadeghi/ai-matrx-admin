"use client";

// record-view: SubjectApprovalsPanel — one subject's spend approval by kind + id, for every kind
// (agent, mandate, workflow, Agent Factory door, coding session, scheduled task, trigger).
// Agents, mandates and workflows also have it as a tab on their own pages.
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SubjectApprovalsPanel } from "@/features/admin/spend-approvals/SubjectApprovalsPanel";
import {
  SPEND_APPROVALS_ADMIN_PATH,
  SUBJECT_KIND_LABEL,
  type ApprovalSubjectKind,
} from "@/features/admin/spend-approvals/spendApprovals";

export default function SpendApprovalSubjectRoute() {
  const params = useParams();
  const kind = String(params.kind ?? "");
  const subjectId = decodeURIComponent(String(params.subjectId ?? ""));
  return (
    <div className="flex flex-col gap-2 p-3">
      <Link
        href={SPEND_APPROVALS_ADMIN_PATH}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Spend approvals
      </Link>
      {kind in SUBJECT_KIND_LABEL ? (
        <SubjectApprovalsPanel subject={{ kind: kind as ApprovalSubjectKind, id: subjectId }} seat="admin" />
      ) : (
        <div className="text-sm text-muted-foreground">Unknown approval type: {kind}</div>
      )}
    </div>
  );
}
