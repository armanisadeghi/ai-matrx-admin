"use client";

import { useEffect, useMemo, useState, createContext } from "react";
import { useWorkflowWithFetch } from "../useWorkflowData";
import { WorkflowData, BackendWorkflowData, WorkflowStep } from "../types";
import { WorkflowStepsSection } from "./components/WorkflowStepsSection";
import { UserInputsSection } from "./components/UserInputsSection";
import { WorkflowRelaysSection } from "./components/WorkflowRelaysSection";
import { RawDataSection } from "./components/RawDataSection";

// Context for broker highlighting across all components
export const BrokerHighlightContext = createContext<{
    highlightedBroker: string | null;
    setHighlightedBroker: (brokerId: string | null) => void;
}>({
    highlightedBroker: null,
    setHighlightedBroker: () => {},
});

interface WorkflowDetailContentProps {
    workflowId: string;
}

export function WorkflowDetailContent({ workflowId }: WorkflowDetailContentProps) {
    const [highlightedBroker, setHighlightedBroker] = useState<string | null>(null);
    const { workflowRecords, workflowIsLoading, workflowIsError, fetchWorkflowOneWithFkIfk } = useWorkflowWithFetch();

    // Convert plain ID to recordId format
    const recordId = `id:${workflowId}`;
    const workflow = workflowRecords[recordId] as WorkflowData | undefined;

    useEffect(() => {
        if (!workflow && !workflowIsLoading) {
            fetchWorkflowOneWithFkIfk(recordId);
        }
    }, [recordId, workflow, workflowIsLoading, fetchWorkflowOneWithFkIfk]);

    // Parse backend workflow data with proper typing
    const backendData = useMemo((): BackendWorkflowData | null => {
        if (!workflow?.backendWorkflow || typeof workflow.backendWorkflow !== "object") {
            return null;
        }
        return workflow.backendWorkflow as BackendWorkflowData;
    }, [workflow?.backendWorkflow]);

    const handleUpdatedSteps = (steps: WorkflowStep[]) => {
        console.log('Updated steps:', steps);
    };


    if (workflowIsLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading workflow...</p>
                </div>
            </div>
        );
    }

    if (workflowIsError || !workflow) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 dark:text-red-400 mb-4">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Workflow Not Found</h1>
                    <p className="text-gray-600 dark:text-gray-400">The requested workflow could not be loaded.</p>
                </div>
            </div>
        );
    }

    return (
        <BrokerHighlightContext.Provider value={{ highlightedBroker, setHighlightedBroker }}>
            <div className="flex flex-col min-h-0">
                {/* Compact Header */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{workflow.name || "Untitled Workflow"}</h1>
                            <div
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    workflow.isActive
                                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                                }`}
                            >
                                {workflow.isActive ? "Active" : "Inactive"}
                            </div>
                            {workflow.isPublic && (
                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    Public
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>v{workflow.version || 1}</span>
                            <span>ID: {workflow.id}</span>
                        </div>
                    </div>
                    {workflow.description && <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{workflow.description}</p>}
                </div>
                {/* Main Content - Clean 60/40 split */}
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-5 gap-0 min-h-0">
                    {/* Left Column - Steps (60% of space) */}
                    <div className="xl:col-span-3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
                        <WorkflowStepsSection steps={backendData?.steps || []} onUpdate={handleUpdatedSteps} />
                    </div>

                    {/* Right Column - Sidebar (40% of space) */}
                    <div className="xl:col-span-2 bg-gray-50 dark:bg-gray-900 flex flex-col min-h-0">
                        <div className="p-4 space-y-4 overflow-y-auto flex-1">
                            <UserInputsSection userInputs={backendData?.user_inputs || []} />
                            <WorkflowRelaysSection workflowRelays={backendData?.workflow_relays} />
                            <RawDataSection workflow={workflow} />
                        </div>
                    </div>
                </div>
            </div>
        </BrokerHighlightContext.Provider>
    );
}
