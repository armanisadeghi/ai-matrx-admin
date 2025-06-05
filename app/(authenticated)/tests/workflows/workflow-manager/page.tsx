"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { createWorkflowSelectors } from "@/lib/redux/entity/custom-selectors/workflowSelectors";
import { useWorkflowManager } from "@/features/old-deprecated-workflow-system-do-not-use/workflows/hooks/useWorkflowManager";
import { WorkflowData } from "@/types/customWorkflowTypes";
import { WorkflowCard } from "@/features/old-deprecated-workflow-system-do-not-use/workflows/workflow-manager/common/WorkflowCard";

export default function WorkflowManagerPage() {
    // Use only selectors - no data fetching hooks
    const workflowSelectors = createWorkflowSelectors();
    const allWorkflows = useAppSelector(workflowSelectors.workflowsArray);
    const workflowEntityState = useAppSelector(workflowSelectors.selectWorkflowEntity);

    // Use workflow manager only for actions, not data fetching
    const { workflowManagementActions } = useWorkflowManager();

    // Get loading and error state from Redux
    const isLoading = workflowEntityState?.fetchState?.isLoading || false;
    const isError = workflowEntityState?.fetchState?.isError || false;

    // Filter out deleted workflows
    const activeWorkflows = useMemo(() => {
        return allWorkflows.filter((workflow: WorkflowData) => !workflow.isDeleted);
    }, [allWorkflows]);

    if (isError) {
        return (
            <div className="p-6">
                <div className="text-center py-8">
                    <div className="text-red-600 dark:text-red-400">
                        <p className="text-lg font-semibold">Error loading workflows</p>
                        <p className="text-sm mt-2">Please try refreshing the page</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!isLoading && activeWorkflows.length === 0) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="text-gray-500 dark:text-gray-400">
                        <p className="text-lg font-semibold">No workflows found</p>
                        <p className="text-sm mt-2">Create your first workflow to get started</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Workflows ({activeWorkflows.length})</h1>
                <div className="text-sm text-blue-600 dark:text-blue-400">Enhanced workflow management</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {activeWorkflows.map((workflow) => (
                    <WorkflowCard key={workflow.id} workflow={workflow} onSetActive={workflowManagementActions?.setActiveWorkflow} />
                ))}
            </div>
        </div>
    );
}
