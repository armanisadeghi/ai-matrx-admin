"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import { Card, CardContent } from "@/components/ui/card";
import { NodeContextMenu } from "@/features/workflows/components/menus/NodeContextMenu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { getRegisteredFunctions } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";
import { SocketExecuteButton } from "@/components/socket-io/presets/preset-manager/triggers/SocketExecuteButton";
import { SocketResultsOverlay } from "@/components/socket-io/presets/preset-manager/responses/SocketResultsOverlay";
import { Trash2, Edit, Copy } from "lucide-react";
import { DbFunctionNode } from "@/features/workflows/types";
import { getNodeWithInputsAndOutputs, isNodeConnected } from "@/features/workflows/utils/node-utils";
import { workflowNodeCustomTabs } from "@/features/workflows/components/common/workflow-results-tab-config";

interface Input {
    id: string;
    label: string;
}
interface Output {
    id: string;
    label: string;
}

interface NodeWithInputsAndOutputs extends DbFunctionNode {
    inputs: Input[];
    outputs: Output[];
}

interface WorkflowNodeProps {
    data: DbFunctionNode;
    selected: boolean;
    onDelete: (nodeId: string) => void;
    onEdit: (nodeData: DbFunctionNode) => void;
    onDuplicate: (nodeId: string) => void;
    userInputs?: Array<{ broker_id: string; default_value: any }>; // Optional user inputs from the workflow
}

const RecipeNode: React.FC<WorkflowNodeProps> = ({ data, selected, onDelete, onEdit, onDuplicate, userInputs }) => {
    const { mode } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const nodeWithInputsAndOutputs: NodeWithInputsAndOutputs = getNodeWithInputsAndOutputs(data);
    // Check if node is guaranteed to fail (has required args that aren't ready or mapped)
    const nodeConnected = isNodeConnected(data);
    const willFail = !nodeConnected;

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

                        {/* Execute and Edit buttons */}
                        <div className="w-full flex justify-between items-center">
                            <SocketExecuteButton
                                presetName="workflow_step_to_execute_single_step"
                                sourceData={{
                                    ...data,
                                    user_inputs: userInputs || [],
                                }}
                                onExecuteComplete={(taskId) => {
                                    setCurrentTaskId(taskId);
                                    setShowResults(true);
                                }}
                            />
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
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#3b82f6",
                    border: "1px solid white",
                    left: -4,
                }}
            />
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                style={{
                    width: "8px",
                    height: "8px",
                    backgroundColor: "#22c55e",
                    border: "1px solid white",
                    right: -4,
                }}
            />
        </div>
    );

    return (
        <NodeContextMenu
            data={data}
            userInputs={userInputs}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onExecuteComplete={(taskId) => {
                setCurrentTaskId(taskId);
                setShowResults(true);
            }}
        >
            {nodeContent}
        </NodeContextMenu>
    );
};

export default RecipeNode;
