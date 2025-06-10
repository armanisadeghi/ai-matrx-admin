"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Edge, Node } from "reactflow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, History } from "lucide-react";
import { SocketExecuteButton } from "@/components/socket-io/presets/preset-manager/triggers/SocketExecuteButton";
import DebugOverlay from "@/features/workflows/react-flow/core/DebugOverlay";
import EdgeManagementOverlay from "@/features/workflows/react-flow/core/EdgeManagementOverlay";
import { BrokerOverlay } from "@/features/workflows/react-flow/common/BrokerOverlay";
import { getRegisteredFunctionSelectOptions } from "@/features/workflows/utils/node-utils";
import { workflowNodeCustomTabs } from "@/features/workflows/react-flow/common/workflow-results-tab-config";
import { SocketResultsOverlay } from "@/components/socket-io/presets/preset-manager/responses/SocketResultsOverlay";

interface WorkflowToolbarProps {
    selectedFunction: string;
    onFunctionSelect: (functionId: string) => void;
    onAddNode: (id: string, type?: string) => void;
    nodes: Node[];
    edges: Edge[];
    onSave?: () => void;
    onExecute: () => void;
    prepareWorkflowData: () => any;
    onEdgesUpdated?: () => void;
    workflowId?: string;
    mode: "edit" | "view" | "execute";
    workflowName?: string;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
    selectedFunction,
    onFunctionSelect,
    onAddNode,
    nodes,
    edges,
    onSave,
    onExecute,
    prepareWorkflowData,
    onEdgesUpdated,
    workflowId,
    mode,
    workflowName,
}) => {
    const [isBrokerOverlayOpen, setIsBrokerOverlayOpen] = useState(false);
    const [isResultsOverlayOpen, setIsResultsOverlayOpen] = useState(false);
    const functionOptions = getRegisteredFunctionSelectOptions();
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const hasWorkflowNodes = nodes.some(
        (node) =>
            node.data && (!node.data.type || (node.data.type !== "userInput" && node.data.type !== "brokerRelay")) && node.data.function_id
    );

    // Get workflow data for broker overlay
    const workflowData = prepareWorkflowData();

    const handleFunctionSelect = (functionId: string) => {
        if (!functionId) {
            onFunctionSelect("");
            return;
        }
        onAddNode(functionId, "registeredFunction");
        onFunctionSelect("");
    };

    return (
        <div className="border-b bg-card p-1">
            <div className="flex items-center justify-between">
                {/* Left side - Back button and title */}
                <div className="flex items-center gap-4">
                    <Link href="/workflows">
                        <Button variant="outline" size="sm" className="gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            All Workflows
                        </Button>
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        {workflowName || "Workflow Builder"} {mode === "view" && "(Read Only)"}
                    </h1>
                </div>

                {/* Right side - Controls */}
                <div className="flex items-center gap-3">
                    {onSave && (
                        <Button onClick={onSave} variant="outline" size="sm">
                            Save
                        </Button>
                    )}

                    {hasWorkflowNodes && (
                        <SocketExecuteButton
                            presetName="flow_nodes_to_start_workflow"
                            sourceData={prepareWorkflowData()}
                            buttonText="Execute"
                            variant="default"
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onExecuteComplete={(taskId) => {
                                setCurrentTaskId(taskId);
                                setIsResultsOverlayOpen(true);
                            }}
                        />
                    )}

                    <Button
                        onClick={() => setIsResultsOverlayOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        title="View all socket task results and responses"
                    >
                        <History className="w-4 h-4" />
                        Results
                    </Button>

                    <Button
                        onClick={() => setIsBrokerOverlayOpen(true)}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        title="View all broker IDs in this workflow"
                    >
                        <Database className="w-4 h-4" />
                        Brokers
                    </Button>

                    {mode === "edit" && workflowId && onEdgesUpdated && (
                        <EdgeManagementOverlay workflowId={workflowId} onEdgesUpdated={onEdgesUpdated} />
                    )}
                    {mode === "edit" && (
                        <Select value={selectedFunction} onValueChange={handleFunctionSelect}>
                            <SelectTrigger className="w-64 bg-inherit border border-gray-200 dark:border-gray-700">
                                <SelectValue placeholder="Select a function to add..." />
                            </SelectTrigger>
                            <SelectContent>
                                {functionOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <DebugOverlay nodes={nodes} edges={edges} />
                </div>
            </div>

            {/* Results Overlay */}
            <SocketResultsOverlay
                taskId={currentTaskId}
                isOpen={isResultsOverlayOpen}
                onClose={() => {
                    setIsResultsOverlayOpen(false);
                }}
                customTabs={workflowNodeCustomTabs}
                overlayTitle="Workflow Step Results"
                overlayDescription={`Results for: ${workflowName || "Unnamed Step"}`}
            />

            {/* Broker Overlay */}
            <BrokerOverlay workflowData={workflowData} isOpen={isBrokerOverlayOpen} onClose={() => setIsBrokerOverlayOpen(false)} />
        </div>
    );
};
