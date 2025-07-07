"use client";
import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";
import { SectionContainer, SectionTable, TableRowData } from "./common";
import { TableCell } from "@/components/ui/table";
import { toTitleCase } from "@/utils/dataUtils";

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

// =============== FOR REFERENCE ONLY ===============
// const inputSample: NodeInput[] = [
//     { name: "results_object", required: true, component: "ArrayInput", data_type: "list", input_type: "argument" },
//     { name: "enhanced_bookmarks", required: true, component: "ObjectInput", data_type: "dict", input_type: "argument" },
// ];

// const outputSample: NodeOutput[] = [
//     {
//         name: "Extracted Text From Dict",
//         broker_id: "e3a6d1cc-12fe-4e8d-b0e8-ff0e888c1da0",
//         component: "DefaultOutput",
//         data_type: "str",
//         description: null,
//         output_type: "default_function_result",
//     },
// ];

export const OverviewTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const nodeDefinition = nodeData?.metadata?.nodeDefinition;
    const inputs = nodeDefinition?.inputs || [];
    const outputs = nodeDefinition?.outputs || [];
    const dispatch = useAppDispatch();

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    const getInputFromNodeData = (inputName: string) => {
        return nodeData.inputs.find((input) => input.arg_name === inputName);
    };

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
            <SectionTable
                title="Inputs"
                headers={["Name", "ID", "Type", "Required", "Status", "Info"]}
                data={inputs}
                renderRow={(input, index) => (
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
                        <TableCell></TableCell>
                    </>
                )}
                emptyMessage="No inputs"
            />

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
