"use client";

import React, { useRef, useState } from "react";
import { ImperativePanelHandle, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Card } from "@/components/ui";
import DraggableToolbar, { ToolbarAction } from "../components/DraggableToolbar";
import EnhancedContentRenderer from "@/components/mardown-display/EnhancedMarkdownRenderer";
import { Copy } from "lucide-react";
import { DisplayTheme } from "@/components/mardown-display/themes";

interface ResultPanelProps {
    id: string;
    order: number;
    number: number;
    label: string;
    streamingText: string;
    onDelete?: (id: string) => void;
    onDragDrop?: (draggedId: string, targetId: string) => void;
    onLabelChange?: (id: string, newLabel: string) => void;
    debug?: boolean;
    onDebugClick?: (id: string) => void;
    theme?: DisplayTheme;
    onThemeChange?: (theme: DisplayTheme) => void;
}

export function EnhancedResultsPanel({
    id,
    order,
    number,
    label,
    streamingText,
    onDelete,
    onDragDrop,
    onLabelChange,
    debug,
    onDebugClick,
    theme = "professional",
    onThemeChange,
}: ResultPanelProps) {
    const panelRef = useRef<ImperativePanelHandle>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [previousSize, setPreviousSize] = useState(50);
    const [viewMode, setViewMode] = useState("rendered");
    const [showCopySuccess, setShowCopySuccess] = useState(false);

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
    ];

    const renderContent = () => (
        <div className="h-full bg-background">
            <EnhancedContentRenderer
                content={streamingText}
                type="message"
                role="assistant"
                fontSize={18}
                onModeChange={setViewMode}
                theme={theme}
                onThemeChange={onThemeChange}
            />
        </div>
    );

    
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
export default EnhancedResultsPanel;
