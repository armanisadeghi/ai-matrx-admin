import { WorkflowDetailContent } from "@/features/workflows/workflow-manager/WorkflowDetailContent";

interface WorkflowDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    return <WorkflowDetailContent workflowId={id} />;
} 