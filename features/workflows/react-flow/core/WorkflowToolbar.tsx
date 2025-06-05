"use client";
import React from "react";
import Link from "next/link";
import { Node } from "reactflow";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { SocketExecuteButton } from "@/components/socket-io/presets/SocketExecuteButton";
import DebugOverlay from "@/features/workflows/react-flow/core/DebugOverlay";
import { getRegisteredFunctionSelectOptions } from "@/features/workflows/utils.ts/node-utils";

interface WorkflowToolbarProps {
  selectedFunction: string;
  onFunctionSelect: (functionId: string) => void;
  onAddNode: (id: string, type?: string) => void;
  nodes: Node[];
  onSave?: () => void;
  onExecute: () => void;
  prepareWorkflowData: () => any;
  mode: 'edit' | 'view' | 'execute';
  workflowName?: string;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  selectedFunction,
  onFunctionSelect,
  onAddNode,
  nodes,
  onSave,
  onExecute,
  prepareWorkflowData,
  mode,
  workflowName,
}) => {
  const functionOptions = getRegisteredFunctionSelectOptions();
  
  const hasWorkflowNodes = nodes.some(node => 
    node.data && 
    (!node.data.type || (node.data.type !== 'userInput' && node.data.type !== 'brokerRelay')) && 
    node.data.function_id
  );

  const handleFunctionSelect = (functionId: string) => {
    if (!functionId) {
      onFunctionSelect("");
      return;
    }
    onAddNode(functionId, "registeredFunction");
    onFunctionSelect("");
  };

  return (
    <div className="border-b bg-card p-4">
      <div className="flex items-center justify-between">
        {/* Left side - Back button and title */}
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Workflows
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            {workflowName || 'Workflow Builder'} {mode === 'view' && '(Read Only)'}
          </h1>
        </div>
        
        {/* Right side - Controls */}
        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <Select value={selectedFunction} onValueChange={handleFunctionSelect}>
              <SelectTrigger className="w-64">
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

          {onSave && (
            <Button onClick={onSave} variant="outline" size="sm">
              Save Workflow
            </Button>
          )}

          {hasWorkflowNodes && (
            <SocketExecuteButton
              presetName="flow_nodes_to_start_workflow"
              sourceData={prepareWorkflowData()}
              buttonText="Execute Workflow"
              variant="default"
              size="sm"
              overlayTitle="Execute Entire Workflow"
              overlayDescription="Execute all workflow nodes in sequence with user inputs and relays"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            />
          )}

          <DebugOverlay nodes={nodes} edges={[]} />
          
          <div className="text-sm text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
};
