"use client";
import React, { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { SectionTable, TableRowData } from "@/features/workflows-xyflow/common";
import { TableCell } from "@/components/ui/table";
import { toTitleCase } from "@/utils/dataUtils";
import { Output } from "@/lib/redux/workflow/types";
import { NodeInputsTable } from "@/features/workflows-xyflow/node-editor/common";

export type NodeInput = {
    name: string;
    required: boolean;
    component: string;
    data_type: string;
    input_type: string;
};

export type NodeOutput = {
    name: string;
    broker_id: string;
    component: string;
    data_type: string;
    description: string | null;
    output_type: string;
};


export const OverviewTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const nodeDefinition = nodeData?.metadata?.nodeDefinition;
    const outputs = nodeDefinition?.outputs || [];
    const dispatch = useAppDispatch();

    const updateOutputs = useCallback((outputs: Output[]) => {
        dispatch(workflowNodesActions.updateOutputs({ id: nodeId, outputs }));
    }, [nodeId, dispatch]);

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    // Basic Information rows
    const basicInfoRows: TableRowData[] = [
        {
            key: "step_name",
            label: "Step Name",
            content: (
                <input
                    type="text"
                    value={nodeData.step_name}
                    className="w-full bg-background dark:bg-background border-none outline-none text-sm text-foreground dark:text-foreground placeholder:text-muted-foreground focus:ring-0 p-2 rounded"
                    placeholder="Enter step name..."
                    onChange={(e) => {
                        dispatch(
                            workflowNodesActions.updateField({
                                id: nodeId,
                                field: "step_name",
                                value: e.target.value,
                            })
                        );
                    }}
                />
            ),
        },
        {
            key: "execution_required",
            label: "Execution Required",
            content: (
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={nodeData.execution_required}
                        onCheckedChange={(checked) => {
                            dispatch(
                                workflowNodesActions.updateField({
                                    id: nodeId,
                                    field: "execution_required",
                                    value: checked,
                                })
                            );
                        }}
                    />
                    <span className="text-sm text-muted-foreground">
                        {nodeData.execution_required ? "Current Setting: Required" : "Current Setting: Optional"}
                    </span>
                </div>
            ),
        },
        {
            key: "is_active",
            label: "Active",
            content: (
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={nodeData.is_active}
                        onCheckedChange={(checked) => {
                            dispatch(
                                workflowNodesActions.updateField({
                                    id: nodeId,
                                    field: "is_active",
                                    value: checked,
                                })
                            );
                        }}
                        className="data-[state=checked]:bg-green-500 dark:data-[state=checked]:bg-green-600"
                    />
                    <span className="text-sm text-muted-foreground">
                        {nodeData.is_active ? "Current Setting: Active" : "Current Setting: Inactive"}
                    </span>
                </div>
            ),
        },
    ];

    return (
        <div className="h-full overflow-auto pr-2 space-y-6">
            {/* Basic Information */}
            <SectionTable title="Basic Information" rows={basicInfoRows} />

            {/* Inputs */}
            <NodeInputsTable nodeId={nodeId} />

            {/* Outputs */}
            <SectionTable
                title="Outputs"
                headers={["Name", "Broker ID", "Data Type", "Info"]}
                data={outputs}
                renderRow={(output, index) => (
                    <>
                        <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                            {toTitleCase(output.name)}
                        </TableCell>
                        <TableCell className="font-medium text-[10px] w-96 border-r border-border dark:border-border">
                            <code className="px-2 py-1 rounded text-xs font-mono break-all">{output.broker_id}</code>
                        </TableCell>
                        <TableCell className="font-medium text-center text-sm w-48 border-r border-border dark:border-border">
                            <Badge variant="outline" className="text-xs">
                                {output.data_type}
                            </Badge>
                        </TableCell>
                        <TableCell></TableCell>
                    </>
                )}
                emptyMessage="No outputs"
            />
        </div>
    );
};

export default OverviewTab;
