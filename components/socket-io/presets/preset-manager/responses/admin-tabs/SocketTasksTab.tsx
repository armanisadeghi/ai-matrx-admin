"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectTaskById, selectTaskListenerIds } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { selectPrimaryResponseDataByTaskId, selectPrimaryResponseErrorsByTaskId, selectPrimaryResponseInfoByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskSidebar } from "./components/TaskSidebar";
import { WorkflowSummaryDisplay } from "./components/WorkflowSummaryDisplay";
import { StepCompletionDisplay } from "./components/StepCompletionDisplay";
import { TextResponseDisplay } from "./components/TextResponseDisplay";
import { InfoMessageDisplay } from "./components/InfoMessageDisplay";
import { useRenderCount } from "@uidotdev/usehooks";

interface SocketTasksTabProps {
    currentTaskId: string | null;
    onTaskIdChange: (taskId: string | null) => void;
    isExecuting?: boolean;
    error?: string | null;
    selectedDataType?: "text" | "data" | "info" | "error";
    selectedIndex?: number;
    hasValidText?: boolean;
}

export const SocketTasksTab: React.FC<SocketTasksTabProps> = ({
    currentTaskId,
    onTaskIdChange,
    isExecuting = false,
    error,
    selectedDataType = "text",
    selectedIndex = 0,
    hasValidText = false,
}) => {
    const selectedTask = useAppSelector((state) => (currentTaskId ? selectTaskById(state, currentTaskId) : null));
    const dataResponse = useAppSelector((state) => selectPrimaryResponseDataByTaskId(currentTaskId)(state));
    const infoResponse = useAppSelector((state) => selectPrimaryResponseInfoByTaskId(currentTaskId)(state));
    const errorsResponse = useAppSelector((state) => selectPrimaryResponseErrorsByTaskId(currentTaskId)(state));

    const renderCount = useRenderCount();
    console.log("[SOCKET TASKS TAB] renderCount", renderCount);

    // Extract the specific response data based on type and index
    const getFilteredResponseData = () => {
        if (!hasValidText && !dataResponse.length && !infoResponse.length && !errorsResponse.length) return null;

        switch (selectedDataType) {
            case "text":
                // Use performance-optimized text from chunks
                return hasValidText ? "✓" : null;
            case "data":
                return dataResponse?.[selectedIndex] || null;
            case "info":
                return infoResponse?.[selectedIndex] || null;
            case "error":
                return errorsResponse?.[selectedIndex] || null;
            default:
                return null;
        }
    };

    const filteredResponseData = getFilteredResponseData();

    // Check if we're showing special data displays
    const isWorkflowSummary =
        selectedDataType === "data" &&
        filteredResponseData &&
        typeof filteredResponseData === "object" &&
        filteredResponseData.data_type === "workflow_summary";

    const isStepCompletion =
        selectedDataType === "data" &&
        filteredResponseData &&
        typeof filteredResponseData === "object" &&
        filteredResponseData.data_type === "step_completion";

    const isTextResponse = selectedDataType === "text" && filteredResponseData;

    const isInfoMessage = selectedDataType === "info" && filteredResponseData;

    return (
        <div className="h-full flex">
            {/* Main Content */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
                {/* Content area */}
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
                                : selectedTask
                                ? "Submitted Data"
                                : "No Task Selected"}
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
                                <TextResponseDisplay taskId={currentTaskId} isExecuting={isExecuting} />
                            </div>
                        ) : isInfoMessage ? (
                            <div className="h-full overflow-auto">
                                <InfoMessageDisplay data={filteredResponseData} />
                            </div>
                        ) : selectedTask ? (
                            <div className="h-full">
                                <RawJsonExplorer pageData={selectedTask} ignorePrefix="data[0]" />
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
    );
};
