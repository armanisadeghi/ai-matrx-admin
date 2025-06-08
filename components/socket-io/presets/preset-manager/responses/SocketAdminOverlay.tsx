"use client";

import React, { useState } from "react";
import { SocketPresetResponseProps } from "../SocketPresetManager";
import { SocketTasksTab } from "./admin-tabs/SocketTasksTab";
import { SocketTextResponseTab } from "./admin-tabs/SocketTextResponseTab";
import { SocketDataResponseTab } from "./admin-tabs/SocketDataResponseTab";
import { SocketDataProcessorExtractor } from "./admin-tabs/SocketDataProcessorExtractor";
import FullScreenOverlay, { TabDefinition } from "@/components/official/FullScreenOverlay";
import SocketInfoResponseTab from "./admin-tabs/SocketInfoResponseTab";
import SocketErrorResponseTab from "./admin-tabs/SocketErrorResponseTab";
import { SocketBookmarkTab, BookmarkTabConfig } from "./admin-tabs/SocketBookmarkTab";
import { DualSidebar } from "./admin-tabs/components/DualSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectPrimaryResponseDataByTaskId,
    selectPrimaryResponseErrorsByTaskId,
    selectPrimaryResponseInfoByTaskId,
    selectPrimaryResponseTextByTaskId,
    selectPrimaryResponseEndedByTaskId,
} from "@/lib/redux/socket-io/selectors/socket-response-selectors";

export interface SocketAdminOverlayProps extends SocketPresetResponseProps {
    // Override props for admin overlay
    overlayTitle?: string;
    overlayDescription?: string;
    showOverlay?: boolean;
    onClose?: () => void;

    // Custom bookmark tabs
    customTabs?: BookmarkTabConfig[];
}

/**
 * Admin overlay that provides full access to all socket task and response data
 *
 * This component:
 * - Shows all tasks, listeners, and responses in Redux
 * - Initializes with the current taskId but allows browsing all data
 * - Uses FullScreenOverlay with multiple tabs
 * - Persists across multiple executions (doesn't reset data)
 * - Provides JSON exploration and markdown viewing for responses
 */
export const SocketAdminOverlay: React.FC<SocketAdminOverlayProps> = ({
    taskId,
    isExecuting = false,
    error,
    overlayTitle = "Socket Admin Panel",
    overlayDescription = "Full access to all socket tasks and responses",
    showOverlay = false,
    onClose,
    customTabs = [],
}) => {
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskId);

    // Header controls state
    const [selectedDataType, setSelectedDataType] = useState<"data" | "text" | "info" | "error">("text");
    const [responseIndex, setResponseIndex] = useState<number>(0);

    // Get response data based on selected task (not just the initial taskId)
    const textResponse = useAppSelector((state) => (selectedTaskId ? selectPrimaryResponseTextByTaskId(selectedTaskId)(state) : ""));
    const dataResponse = useAppSelector((state) => (selectedTaskId ? selectPrimaryResponseDataByTaskId(selectedTaskId)(state) : []));
    const infoResponse = useAppSelector((state) => (selectedTaskId ? selectPrimaryResponseInfoByTaskId(selectedTaskId)(state) : []));
    const errorsResponse = useAppSelector((state) => (selectedTaskId ? selectPrimaryResponseErrorsByTaskId(selectedTaskId)(state) : []));
    const taskEnded = useAppSelector((state) => (selectedTaskId ? selectPrimaryResponseEndedByTaskId(selectedTaskId)(state) : false));

    // Use showOverlay prop to control visibility
    const isOverlayOpen = showOverlay;

    // Update selected task when new taskId comes in
    React.useEffect(() => {
        if (taskId) {
            setSelectedTaskId(taskId);
        }
    }, [taskId]);

    const handleClose = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent event bubbling
        onClose?.();
    };

    // Define base tabs for the overlay
    const baseTabs: TabDefinition[] = [
        {
            id: "tasks",
            label: "Tasks",
            content: (
                <SocketTasksTab
                    currentTaskId={selectedTaskId}
                    onTaskIdChange={setSelectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
        {
            id: "text",
            label: "Text",
            content: (
                <SocketTextResponseTab
                    taskId={selectedTaskId}
                    onTaskIdChange={setSelectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
        {
            id: "data",
            label: "Data",
            content: (
                <SocketDataResponseTab
                    taskId={selectedTaskId}
                    onTaskIdChange={setSelectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
        {
            id: "data-processor",
            label: "Data 2",
            content: (
                <SocketDataProcessorExtractor
                    taskId={selectedTaskId}
                    onTaskIdChange={setSelectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
        {
            id: "info",
            label: "Info",
            content: (
                <SocketInfoResponseTab
                    taskId={selectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
        {
            id: "errors",
            label: "Error",
            content: (
                <SocketErrorResponseTab
                    taskId={selectedTaskId}
                    isExecuting={isExecuting}
                    error={error}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                />
            ),
        },
    ];

    // Add custom bookmark tabs
    const customTabDefinitions: TabDefinition[] = customTabs.map((config, index) => ({
        id: `custom-${index}`,
        label: config.tabName,
        content: (
            <SocketBookmarkTab
                taskId={selectedTaskId}
                onTaskIdChange={setSelectedTaskId}
                config={config}
                isExecuting={isExecuting}
                error={error}
                selectedDataType={selectedDataType}
                selectedIndex={responseIndex}
            />
        ),
    }));

    // Combine base and custom tabs
    const tabs: TabDefinition[] = [...baseTabs, ...customTabDefinitions];

        // Determine which response types have valid data
    const hasValidText = textResponse && textResponse.length >= 2;
    const hasValidData = dataResponse && dataResponse.length > 0;
    const hasValidInfo = infoResponse && infoResponse.length > 0;
    const hasValidError = errorsResponse && errorsResponse.length > 0;
    
    const validTypes: Array<"text" | "data" | "info" | "error"> = [];
    if (hasValidText) validTypes.push("text");
    if (hasValidData) validTypes.push("data");
    if (hasValidInfo) validTypes.push("info");
    if (hasValidError) validTypes.push("error");

    // Reset selected type if it's no longer valid
    React.useEffect(() => {
        if (validTypes.length > 0 && !validTypes.includes(selectedDataType)) {
            setSelectedDataType(validTypes[0]);
            setResponseIndex(0);
        }
    }, [validTypes.join(","), selectedDataType]);

    // Get current response array for index buttons
    const getCurrentResponseArray = () => {
        switch (selectedDataType) {
            case "data":
                return dataResponse;
            case "info":
                return infoResponse;
            case "error":
                return errorsResponse;
            default:
                return [];
        }
    };

    const currentResponseArray = getCurrentResponseArray();
    const showIndexButtons = selectedDataType !== "text" && currentResponseArray.length > 0;

        // Header component
    const headerComponent = (
        <div className="flex items-center gap-4 flex-wrap">
            {/* Task Status Badge - Always show when we have a taskId */}
            {selectedTaskId && (
                <div className={`px-2 py-1 text-xs font-medium rounded-md border ${
                    taskEnded 
                        ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
                        : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                }`}>
                    {taskEnded ? "Task Ended" : "Task Started"}
                </div>
            )}
            
            {/* Response Type Toggle - Always show all buttons */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</span>
                <div className="flex gap-1">
                    {(["text", "data", "info", "error"] as const).map((type) => {
                        const isValid = 
                            (type === "text" && hasValidText) ||
                            (type === "data" && hasValidData) ||
                            (type === "info" && hasValidInfo) ||
                            (type === "error" && hasValidError);
                        
                        return (
                            <Button
                                key={type}
                                variant={selectedDataType === type ? "default" : "outline"}
                                size="sm"
                                disabled={!isValid}
                                onClick={() => {
                                    if (isValid) {
                                        setSelectedDataType(type);
                                        setResponseIndex(0); // Reset index when switching types
                                    }
                                }}
                                className="px-2 py-1 text-xs h-7"
                            >
                                {type}
                            </Button>
                        );
                    })}
                </div>
            </div>
            
            {/* Response Index Buttons */}
            {showIndexButtons && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Response:</span>
                    <div className="flex gap-1">
                        {currentResponseArray.map((_, index) => (
                            <Button
                                key={index}
                                variant={responseIndex === index ? "default" : "outline"}
                                size="sm"
                                onClick={() => setResponseIndex(index)}
                                className="px-2 py-1 text-xs h-7"
                            >
                                {index + 1}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    // If overlay is not open, render nothing
    if (!isOverlayOpen) {
        return null;
    }

    return (
        <FullScreenOverlay
            isOpen={isOverlayOpen}
            onClose={handleClose}
            title={overlayTitle}
            description={overlayDescription}
            tabs={tabs}
            initialTab="tasks"
            width="95vw"
            height="95vh"
            sharedHeader={headerComponent}
            leftSidePanelRatio={0.2}
            leftSidePanel={
                <DualSidebar 
                    selectedTaskId={selectedTaskId} 
                    onTaskSelect={setSelectedTaskId}
                    selectedDataType={selectedDataType}
                    selectedIndex={responseIndex}
                    onDataTypeChange={(dataType, index) => {
                        setSelectedDataType(dataType);
                        setResponseIndex(index || 0);
                    }}
                />
            }
        />
    );
};

export default SocketAdminOverlay;
