"use client";

import React, { useState, useEffect } from "react";
import { Connection, Handle, Position } from "reactflow";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { getRegisteredFunctions } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";
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
import { DbFunctionNode, ArgumentOverride } from "@/features/workflows/types";
import { getNodePotentialInputsAndOutputs, isNodeConnected } from "@/features/workflows/utils/node-utils";
import { workflowNodeCustomTabs } from "@/features/workflows/react-flow/common/workflow-results-tab-config";
import { CiEdit } from "react-icons/ci";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BsThreeDots, BsThreeDotsVertical } from "react-icons/bs";
import { PiShieldWarningFill } from "react-icons/pi";

interface WorkflowNodeProps {
    data: DbFunctionNode;
    selected: boolean;
    onDelete?: (nodeId: string) => void;
    onEdit?: (nodeData: DbFunctionNode) => void;
    onDuplicate?: (nodeId: string) => void;
    userInputs?: Array<{ broker_id: string; default_value: any }>; // Optional user inputs from the workflow
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

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate, userInputs }) => {
    const functionData = getRegisteredFunctions().find((f) => f.id === data.function_id);
    const hasRequiredInputs = functionData?.args.some((arg) => {
        const override = data.arg_overrides?.find((o: ArgumentOverride) => o.name === arg.name);
        return arg.required && !(override?.ready ?? arg.ready);
    });
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const { inputs, outputs } = getNodePotentialInputsAndOutputs(data);
    // Default status if not provided
    const status = data.status || "pending";

    // Check if node is guaranteed to fail (has required args that aren't ready or mapped)
    const nodeConnected = isNodeConnected(data);
    const willFail = !nodeConnected;

    // Calculate handle positions
    const calculateHandlePosition = (index: number, total: number, isOutput: boolean = false) => {
        // Account for header height, padding, and spacing
        const headerHeight = 40; // Approximate header height in pixels
        const contentPadding = 0; // p-1 = 4px
        const itemHeight = 16; // Approximate height of each input/output item (text-[8px] + spacing)
        const itemSpacing = 1; // space-y-1 = 4px
        const separatorHeight = 1; // h-px
        const separatorMargin = 10; // space-y-2 = 8px

        let baseOffset = headerHeight + contentPadding;

        if (isOutput) {
            // For outputs, add the height of inputs section, separator, and its margin
            const inputsSectionHeight = Math.max(1, inputs.length) * (itemHeight + itemSpacing);
            baseOffset += inputsSectionHeight + separatorHeight + separatorMargin;
        }

        // Position for this specific item
        const itemOffset = index * (itemHeight + itemSpacing) + itemHeight / 2;

        return baseOffset + itemOffset;
    };

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

    const cardClassName = `min-w-44 max-w-52 transition-all duration-200 ${
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
    } ${
        willFail
            ? "border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-800 bg-red-50 dark:bg-red-950/50"
            : data.execution_required
            ? "bg-destructive/5 border-destructive/20"
            : ""
    }`;

    const borderColorHandles = () => {
        if (mode === "dark") {
            return "0.5px solid white";
        }
        return "0.5px solid black";
    };

    const handleOnConnect = (connection: Connection) => {
        console.log("onConnect", connection);
    };

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

            <Card className={cardClassName}>
                <CardHeader>
                    <div className="space-y-2 border-b border-gray-200 dark:border-gray-600 pb-1">
                        {/* Step name takes full top row - made smaller */}
                        <div className="w-full flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 flex-1">
                                <h3
                                    className="font-medium text-[9px] text-foreground text-center flex-1"
                                    title={data.step_name || "Unnamed Step"}
                                >
                                    {(data.step_name || "Unnamed Step").length > 25
                                        ? `${(data.step_name || "Unnamed Step").slice(0, 25)}...`
                                        : data.step_name || "Unnamed Step"}
                                </h3>
                            </div>
                            {/* Three dots menu - only show if we have menu options */}
                            {(onDelete || onEdit || onDuplicate) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200">
                                            <BsThreeDots className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-[160px]">
                                        {onEdit && (
                                            <DropdownMenuItem onClick={() => onEdit(data)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {onDuplicate && (
                                            <DropdownMenuItem onClick={() => onDuplicate(data.id)}>
                                                <Copy className="h-4 w-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                        )}
                                        {onDelete && (
                                            <DropdownMenuItem
                                                onClick={() => onDelete(data.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-1 min-h-44">
                    <div className="flex flex-col h-full space-y-2">
                        {/* Put these on the left */}
                        <div className="flex-1">
                            <div className="space-y-1">
                                {inputs.slice(0, 8).map((input) => (
                                    <div key={input.id} className="flex items-center justify-end group relative">
                                        <span className="text-[8px] text-gray-700 dark:text-gray-300 truncate block w-full pl-1 pr-4 text-left">
                                            {input.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Separator line */}
                        <div className="h-px bg-gray-200 dark:bg-gray-700"></div>
                        {/* Put these on the right */}
                        <div className="flex-1">
                            <div className="space-y-1">
                                {outputs.slice(0, 8).map((output) => (
                                    <div key={output.id} className="flex items-center justify-end group relative">
                                        <span className="text-[8px] text-gray-700 dark:text-gray-300 truncate block w-full pr-1 pl-4 text-right">
                                            {output.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-0.5 border-t border-gray-200 dark:border-gray-600 mx-1">
                    {/* Execute and Edit buttons */}
                    <div className="w-full flex justify-between items-center">
                        <SocketExecuteButton
                            presetName="workflow_step_to_execute_single_step"
                            sourceData={{
                                ...data,
                                user_inputs: userInputs || [],
                            }}
                            tooltipText="Execute only this step with user inputs"
                            onExecuteComplete={(taskId) => {
                                setCurrentTaskId(taskId);
                                setShowResults(true);
                            }}
                        />
                        {willFail && (
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <PiShieldWarningFill className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            </TooltipTrigger>
                            <TooltipContent className="px-2 py-1">This node has no mapped brokers as inputs</TooltipContent>
                        </Tooltip>
                    )}

                        {onEdit && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(data);
                                        }}
                                        className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Edit node"
                                    >
                                        <CiEdit className="h-4 w-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="px-2 py-1">Edit node</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </CardFooter>
            </Card>

            {/* Individual Input Handles - aligned with each input */}
            {inputs.slice(0, 8).map((input, index) => (
                <Handle
                    key={`input-${input.id}`}
                    type="target"
                    position={Position.Left}
                    id={`input-${input.id}`}
                    isConnectableEnd={true}
                    isConnectableStart={false}
                    onConnect={handleOnConnect}
                    style={{
                        top: `${calculateHandlePosition(index, inputs.length, false)}px`,
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#3b82f6",
                        border: borderColorHandles(),
                        left: -4,
                    }}
                />
            ))}

            {/* Individual Output Handles - aligned with each output */}
            {outputs.slice(0, 8).map((output, index) => (
                <Handle
                    key={`output-${output.id}`}
                    type="source"
                    position={Position.Right}
                    id={`output-${output.id}`}
                    isConnectableEnd={false}
                    isConnectableStart={true}
                    onConnect={handleOnConnect}
                    style={{
                        top: `${calculateHandlePosition(index, outputs.length, true)}px`,
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#22c55e",
                        border: borderColorHandles(),
                        right: -4,
                    }}
                />
            ))}
        </div>
    );

    // Only wrap in ContextMenu if we have delete/edit/duplicate handlers
    if (onDelete || onEdit || onDuplicate) {
        return (
            <>
                <ContextMenu>
                    <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
                    <ContextMenuContent>
                        {onEdit && (
                            <ContextMenuItem onClick={() => onEdit(data)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </ContextMenuItem>
                        )}
                        {onDuplicate && (
                            <ContextMenuItem onClick={() => onDuplicate(data.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                            </ContextMenuItem>
                        )}
                        {onDelete && (
                            <ContextMenuItem onClick={() => onDelete(data.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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
