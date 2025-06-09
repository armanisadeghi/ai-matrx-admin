"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { getRegisteredFunctions } from "@/features/workflows/constants";
import { SocketExecuteButton } from "@/components/socket-io/presets/preset-manager/triggers/SocketExecuteButton";
import { SocketResultsOverlay } from "@/components/socket-io/presets/preset-manager/responses/SocketResultsOverlay";
import {
    Play,
    Database,
    Video,
    List,
    FileText,
    Workflow,
    Brain,
    Code,
    Settings,
    Zap,
    Globe,
    Trash2,
    Edit,
    TestTube,
    MessageCircle,
    Copy,
} from "lucide-react";
import { BaseNode, ArgumentOverride } from "@/features/workflows/types";
import { isNodeConnected } from "@/features/workflows/utils/node-utils";
import { workflowNodeCustomTabs } from "@/features/workflows/react-flow/common/workflow-results-tab-config";

interface WorkflowNodeProps {
    data: BaseNode;
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: BaseNode) => void;
    onDuplicate?: (nodeId: string) => void;
    onDuplicateRPC?: (nodeId: string) => void;
    userInputs?: Array<{ broker_id: string; value: any }>; // Optional user inputs from the workflow
}


// Function to get icon based on function name
const getFunctionIcon = (funcName: string) => {
    const name = funcName.toLowerCase();

    if (name.includes("recipe") || name.includes("run")) return Play;
    if (name.includes("database") || name.includes("schema")) return Database;
    if (name.includes("video") || name.includes("youtube")) return Video;
    if (name.includes("pdf") || name.includes("document")) return FileText;
    if (name.includes("workflow") || name.includes("orchestrator")) return Workflow;
    if (name.includes("ai") || name.includes("brain")) return Brain;
    if (name.includes("code") || name.includes("function")) return Code;
    if (name.includes("web") || name.includes("url")) return Globe;
    if (name.includes("process") || name.includes("execute")) return Zap;

    // Default icon
    return Settings;
};

// Function to get status badge color
const getStatusBadgeVariant = (status: string) => {
    switch (status) {
        case "pending":
            return "secondary";
        case "initialized":
            return "outline";
        case "ready_to_execute":
            return "default";
        case "executing":
            return "default";
        case "execution_complete":
            return "default";
        case "execution_failed":
            return "destructive";
        default:
            return "secondary";
    }
};

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate, onDuplicateRPC, userInputs }) => {
    const functionData = getRegisteredFunctions().find((f) => f.id === data.function_id);
    const hasRequiredInputs = functionData?.args.some((arg) => {
        const override = data.arg_overrides?.find((o: ArgumentOverride) => o.name === arg.name);
        return arg.required && !(override?.ready ?? arg.ready);
    });
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    // Default status if not provided
    const status = data.status || "pending";

    // Check if node is guaranteed to fail (has required args that aren't ready or mapped)
    const nodeConnected = isNodeConnected(data);
    const willFail = !nodeConnected;

    const IconComponent = getFunctionIcon(functionData?.name || "");

    useEffect(() => {
        setMounted(true);

        // Add dark mode class to container if in dark mode
        const container = document.body;
        if (mode === "dark") {
            container.classList.add("react-flow-dark-mode");
        } else {
            container.classList.remove("react-flow-dark-mode");
        }

        return () => {
            container.classList.remove("react-flow-dark-mode");
        };
    }, [mode]);

    const nodeContent = (
        <div className="relative">
            {/* Results Overlay */}
            <SocketResultsOverlay
                taskId={currentTaskId}
                isOpen={showResults}
                onClose={() => {
                    setShowResults(false);
                }}
                customTabs={workflowNodeCustomTabs}
                overlayTitle="Workflow Step Results"
                overlayDescription={`Results for: ${data.step_name || "Unnamed Step"}`}
            />

            <Card
                className={`
        min-w-44 max-w-52 transition-all duration-200
        ${selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}
        ${
            willFail
                ? "border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-800 bg-red-50 dark:bg-red-950/50"
                : data.execution_required
                ? "bg-destructive/5 border-destructive/20"
                : ""
        }
      `}
            >
                <CardContent className="p-3">
                    <div className="space-y-2">
                        {/* Step name takes full top row - made smaller */}
                        <div className="w-full flex items-center justify-center gap-1">
                            {willFail && (
                                <span className="text-red-500 dark:text-red-400 text-[10px]" title="Missing required inputs - will fail">
                                    ⚠️
                                </span>
                            )}
                            <h3 className="font-medium text-[11px] text-foreground truncate text-center max-w-full">
                                {data.step_name || "Unnamed Step"}
                            </h3>
                        </div>

                        {/* Icon and function name in second row */}
                        <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] text-muted-foreground truncate">{functionData?.name || "Unknown Function"}</p>
                            </div>
                        </div>

                        {/* Status and other badges */}
                        <div className="flex items-center gap-1 flex-wrap">
                            {/* Status badge */}
                            <Badge variant={getStatusBadgeVariant(status)} className="text-[9px] px-1 py-0 h-4">
                                {status.replace(/_/g, " ")}
                            </Badge>

                            {data.execution_required && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                    Required
                                </Badge>
                            )}
                            {hasRequiredInputs && (
                                <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 h-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                >
                                    Input
                                </Badge>
                            )}
                        </div>

                        {/* Execute and Edit buttons */}
                        <div className="w-full flex justify-between items-center">
                            <SocketExecuteButton
                                presetName="workflow_step_to_execute_single_step"
                                sourceData={{
                                    ...data,
                                    user_inputs: userInputs || [],
                                }}
                                buttonText="Run"
                                size="sm"
                                variant="outline"
                                className="h-6 px-1 text-[10px] [&>svg]:w-2 [&>svg]:h-2 [&>svg]:mr-0"
                                onExecuteComplete={(taskId) => {
                                    setCurrentTaskId(taskId);
                                    setShowResults(true);
                                }}
                            />
                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(data);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit node"
                                >
                                    <Edit className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ReactFlow Handles for connections */}
            <Handle
                type="target"
                position={Position.Left}
                id="input"
                style={{
                    width: 12,
                    height: 12,
                    backgroundColor: "#3b82f6",
                    border: "2px solid white",
                    left: -6,
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{
                    width: 12,
                    height: 12,
                    backgroundColor: "#22c55e",
                    border: "2px solid white",
                    right: -6,
                }}
            />
        </div>
    );

    // Only wrap in ContextMenu if we have delete/edit/duplicate handlers
    if (onDelete || onEdit || onDuplicate || onDuplicateRPC) {
        return (
            <>
                <ContextMenu>
                    <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
                    <ContextMenuContent>
                        {onEdit && (
                            <ContextMenuItem onClick={() => onEdit(data)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Node
                            </ContextMenuItem>
                        )}
                        {onDuplicate && (
                            <ContextMenuItem onClick={() => onDuplicate(data.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Node (Custom)
                            </ContextMenuItem>
                        )}
                        {onDuplicateRPC && (
                            <ContextMenuItem onClick={() => onDuplicateRPC(data.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate Node (RPC)
                            </ContextMenuItem>
                        )}
                        {onDelete && (
                            <ContextMenuItem onClick={() => onDelete(data.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Node
                            </ContextMenuItem>
                        )}
                    </ContextMenuContent>
                </ContextMenu>
            </>
        );
    }

    return nodeContent;
};

export default WorkflowNode;
