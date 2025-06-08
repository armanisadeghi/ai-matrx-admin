"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectTaskById, selectTaskListenerIds } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectPrimaryResponseForTask } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskSidebar } from "./components/TaskSidebar";
import { WorkflowSummaryDisplay } from "./components/WorkflowSummaryDisplay";
import { StepCompletionDisplay } from "./components/StepCompletionDisplay";
import { TextResponseDisplay } from "./components/TextResponseDisplay";
import { InfoMessageDisplay } from "./components/InfoMessageDisplay";

interface SocketTasksTabProps {
    currentTaskId: string | null;
    onTaskIdChange: (taskId: string | null) => void;
    isExecuting?: boolean;
    error?: string | null;
    selectedDataType?: "text" | "data" | "info" | "error";
    selectedIndex?: number;
}

export const SocketTasksTab: React.FC<SocketTasksTabProps> = ({
    currentTaskId,
    onTaskIdChange,
    isExecuting = false,
    error,
    selectedDataType = "text",
    selectedIndex = 0,
}) => {
    const selectedTask = useAppSelector((state) => (currentTaskId ? selectTaskById(state, currentTaskId) : null));
    const socketResponse = useAppSelector((state) => (currentTaskId ? selectPrimaryResponseForTask(currentTaskId)(state) : null));

    // Extract the specific response data based on type and index
    const getFilteredResponseData = () => {
        if (!socketResponse) return null;

        switch (selectedDataType) {
            case "text":
                return socketResponse.text || null;
            case "data":
                return socketResponse.data?.[selectedIndex] || null;
            case "info":
                return socketResponse.info?.[selectedIndex] || null;
            case "error":
                return socketResponse.errors?.[selectedIndex] || null;
            default:
                return null;
        }
    };

    const filteredResponseData = getFilteredResponseData();
    const hasResponseData = filteredResponseData !== null && filteredResponseData !== undefined;
    
    // Check if we're showing special data displays
    const isWorkflowSummary = selectedDataType === "data" && 
                             filteredResponseData && 
                             typeof filteredResponseData === 'object' && 
                             filteredResponseData.data_type === "workflow_summary";
    
    const isStepCompletion = selectedDataType === "data" && 
                            filteredResponseData && 
                            typeof filteredResponseData === 'object' && 
                            filteredResponseData.data_type === "step_completion";
    
    const isTextResponse = selectedDataType === "text" && filteredResponseData;
    
    const isInfoMessage = selectedDataType === "info" && filteredResponseData;

    return (
        <div className="h-full flex">
            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
                {/* Content area */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                    {/* Filtered Response Data */}
                    <Card className="flex flex-col">
                        <CardContent className="flex-1 overflow-hidden">
                            {hasResponseData ? (
                                <div className="h-full pt-2">
                                    <RawJsonExplorer pageData={filteredResponseData} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32 text-muted-foreground">
                                    <p>
                                        {currentTaskId 
                                            ? `No ${selectedDataType} response data available${selectedDataType !== "text" ? ` at index ${selectedIndex + 1}` : ""}`
                                            : "Select a task to view response data"
                                        }
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right Panel - Workflow Summary or Task Details */}
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-lg">
                                {isWorkflowSummary 
                                    ? "Workflow Summary" 
                                    : isStepCompletion
                                    ? "Step Results"
                                    : isTextResponse
                                    ? "Text Response"
                                    : isInfoMessage
                                    ? "Status Update"
                                    : selectedTask ? "Submitted Data" : "No Task Selected"
                                }
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden">
                            {isWorkflowSummary ? (
                                <div className="h-full overflow-auto">
                                    <WorkflowSummaryDisplay data={filteredResponseData} />
                                </div>
                            ) : isStepCompletion ? (
                                <div className="h-full overflow-auto">
                                    <StepCompletionDisplay data={filteredResponseData} />
                                </div>
                            ) : isTextResponse ? (
                                <div className="h-full overflow-auto">
                                    <TextResponseDisplay 
                                        textResponse={filteredResponseData} 
                                        isExecuting={isExecuting}
                                    />
                                </div>
                            ) : isInfoMessage ? (
                                <div className="h-full overflow-auto">
                                    <InfoMessageDisplay data={filteredResponseData} />
                                </div>
                            ) : selectedTask ? (
                                <div className="h-full">
                                    <RawJsonExplorer pageData={selectedTask} />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-32 text-muted-foreground">
                                    <p>Select a task from the sidebar to view its details</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
