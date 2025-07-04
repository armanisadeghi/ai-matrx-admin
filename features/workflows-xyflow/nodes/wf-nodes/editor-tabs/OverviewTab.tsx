"use client";
import React from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { workflowNodesActions } from "@/lib/redux/workflow-nodes/slice";

export const OverviewTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));
    const dispatch = useAppDispatch();

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    return (
        <div className="h-full overflow-auto pr-2 space-y-4">
            {/* Basic Information */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 dark:bg-muted/50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium text-foreground dark:text-foreground">Basic Information</h4>
                </div>
                <Table>
                    <TableBody>
                        <TableRow className="bg-background dark:bg-background">
                            <TableCell className="font-medium text-xs w-48 border-r border-border dark:border-border">Step Name</TableCell>
                            <TableCell className="p-0 m-0">
                                <input
                                    type="text"
                                    value={nodeData.step_name}
                                    className="w-full bg-gray-100 dark:bg-gray-800 border-none outline-none text-sm text-foreground dark:text-foreground placeholder:text-muted-foreground focus:ring-0 p-2 rounded"
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
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/30 dark:bg-muted/30">
                            <TableCell className="font-medium text-xs w-48 border-r border-border dark:border-border">Execution Required</TableCell>
                            <TableCell>
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
                                    <span className="text-xs text-muted-foreground">
                                        {nodeData.execution_required ? "Current Setting: Required" : "Current Setting: Optional"}
                                    </span>
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-background dark:bg-background">
                            <TableCell className="font-medium text-xs w-48 border-r border-border dark:border-border">Active</TableCell>
                            <TableCell>
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
                                    <span className="text-xs text-muted-foreground">
                                        {nodeData.is_active ? "Current Setting: Active" : "Current Setting: Inactive"}
                                    </span>
                                </div>
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-background dark:bg-background">
                            <TableCell className="font-medium text-xs w-48 border-r border-border dark:border-border">Type</TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                    {nodeData.type}
                                </Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/30 dark:bg-muted/30">
                            <TableCell className="font-medium text-xs w-48 border-r border-border dark:border-border">Node Type</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-xs">
                                    {nodeData.node_type}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Inputs */}
            {nodeData.inputs && nodeData.inputs.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 dark:bg-muted/50 px-4 py-2 border-b">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Inputs</h4>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20 dark:bg-muted/20">
                                <TableHead className="font-semibold w-48 border-r border-border dark:border-border">Name</TableHead>
                                <TableHead className="font-semibold">Type</TableHead>
                                <TableHead className="font-semibold">Status</TableHead>
                                <TableHead className="font-semibold">Required</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nodeData.inputs.map((input, index) => (
                                <TableRow
                                    key={index}
                                    className={index % 2 === 0 ? "bg-background dark:bg-background" : "bg-muted/30 dark:bg-muted/30"}
                                >
                                    <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">{input.arg_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">
                                            {input.metadata.data_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={input.ready ? "default" : "destructive"} className="text-xs">
                                            {input.ready ? "ready" : "not ready"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={input.metadata.required ? "destructive" : "secondary"} className="text-xs">
                                            {input.metadata.required ? "required" : "optional"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Outputs */}
            {nodeData.outputs && nodeData.outputs.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 dark:bg-muted/50 px-4 py-2 border-b">
                        <h4 className="text-sm font-medium text-foreground dark:text-foreground">Outputs</h4>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20 dark:bg-muted/20">
                                <TableHead className="font-semibold w-48 border-r border-border dark:border-border">Name</TableHead>
                                <TableHead className="font-semibold">Data Type</TableHead>
                                <TableHead className="font-semibold">Broker ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nodeData.outputs.map((output, index) => (
                                <TableRow
                                    key={index}
                                    className={index % 2 === 0 ? "bg-background dark:bg-background" : "bg-muted/30 dark:bg-muted/30"}
                                >
                                    <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">{output.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-xs">
                                            {output.data_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono">
                                            {output.broker_id}
                                        </code>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Dependencies */}
            <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 dark:bg-muted/50 px-4 py-2 border-b">
                    <h4 className="text-sm font-medium text-foreground dark:text-foreground">Dependencies</h4>
                </div>
                {nodeData.dependencies && nodeData.dependencies.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/20 dark:bg-muted/20">
                                <TableHead className="font-semibold w-48 border-r border-border dark:border-border">Type</TableHead>
                                <TableHead className="font-semibold">ID</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {nodeData.dependencies.map((dependency, index) => (
                                <TableRow
                                    key={index}
                                    className={index % 2 === 0 ? "bg-background dark:bg-background" : "bg-muted/30 dark:bg-muted/30"}
                                >
                                    <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                                        {dependency.type ? (
                                            <Badge variant="secondary" className="text-xs">
                                                {dependency.type}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">None</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {dependency.id ? (
                                            <code className="bg-muted dark:bg-muted px-2 py-1 rounded text-xs font-mono break-all">
                                                {dependency.id}
                                            </code>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">None</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="p-4 bg-muted/30 dark:bg-muted/30">
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">No dependencies</p>
                    </div>
                )}
            </div>

            {/* Admin Reference - Raw Data */}
            <div className="h-full">
                Raw Node Data:{" "}
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(nodeData, null, 2)}</pre>
            </div>
        </div>
    );
};

export default OverviewTab;