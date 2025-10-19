"use client";

import React, { useRef, useState } from "react";
import { ImperativePanelHandle, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Button, Card } from "@/components/ui";
import MarkdownRenderer from "@/components/mardown-display/MarkdownRenderer";
import DraggableToolbar, { ToolbarAction } from "../components/DraggableToolbar";
import { Eye, Code, FileText, Copy, Braces, Plus } from "lucide-react";
import { FcDownLeft } from "react-icons/fc";
import { AiOutlineDoubleLeft } from "react-icons/ai";
import { selectFirstPrimaryResponseDataByTaskId, selectTaskFirstListenerId } from "@/lib/redux/socket-io/selectors";
import { selectResponseTextByListenerId } from "@/lib/redux/socket-io/selectors";
import { selectResponseEndedByListenerId } from "@/lib/redux/socket-io/selectors";
import { useAppSelector } from "@/lib/redux/hooks";
import EnhancedChatMarkdown from "@/components/mardown-display/chat-markdown/EnhancedChatMarkdown";

interface ResultPanelProps {
    id: string;
    order: number;
    number: number;
    label: string;
    taskId: string;
    onDelete?: (id: string) => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;
    onLabelChange?: (id: string, newLabel: string) => void;
    debug?: boolean;
    onDebugClick?: (id: string) => void;
    minSize?: number;
    addAssistantResponse?: (response: string) => void;
}

export function ResultPanel({
    id,
    order,
    number,
    label,
    taskId,
    onDelete,
    onDragDrop,
    onLabelChange,
    debug,
    onDebugClick,
    minSize,
    addAssistantResponse,
}: ResultPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(minSize);
    const [viewMode, setViewMode] = useState<"rendered" | "raw" | "processed" | "parsedAsJson">("rendered");
    const [showCopySuccess, setShowCopySuccess] = useState(false);

    const firstListenerId = useAppSelector((state) => selectTaskFirstListenerId(state, taskId));
    const streamingText = useAppSelector(selectResponseTextByListenerId(firstListenerId));
    const isTaskComplete = useAppSelector(selectResponseEndedByListenerId(firstListenerId));
    const responseData = useAppSelector((state) => (taskId ? selectFirstPrimaryResponseDataByTaskId(taskId)(state) : null));


    const isStreaming = !isTaskComplete;


    const analysisData = responseData?.response?.metadata || null;

    const toggleCollapse = () => {
        if (isCollapsed) {
            setIsCollapsed(false);
        } else {
            setPreviousSize(panelRef.current?.getSize() ?? 10);
            setIsCollapsed(true);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(streamingText);
            setShowCopySuccess(true);
            setTimeout(() => setShowCopySuccess(false), 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const customActions: ToolbarAction[] = [
        {
            label: showCopySuccess ? "Copied!" : "Copy",
            icon: <Copy className="h-4 w-4" />,
            onClick: handleCopy,
        },
        {
            label: "View Rendered",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => setViewMode("rendered"),
        },
        {
            label: "View Raw",
            icon: <Code className="h-4 w-4" />,
            onClick: () => setViewMode("raw"),
        },
        {
            label: "View Processed",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => setViewMode("processed"),
        },
        {
            label: "View Parsed as JSON",
            icon: <Braces className="h-4 w-4" />,
            onClick: () => setViewMode("parsedAsJson"),
        },
    ];

    const FloatingAddButton = () => {
        if (!addAssistantResponse) return null;

        return (
            <div className="absolute bottom-4 left-4 z-10">
                <Button
                    size="sm"
                    className="flex items-center gap-1.5 bg-zinc-200/80 dark:bg-zinc-800/80 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 shadow-md transition-all duration-200 ease-in-out hover:scale-105"
                    onClick={() => addAssistantResponse(streamingText)}
                >
                    <AiOutlineDoubleLeft className="h-4 w-4" />
                    <span>Add to Messages</span>
                </Button>
            </div>
        );
    };

    const renderContent = () => {
        switch (viewMode) {
            case "raw":
            case "processed":
                return (
                    <div className="relative h-full">
                        <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm h-full">{streamingText}</pre>
                        <FloatingAddButton />
                    </div>
                );
            case "parsedAsJson":
                try {
                    const parsedJson = JSON.stringify(JSON.parse(streamingText), null, 2);
                    return (
                        <div className="relative h-full">
                            <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm h-full">{parsedJson}</pre>
                            <FloatingAddButton />
                        </div>
                    );
                } catch (error) {
                    return (
                        <div className="relative h-full">
                            <div className="p-4 text-red-500 dark:text-red-400">Invalid JSON: {String(error)}</div>
                            <pre className="p-4 whitespace-pre-wrap overflow-y-auto font-mono text-sm h-full">{streamingText}</pre>
                            <FloatingAddButton />
                        </div>
                    );
                }
            case "rendered":
            default:
                return (
                    <div className="flex-1 p-2 overflow-y-auto overflow-x-hidden scrollbar-thin relative">
                        <div className="max-w-[750px] w-full min-h-full">
                            <EnhancedChatMarkdown
                                content={streamingText}
                                taskId={taskId}
                                type="message"
                                role="assistant"
                                className="bg-textured p-4"
                                isStreamActive={isStreaming}
                                analysisData={analysisData}
                                messageId={null}
                                allowFullScreenEditor={false}
                            />
                        </div>
                        <FloatingAddButton />
                    </div>
                );
        }
    };

    if (isCollapsed) {
        return (
            <div className="h-6 flex-none border bg-background">
                <DraggableToolbar
                    id={id}
                    currentLabel={label}
                    isCollapsed={isCollapsed}
                    onLabelChange={onLabelChange}
                    onToggleCollapse={toggleCollapse}
                    onDragDrop={onDragDrop}
                    onDelete={onDelete}
                    actions={customActions}
                    debug={debug}
                    onDebugClick={onDebugClick}
                />
            </div>
        );
    }

    return (
        <>
            <Panel ref={panelRef} id={id} order={order} defaultSize={previousSize} minSize={10} maxSize={75}>
                <Card className="h-full p-0 overflow-hidden bg-background">
                    <div className="h-full flex flex-col">
                        <DraggableToolbar
                            id={id}
                            currentLabel={label}
                            isCollapsed={isCollapsed}
                            onLabelChange={onLabelChange}
                            onToggleCollapse={toggleCollapse}
                            onDragDrop={onDragDrop}
                            onDelete={onDelete}
                            actions={customActions}
                            debug={debug}
                            onDebugClick={onDebugClick}
                        />
                        {renderContent()}
                    </div>
                </Card>
            </Panel>
            <PanelResizeHandle />
        </>
    );
}

export default ResultPanel;
