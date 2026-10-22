"use client";

/**
 * `/administration/automation/workflows/[id]/approvals` — the workflow's approvals panel, emitting
 * surface `matrx-admin/workflow-spend-approvals` from the rows the panel reads. Read-only:
 * deciding an approval lets runs spend, so it stays the person's press on the record page.
 */

import { useState } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { ADMIN_WORKFLOW_SPEND_APPROVALS_SURFACE_NAME } from "@/features/surfaces/manifests/admin-spend-approval.manifest";
import { SubjectApprovalsPanel } from "./SubjectApprovalsPanel";
import { spendApprovalSurfaceRow } from "./spendApprovalSurface";
import type { SpendApprovalRow } from "./spendApprovals";

export function WorkflowApprovalsSurface({ workflowId }: { workflowId: string }) {
  const [rows, setRows] = useState<SpendApprovalRow[] | null>(null);
  const getScope = () => {
    const own = (r: SpendApprovalRow) => Number(r.subject_kind === "workflow" && r.subject_id === workflowId);
    return {
      workflow_id: workflowId,
      approvals_load_status: rows ? "loaded" : "loading",
      approvals: rows ? [...rows].sort((a, b) => own(b) - own(a)).map(spendApprovalSurfaceRow) : undefined,
    } as SurfaceScopePayload;
  };
  return (
    <SurfaceRuntimeProvider surfaceName={ADMIN_WORKFLOW_SPEND_APPROVALS_SURFACE_NAME} getScope={getScope}>
      <SubjectApprovalsPanel subject={{ kind: "workflow", id: workflowId }} seat="admin" onRows={setRows} />
    </SurfaceRuntimeProvider>
  );
}
