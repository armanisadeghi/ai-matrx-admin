"use client";

import React, { useCallback } from "react";
import { Database } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowSelectors, workflowActions } from "@/lib/redux/workflow";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { BaseSourceNode, BaseSourceNodeData } from "../BaseSourceNode";
import { NodeProps } from "reactflow";
import TableReferenceIcon from "@/components/user-generated-table-data/TableReferenceIcon";
import { UserDataReference } from "@/components/user-generated-table-data/tableReferences";
import { BrokerSourceConfig } from "@/lib/redux/workflow/types";
import { toast } from "sonner";

interface UserDataSourceNodeData extends BaseSourceNodeData {
    // No additional props needed - everything comes from Redux
}

interface UserDataSourceNodeProps extends NodeProps {
    data: UserDataSourceNodeData;
}

const UserDataSourceNodeComponent: React.FC<UserDataSourceNodeProps> = (props) => {
    const { data } = props;
    const { brokerId, workflowId } = data;
    
    const dispatch = useAppDispatch();
    
    // Get current source data from Redux
    const userDataSource = useAppSelector((state) => 
        workflowSelectors.userDataSourceByBrokerId(state, brokerId)
    );
    
    // Get broker display name
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();
    const brokerDisplayName = dataBrokerRecordsById[brokerId]?.name || brokerId;
    
    // Extract selected table from Redux source data
    const selectedTable = userDataSource?.sourceDetails;

    // Handle table reference selection
    const handleReferenceSelect = useCallback((reference: UserDataReference) => {
        try {
            // Create the source configuration with required fields
            const sourceConfig: BrokerSourceConfig<"user_data"> = {
                sourceType: "user_data" as const,
                brokerId,
                scope: "workflow", // Required field
                sourceDetails: reference, // UserDataReference matches the expected structure
                metadata: null
            };

            // Add or update the source in Redux
            if (userDataSource) {
                dispatch(workflowActions.updateSource({
                    sourceType: "user_data",
                    brokerId,
                    source: sourceConfig
                }));
                toast.success("Table reference updated successfully");
            } else {
                dispatch(workflowActions.addSource(sourceConfig));
                toast.success("Table reference added successfully");
            }
        } catch (error) {
            console.error("Error handling table reference selection:", error);
            toast.error("Failed to update table reference");
        }
    }, [dispatch, brokerId, userDataSource]);

    // Custom compact content component
    const CompactContent = useCallback(() => (
        <div className="relative">
            <Database className="w-4 h-4 text-foreground" />
            {selectedTable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
            )}
        </div>
    ), [selectedTable]);

    // Custom detailed content component
    const DetailedContent = useCallback(({ leftHandleLabel, rightHandleLabel }: { leftHandleLabel?: string; rightHandleLabel?: string }) => (
        <>
            {/* Handles with labels */}
            <div className="relative flex items-center mb-1">
                <div className="text-[8px] text-muted-foreground pr-2">
                    <div className="font-mono text-[7px] opacity-70">
                        {leftHandleLabel || "Component ID"}
                    </div>
                </div>
            </div>

            <div className="relative flex items-center justify-end mb-1">
                <div className="text-[8px] text-muted-foreground pl-2 text-right">
                    <div className="font-mono text-[7px] opacity-70">
                        {rightHandleLabel || brokerDisplayName}
                    </div>
                </div>
            </div>

            {/* Table selection and display */}
            <div className="space-y-2 mb-2">
                {selectedTable ? (
                    // Show selected table details
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
                        <Database className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-foreground truncate">
                                {selectedTable.description || selectedTable.table_name}
                            </div>
                            <div className="text-[8px] text-muted-foreground truncate">
                                Table: {selectedTable.table_name}
                            </div>
                        </div>
                        <TableReferenceIcon
                            onReferenceSelect={handleReferenceSelect}
                            size="sm"
                            variant="ghost"
                            title="Change Table Reference"
                        />
                    </div>
                ) : (
                    // Show selection prompt
                    <div className="flex items-center gap-2 p-2 border-2 border-dashed border-muted-foreground/30 rounded">
                        <Database className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-muted-foreground">
                                No table selected
                            </div>
                        </div>
                        <TableReferenceIcon
                            onReferenceSelect={handleReferenceSelect}
                            size="sm"
                            variant="outline"
                            title="Select Table Reference"
                        />
                    </div>
                )}
            </div>
        </>
    ), [selectedTable, brokerDisplayName, handleReferenceSelect]);

    // Generate display text
    const displayText = selectedTable 
        ? `${selectedTable.description || selectedTable.table_name} Data`
        : `${brokerDisplayName} Data`;

    return (
        <BaseSourceNode
            {...props}
            icon={Database}
            displayText={displayText}
            brokerDisplayName={brokerDisplayName}
            leftHandleLabel="Component ID"
            rightHandleLabel={brokerDisplayName}
            CompactContent={CompactContent}
            DetailedContent={DetailedContent}
            onActiveToggle={(active) => {
                // TODO: Handle active state in Redux if needed
                console.log("Active toggled:", active);
            }}
            onDoubleClick={() => {
                // Double click opens settings (handled by BaseSourceNode)
            }}
        />
    );
};

export const UserDataSourceNode = React.memo(UserDataSourceNodeComponent); 