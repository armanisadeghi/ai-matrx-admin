"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryResponseDataByTaskId } from "@/lib/redux/socket-io/selectors/socket-response-selectors";
import { selectTaskById } from "@/lib/redux/socket-io/selectors/socket-task-selectors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskSelector } from "./components/TaskSelector";
import { traverseBookmarkPath, getBookmarkDescription } from "./utils/bookmarkTraversal";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import BasicMarkdownContent from "@/components/mardown-display/chat-markdown/BasicMarkdownContent";
import LinesViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/lines-viewer";
import SectionViewerV2 from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/section-viewer-V2";
import SectionGroupTab from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionGroupTab";
import SectionsViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/sections-viewer";
import SectionViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewer";
import SectionViewerWithSidebar from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/SectionViewerWithSidebar";
import { Bookmark, AlertTriangle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import IntelligentViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/IntelligentViewer";
import DynamicViewerTester from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/DynamicViewerTester";
import FlatSectionViewer from "@/components/mardown-display/chat-markdown/analyzer/analyzer-options/FlatSectionViewer";

export type BookmarkComponentType =
    | "RawJsonExplorer"
    | "BasicMarkdownContent"
    | "LinesViewer"
    | "SectionViewerV2"
    | "SectionGroupTab"
    | "SectionsViewer"
    | "SectionViewer"
    | "SectionViewerWithSidebar"
    | "IntelligentViewer"
    | "FlatSectionViewer"
    | "DynamicViewerTester"; // Add this new option

export interface BookmarkTabConfig {
    bookmark: string;
    tabName: string;
    component: BookmarkComponentType;
    icon?: React.ReactNode;
}

interface SocketBookmarkTabProps {
    taskId: string | null;
    onTaskIdChange: (taskId: string | null) => void;
    config: BookmarkTabConfig;
    isExecuting?: boolean;
    error?: string | null;
    selectedDataType?: any;
    selectedIndex?: number;
}

/**
 * A dynamic tab component that uses bookmark paths to extract and display specific data
 */
export const SocketBookmarkTab: React.FC<SocketBookmarkTabProps> = ({
    taskId,
    onTaskIdChange,
    config,
    isExecuting = false,
    error,
    selectedDataType,
    selectedIndex,
}) => {
    const task = useAppSelector((state) => (taskId ? selectTaskById(state, taskId) : null));
    const responseData = useAppSelector((state) => (taskId ? selectPrimaryResponseDataByTaskId(taskId)(state) : []));

    // Extract data using the bookmark path
    const traversalResult = traverseBookmarkPath(responseData, config.bookmark);

    const renderComponent = () => {
        if (!traversalResult.success) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center max-w-md">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-500" />
                        <p className="font-medium mb-2">Bookmark Path Error</p>
                        <p className="text-sm mb-4">{traversalResult.error}</p>
                        <Badge variant="outline" className="font-mono text-xs">
                            {config.bookmark}
                        </Badge>
                    </div>
                </div>
            );
        }

        if (traversalResult.data === null || traversalResult.data === undefined) {
            return (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                        <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p>No data found at bookmark path</p>
                        <p className="text-sm mt-2">
                            Path: <code className="bg-muted px-1 rounded text-xs">{config.bookmark}</code>
                        </p>
                    </div>
                </div>
            );
        }

        // Render based on component type
        switch (config.component) {
            case "RawJsonExplorer":
                return (
                    <div className="h-full">
                        <RawJsonExplorer pageData={traversalResult.data} />
                    </div>
                );

            case "BasicMarkdownContent":
                // Convert data to string if it's not already
                const content =
                    typeof traversalResult.data === "string" ? traversalResult.data : JSON.stringify(traversalResult.data, null, 2);

                return (
                    <div className="h-full overflow-y-auto p-6">
                        <BasicMarkdownContent content={content} isStreamActive={isExecuting} showCopyButton={true} />
                    </div>
                );

            case "LinesViewer":
                return (
                    <div className="h-full">
                        <LinesViewer data={traversalResult.data} />
                    </div>
                );

            case "SectionViewerV2":
                return (
                    <div className="h-full">
                        <SectionViewerV2 data={traversalResult.data} />
                    </div>
                );

            case "SectionGroupTab":
                return (
                    <div className="h-full">
                        <SectionGroupTab data={traversalResult.data} />
                    </div>
                );

            case "SectionsViewer":
                return (
                    <div className="h-full">
                        <SectionsViewer data={traversalResult.data} />
                    </div>
                );

            case "SectionViewer":
                return (
                    <div className="h-full">
                        <SectionViewer data={traversalResult.data} />
                    </div>
                );

            case "SectionViewerWithSidebar":
                return (
                    <div className="h-full">
                        <SectionViewerWithSidebar data={traversalResult.data} />
                    </div>
                );

            case "FlatSectionViewer":
                return (
                    <div className="h-full">
                        <FlatSectionViewer data={traversalResult.data} bookmark={config.bookmark} />
                    </div>
                );

            case "IntelligentViewer":
                return (
                    <div className="h-full">
                        <IntelligentViewer data={traversalResult.data} bookmark={config.bookmark} />
                    </div>
                );

            case "DynamicViewerTester":
                return (
                    <div className="h-full">
                        <DynamicViewerTester data={traversalResult.data} bookmark={config.bookmark} />
                    </div>
                );

            default:
                return (
                    <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                            <p>Unknown component type: {config.component}</p>
                        </div>
                    </div>
                );
        }
    };

    if (!taskId) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No task selected</p>
                    <p className="text-sm">Select a task to view bookmarked data</p>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Task not found</p>
                    <p className="text-sm">The selected task ID does not exist</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {config.icon || <Bookmark className="w-5 h-5 text-primary" />}
                    <div>
                        <h2 className="text-lg font-semibold">{config.tabName}</h2>
                    </div>
                </div>
                <TaskSelector selectedTaskId={taskId} onTaskChange={onTaskIdChange} placeholder="Select task..." />

                {/* Debug info (can be removed in production) */}
                <div className="mb-4">
                    <Badge variant="outline" className="font-mono text-xs">
                        {config.bookmark}
                    </Badge>
                    {traversalResult.success && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                            {config.component}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content */}
            <Card className="flex-1 overflow-hidden">
                <CardContent className="h-full p-0 overflow-hidden">{renderComponent()}</CardContent>
            </Card>
        </div>
    );
};
