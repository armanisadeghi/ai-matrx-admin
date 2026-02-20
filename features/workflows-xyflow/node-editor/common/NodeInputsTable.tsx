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
import { useRegisteredNodeWithFetch } from "@/lib/redux/entity/hooks/entityUsedHooks";

export interface NodeInputsTableProps {
    nodeId: string;
}

export const NodeInputsTable: React.FC<NodeInputsTableProps> = ({ nodeId }) => {
    const dispatch = useAppDispatch();
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const inputs = nodeData?.inputs || [];

    const registeredNodeHook = useRegisteredNodeWithFetch();
    const registeredNodeRecords = registeredNodeHook.registeredNodeRecordsById;
    const nodeDefinition = registeredNodeRecords[nodeData.metadata?.nodeDefinitionId];

    // Get controlled inputs from Redux
    const controlledNodeInputs = useAppSelector((state) => workflowNodesSelectors.nodeInputs(state, nodeId));

    // Redux actions
    const addInput = useCallback(
        (input: InputMapping) => {
            dispatch(workflowNodesActions.addInput({ id: nodeId, input }));
        },
        [nodeId, dispatch]
    );

    const removeInput = useCallback(
        (index: number) => {
            dispatch(workflowNodesActions.removeInput({ id: nodeId, index }));
        },
        [nodeId, dispatch]
    );

    // Helper functions
    const getInputFromNodeData = useCallback(
        (inputName: string) => {
            return nodeData?.inputs?.find((input) => input.arg_name === inputName);
        },
        [nodeData]
    );

    // Check if an input is controlled (exists in Redux state)
    const isInputControlled = useCallback(
        (inputName: string) => {
            return controlledNodeInputs.some((controlledInput) => controlledInput.arg_name === inputName);
        },
        [controlledNodeInputs]
    );


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
                            {toTitleCase(input.arg_name || input.metadata?.broker?.name)}
                        </TableCell>
                        <TableCell className="font-medium text-[10px] w-96 border-r border-border dark:border-border">
                            <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.arg_name || input.source_broker_id}</code>
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-28 border-r border-border dark:border-border">
                            {toTitleCase(input.type)}
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-24 border-r border-border dark:border-border">
                            <Badge variant={input.required ? "destructive" : "secondary"} className="text-xs">
                                {input.required ? "Required" : "Optional"}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-center text-xs w-32 border-r border-border dark:border-border">
                            {(() => {
                                const isReady = input.ready;
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
                            </div>
                        </TableCell>
                        <TableCell className="font-medium text-[9px] w-96 border-r border-border dark:border-border">
                            {input.type == "arg_mapping" && (
                                <code className="px-2 py-1 rounded text-xs font-mono break-all">Broker: {input.source_broker_id}</code>
                            )}
                            {input.type == "arg_override" && (
                                <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.default_value}</code>
                            )}
                            {input.type == "user_input" && (
                                <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.source_broker_id}</code>
                            )}
                            {input.type == "environment" && (
                                <code className="px-2 py-1 rounded text-xs font-mono break-all">{input.source_broker_id}</code>
                            )}
                            {input.type == "broker" && (
                                <code className="px-2 py-1 rounded text-xs font-mono break-all"></code>
                            )}
                        </TableCell>
                    </>
                );
            }}
            emptyMessage="No inputs"
        />
    );
};

export default NodeInputsTable;
