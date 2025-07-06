"use client";

import React, { useCallback } from "react";
import { NodeToolbar as ReactFlowNodeToolbar, Position, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Settings, Maximize2, Minimize2, Trash2, Copy, LucideIcon } from "lucide-react";

export interface ToolbarAction {
    icon: LucideIcon;
    onClick: () => void;
    tooltip?: string;
}

export interface BaseNodeToolbarProps {
    nodeId: string;
    isVisible: boolean;
    isCompact: boolean;
    displayMode: "detailed" | "compact";
    onSettings: () => void;
    onDuplicate?: () => void;
    onDelete: () => void;
    onDisplayModeToggle: () => void;
    additionalActions?: ToolbarAction[];
}

const BaseNodeToolbar: React.FC<BaseNodeToolbarProps> = ({
    nodeId,
    isVisible,
    isCompact,
    displayMode,
    onSettings,
    onDuplicate,
    onDelete,
    onDisplayModeToggle,
    additionalActions = [],
}) => {
    const CollapseIcon = displayMode === "compact" ? Maximize2 : Minimize2;

    return (
        <ReactFlowNodeToolbar
            isVisible={isVisible}
            position={Position.Top}
            offset={isCompact ? 20 : 12}
            className="flex items-center gap-1 bg-background border border-border rounded-lg shadow-lg p-1"
        >
            {/* Core Actions */}
            <Button size="sm" variant="ghost" onClick={onSettings} className="h-6 w-6 p-0" title="Settings">
                <Settings className="h-3 w-3" />
            </Button>

            {onDuplicate && (
                <Button size="sm" variant="ghost" onClick={onDuplicate} className="h-6 w-6 p-0" title="Duplicate">
                    <Copy className="h-3 w-3" />
                </Button>
            )}

            <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                title="Delete"
            >
                <Trash2 className="h-3 w-3" />
            </Button>

            <Button
                size="sm"
                variant="ghost"
                onClick={onDisplayModeToggle}
                className="h-6 w-6 p-0"
                title={displayMode === "compact" ? "Expand" : "Collapse"}
            >
                <CollapseIcon className="h-3 w-3" />
            </Button>

            {/* Additional Actions */}
            {additionalActions.map((action, index) => (
                <Button key={index} size="sm" variant="ghost" onClick={action.onClick} className="h-6 w-6 p-0" title={action.tooltip}>
                    <action.icon className="h-3 w-3" />
                </Button>
            ))}
        </ReactFlowNodeToolbar>
    );
};

export default BaseNodeToolbar;
