"use client";

import React from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { workflowNodesSelectors } from "@/lib/redux/workflow-nodes/selectors";
import { DefaultTabProps } from "./types";
import { Badge } from "@/components/ui/badge";
import { SectionContainer, SectionTable } from "./common";
import { TableCell } from "@/components/ui/table";
import { toTitleCase } from "@/utils/dataUtils";

export const DependenciesTab: React.FC<DefaultTabProps> = ({ nodeId }) => {
    const nodeData = useAppSelector((state) => workflowNodesSelectors.nodeById(state, nodeId));

    if (!nodeData) {
        return <div className="text-muted-foreground">Node not found</div>;
    }

    return (
        <div className="h-full overflow-auto pr-2 space-y-6">
            {/* Dependencies */}
            <SectionTable
                title="Dependencies"
                headers={["Name", "Type", "ID", "Required", "Status", "Info"]}
                data={nodeData.dependencies || []}
                renderRow={(dependency, index) => (
                    <>
                        <TableCell className="font-medium text-sm w-48 border-r border-border dark:border-border">
                            {toTitleCase(dependency.metadata?.name || "No Name")}
                        </TableCell>
                        <TableCell className="font-medium text-center text-sm w-48 border-r border-border dark:border-border">
                            {dependency.type ? (
                                <Badge variant="secondary" className="text-xs">
                                    {toTitleCase(dependency.type)}
                                </Badge>
                            ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                            )}
                        </TableCell>
                        <TableCell className="font-medium text-[10px] w-96 border-r border-border dark:border-border">
                            <code className="px-2 py-1 rounded text-xs font-mono break-all">{dependency.id}</code>
                        </TableCell>
                        <TableCell className="font-medium text-center text-sm w-48 border-r border-border dark:border-border">
                            <Badge variant={dependency.required ? "destructive" : "secondary"} className="text-xs">
                                {dependency.required ? "Required" : "Optional"}
                            </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-center text-sm w-48 border-r border-border dark:border-border">
                            <Badge variant={dependency.connected ? "default" : "destructive"} className="text-xs">
                                {dependency.connected ? "Connected" : "Not Connected"}
                            </Badge>
                        </TableCell>
                        <TableCell></TableCell>
                    </>
                )}
                emptyMessage="No dependencies"
            />

            {/* Raw Data */}
            <SectionContainer title="Raw Dependencies Data">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto h-full">{JSON.stringify(nodeData.dependencies, null, 2)}</pre>
            </SectionContainer>
        </div>
    );
};

export default DependenciesTab;
