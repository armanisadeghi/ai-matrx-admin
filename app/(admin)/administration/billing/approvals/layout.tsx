"use client";

// Billing › Spend approvals. The list lives in this LAYOUT so it survives moving between records:
// at /approvals it is the full table; on a record route (/approvals/<kind>/<subjectId>) the same
// list, with the same search, filters and sort, becomes the page's sidebar and the record takes
// the rest (Arman, 2026-10-17). Rows are read once here and shared with the record page.
import { Suspense, type ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";
import { ListDetailSplit } from "@/components/official/side-panel/ListDetailSplit";
import { SpendApprovalsBoard } from "@/features/admin/spend-approvals/SpendApprovalsBoard";
import { SpendApprovalsProvider, useSpendApprovalsData } from "@/features/admin/spend-approvals/useSpendApprovalsData";
import { useApprovalIdLink } from "@/features/admin/spend-approvals/useApprovalIdLink";
import { SUBJECT_KIND_LABEL, type ApprovalSubject, type ApprovalSubjectKind } from "@/features/admin/spend-approvals/spendApprovals";

function ApprovalIdLink() {
  const { rows, loading } = useSpendApprovalsData(null);
  useApprovalIdLink({ rows, loading, seat: "admin" });
  return null;
}

function SpendApprovalsSplit({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const [kind, subjectId] = segments;
  const activeSubject: ApprovalSubject | null =
    kind && subjectId && kind in SUBJECT_KIND_LABEL ? { kind: kind as ApprovalSubjectKind, id: decodeURIComponent(subjectId) } : null;
  return (
    <ListDetailSplit
      panelId="spend-approval-record"
      open={activeSubject !== null}
      aria-label="Spend approval"
      sizes={{ defaultPx: 1040, minPx: 560, maxPx: 1600 }}
      maxShare={0.78}
      listClassName={activeSubject ? "p-2" : "p-3"}
      list={
        <SpendApprovalsBoard
          orgId={null}
          seat="admin"
          presentation={activeSubject ? "list" : "table"}
          activeSubject={activeSubject}
        />
      }
      detail={activeSubject ? children : null}
    />
  );
}

export default function SpendApprovalsLayout({ children }: { children: ReactNode }) {
  return (
    <SpendApprovalsProvider orgId={null}>
      <Suspense fallback={<div className="m-3 h-96 animate-pulse rounded-md bg-muted/50" />}>
        <ApprovalIdLink />
        <SpendApprovalsSplit>{children}</SpendApprovalsSplit>
      </Suspense>
    </SpendApprovalsProvider>
  );
}
