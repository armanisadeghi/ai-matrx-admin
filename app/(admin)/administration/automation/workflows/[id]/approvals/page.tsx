// record-view: none — a spend approval (billing.run_approval) takes no custom fields
// SubjectApprovalsPanel — one workflow's spend approval: status, decision history,
// held runs, spend (Arman 2026-10-16).
import Link from "@/components/navigation/AppLink";
import { ArrowLeft } from "lucide-react";
import { WorkflowApprovalsSurface } from "@/features/admin/spend-approvals/WorkflowApprovalsSurface";

export const metadata = { title: "Workflow Approvals | Admin" };

export default async function AdminWorkflowApprovalsRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-2 p-3">
      <Link
        href={`/administration/automation/workflows/${id}`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Workflow
      </Link>
      <WorkflowApprovalsSurface workflowId={id} />
    </div>
  );
}
