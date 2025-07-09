"use client";
import React, { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionTable } from "@/features/workflows-xyflow/common";
import { TableCell } from "@/components/ui/table";
import { toTitleCase } from "@/utils/dataUtils";
import { InputMapping } from "@/lib/redux/workflow/types";
import { generateInputByName } from "@/features/workflows-xyflow/utils/input-utils";

export interface NodeInputsTableProps {
    nodeId: string;
}

export const NodeInputsTable: React.FC<NodeInputsTableProps> = ({ nodeId }) => {
    const dispatch = useAppDispatch();
    
    // Get node data and definition
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const nodeDefinition = nodeData?.metadata?.nodeDefinition;
    const inputs = nodeDefinition?.inputs || [];
    
    // Get controlled inputs from Redux
    const controlledNodeInputs = useAppSelector((state) => workflowNodesSelectors.nodeInputs(state, nodeId));

    // Redux actions
    const addInput = useCallback((input: InputMapping) => {
        dispatch(workflowNodesActions.addInput({ id: nodeId, input }));
    }, [nodeId, dispatch]);

    const removeInput = useCallback((index: number) => {
        dispatch(workflowNodesActions.removeInput({ id: nodeId, index }));
    }, [nodeId, dispatch]);

    // Helper functions
    const getInputFromNodeData = useCallback((inputName: string) => {
        return nodeData?.inputs?.find((input) => input.arg_name === inputName);
    }, [nodeData]);

    // Check if an input is controlled (exists in Redux state)
    const isInputControlled = useCallback((inputName: string) => {
        return controlledNodeInputs.some((controlledInput) => controlledInput.arg_name === inputName);
    }, [controlledNodeInputs]);

    // Toggle input controlled status
    const toggleInputControlled = useCallback((inputName: string, isControlled: boolean) => {
        if (isControlled) {
            // Remove from controlled inputs
            const index = controlledNodeInputs.findIndex((input) => input.arg_name === inputName);
            if (index !== -1) {
                removeInput(index);
            }
        } else {
            // Add to controlled inputs using the utility function
            try {
                const generatedInput = generateInputByName(nodeDefinition, inputName);
                addInput(generatedInput);
            } catch (error) {
                console.error(`Failed to generate input for ${inputName}:`, error);
            }
        }
    }, [controlledNodeInputs, removeInput, addInput, nodeDefinition]);

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    return (
        <SectionTable
            title="Inputs"
            headers={["Name", "ID", "Type", "Required", "Status", "Controlled", "Info"]}
            data={inputs}
            renderRow={(input, index) => {
                const controlled = isInputControlled(input.name);
                return (
                    <>
                        <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                            {toTitleCase(input.name)}
                        </TableCell>
                        <TableCell className="font-medium text-[10px] w-96 border-r border-border dark:border-border">
                            <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.id}</code>
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                            {input.input_type}
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                            <Badge variant={input.required ? "destructive" : "secondary"} className="text-xs">
                                {input.required ? "Required" : "Optional"}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-32 border-r border-border dark:border-border">
                            {(() => {
                                const inputData = getInputFromNodeData(input.name);
                                const isReady = inputData?.ready;
                                const isRequired = input.required;

                                if (isReady) {
                                    return (
                                        <Badge variant="default" className="text-xs">
                                            Ready
                                        </Badge>
                                    );
                                } else if (isRequired) {
                                    return (
                                        <Badge variant="destructive" className="text-xs">
                                            Not Ready
                                        </Badge>
                                    );
                                } else {
                                    return (
                                        <Badge variant="outline" className="text-xs">
                                            Not Used
                                        </Badge>
                                    );
                                }
                            })()}
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                            <div className="flex justify-center">
                                <Checkbox
                                    checked={controlled}
                                    disabled={input.input_type === "broker"}
                                    onCheckedChange={() => toggleInputControlled(input.name, controlled)}
                                    className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500 dark:data-[state=checked]:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </TableCell>
                        <TableCell></TableCell>
                    </>
                );
            }}
            emptyMessage="No inputs"
        />
    );
};

export default NodeInputsTable; 