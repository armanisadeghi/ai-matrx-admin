"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWorkflowWithFetch } from "@/features/old-deprecated-workflow-system-do-not-use/workflows/hooks/useWorkflowData";
import { WorkflowData } from "@/types/customWorkflowTypes";

export default function WorkflowManagerPage() {
    const {
        workflowRecords,
        workflowIsLoading,
        workflowIsError,
    } = useWorkflowWithFetch();

    // Filter out deleted workflows and convert to array
    const activeWorkflows = useMemo(() => {
        return Object.values(workflowRecords).filter((workflow: WorkflowData) => 
            !workflow.isDeleted
        );
    }, [workflowRecords]);

    if (workflowIsError) {
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

    if (!workflowIsLoading && activeWorkflows.length === 0) {
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
            <div className="mb-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Workflows ({activeWorkflows.length})
                </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {activeWorkflows.map((workflow) => (
                    <WorkflowCard key={workflow.id} workflow={workflow} />
                ))}
            </div>
        </div>
    );
}

interface WorkflowCardProps {
    workflow: WorkflowData;
}

function WorkflowCard({ workflow }: WorkflowCardProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // Extract metrics from backend workflow
    const workflowMetrics = useMemo(() => {
        if (!workflow.backendWorkflow || typeof workflow.backendWorkflow !== 'object') {
            return null;
        }

        const backendData = workflow.backendWorkflow as any;
        const steps = backendData.steps || [];
        const userInputs = backendData.user_inputs || [];
        
        // Count step statuses
        const statusCounts = steps.reduce((acc: Record<string, number>, step: any) => {
            const status = step.status || 'unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalSteps: steps.length,
            userInputs: userInputs.length,
            statusCounts,
            hasRelays: !!(backendData.workflow_relays?.simple_relays?.length || 
                          backendData.workflow_relays?.relay_chains?.length ||
                          backendData.workflow_relays?.bidirectional_relays?.length)
        };
    }, [workflow.backendWorkflow]);

    const description = workflow.description || 'No description provided';
    const shouldTruncate = description.length > 150;
    const displayDescription = shouldTruncate && !isDescriptionExpanded 
        ? description.substring(0, 150) + '...' 
        : description;

    const handleDescriptionClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    return (
        <Link href={`/tests/workflows/workflow-review/${workflow.id}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 p-6 h-full cursor-pointer group">
                <div className="flex flex-col h-full">
                    {/* Header with status indicator */}
                    <div className="flex items-center justify-between mb-3">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            workflow.isActive 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        }`}>
                            {workflow.isActive ? 'Active' : 'Inactive'}
                        </div>
                        {workflow.isPublic && (
                            <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                Public
                            </div>
                        )}
                    </div>

                    {/* Workflow name */}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {workflow.name || 'Untitled Workflow'}
                    </h3>

                    {/* Workflow metrics */}
                    {workflowMetrics && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">
                                {workflowMetrics.totalSteps} steps
                            </div>
                            {workflowMetrics.userInputs > 0 && (
                                <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900 rounded text-xs text-purple-700 dark:text-purple-300">
                                    {workflowMetrics.userInputs} inputs
                                </div>
                            )}
                            {workflowMetrics.hasRelays && (
                                <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900 rounded text-xs text-orange-700 dark:text-orange-300">
                                    relays
                                </div>
                            )}
                            {workflowMetrics.statusCounts.completed > 0 && (
                                <div className="px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-xs text-green-700 dark:text-green-300">
                                    {workflowMetrics.statusCounts.completed} done
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div className="flex-grow mb-4">
                        <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                            {displayDescription}
                        </p>
                        {shouldTruncate && (
                            <button
                                onClick={handleDescriptionClick}
                                className="text-blue-600 dark:text-blue-400 text-xs hover:text-blue-700 dark:hover:text-blue-300 mt-1 font-medium"
                            >
                                {isDescriptionExpanded ? 'Show less' : 'Show more'}
                            </button>
                        )}
                    </div>

                    {/* Footer metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span>v{workflow.version || 1}</span>
                        {workflow.updatedAt && (
                            <span>
                                Updated {new Date(workflow.updatedAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
