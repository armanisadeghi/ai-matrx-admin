"use client";

import React, { useCallback, memo } from "react";
import { Database } from "lucide-react";
import { NodeProps, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowsSelectors, workflowActions } from "@/lib/redux/workflow";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { BaseNode, NodeConfig, BaseNodeData } from "@/features/workflows-xyflow/nodes/base/BaseNode";
import { UserDataReference } from "@/components/user-generated-table-data/tableReferences";
import { toast } from "sonner";
import UserDataSourceSettings from "@/features/workflows-xyflow/nodes/source-node/user-data/UserDataSourceSettings";

// Extend BaseNodeData with user-data-specific properties
interface UserDataSourceNodeData extends BaseNodeData {
    brokerId?: string;
    workflowId?: string;
}

interface UserDataSourceNodeProps extends NodeProps {
    data: UserDataSourceNodeData;
}

// Custom settings component wrapper
const UserDataSourceSettingsWrapper: React.FC<{
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ nodeId, isOpen, onOpenChange }) => {
    const { getNode } = useReactFlow();
    const node = getNode(nodeId);
    const data = (node?.data || {}) as UserDataSourceNodeData;
    
    // Get Redux data for this source
    const userDataSource = useAppSelector((state) => 
        data.brokerId ? workflowsSelectors.userDataSourceByBrokerId(state, data.workflowId || "", data.brokerId) : null
    );
    
    const selectedTable = userDataSource?.sourceDetails;
    const mode = data.brokerId && selectedTable ? "edit" : "create";
    
    return (
        <UserDataSourceSettings
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            workflowId={data.workflowId || ""}
            mode={mode}
            currentMapping={mode === "edit" ? {
                brokerId: data.brokerId || "",
                mappedItemId: selectedTable?.table_id || selectedTable?.table_name || "",
                source: userDataSource?.scope || "workflow",
                sourceId: data.workflowId || "",
                sourceType: "user_data"
            } : undefined}
            onSuccess={() => {
                console.log("User data source saved successfully");
            }}
        />
    );
};

// Custom compact content component
const UserDataCompactContent: React.FC = () => {
    const nodeId = useNodeId();
    const { getNode } = useReactFlow();
    
    if (!nodeId) return <Database className="w-4 h-4 text-foreground" />;
    
    const node = getNode(nodeId);
    const data = (node?.data || {}) as UserDataSourceNodeData;
    
    // Get Redux data for this source
    const userDataSource = useAppSelector((state) => 
        data.brokerId ? workflowsSelectors.userDataSourceByBrokerId(state, data.workflowId || "", data.brokerId) : null
    );
    
    const selectedTable = userDataSource?.sourceDetails;
    
    return (
        <div className="relative">
            <Database className="w-4 h-4 text-foreground" />
            {selectedTable && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-background" />
            )}
        </div>
    );
};

const UserDataSourceNodeComponent: React.FC<UserDataSourceNodeProps> = ({ data, ...nodeProps }) => {
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();
    const dispatch = useAppDispatch();
    const nodeId = useNodeId();
    
    // Get Redux data for this source
    const userDataSource = useAppSelector((state) => 
        data.brokerId ? workflowsSelectors.userDataSourceByBrokerId(state, data.workflowId || "", data.brokerId) : null
    );

    // Note: Display mode is handled by BaseNode using React Flow's node data

    // Handle duplicate
    const handleDuplicate = useCallback((nodeId: string) => {
        console.log("Duplicate clicked for user data source node:", nodeId);
        // TODO: Implement duplicate logic
    }, []);

    // Handle delete
    const handleDelete = useCallback((nodeId: string) => {
        if (!data.brokerId) {
            console.error("No broker ID found for deletion");
            return;
        }
        
        // Remove from workflow sources
        if (data.workflowId) {
            dispatch(
                workflowActions.removeSourceByBrokerId({
                    id: data.workflowId,
                    brokerId: data.brokerId,
                })
            );
        }
        
        toast.success("User data source deleted successfully");
    }, [data, dispatch]);
    
    const brokerId = data.brokerId;
    const brokerDisplayName = brokerId ? (dataBrokerRecordsById[brokerId]?.name || brokerId) : "Unknown";
    const selectedTable = userDataSource?.sourceDetails;
    
    // Helper function to get display text for reference type
    const getReferenceDisplayText = useCallback((reference: UserDataReference) => {
        const typeMap = {
            table: "Entire Table",
            table_row: "Row",
            table_column: "Column",
            table_cell: "Cell"
        };
        
        const typeText = typeMap[reference.type as keyof typeof typeMap] || reference.type;
        return `${typeText}: ${reference.table_name}`;
    }, []);
    
    // Generate display text based on reference type
    const displayText = selectedTable ? 
        getReferenceDisplayText(selectedTable) : 
        "User Data Source";
    
    // Configure the BaseNode with simple handle arrays
    const config: NodeConfig = {
        nodeType: "userDataSource",
        icon: Database,
        displayText,
        
        // Simple handles - just labels and dots
        inputHandles: [
            { 
                id: `${nodeId}-${selectedTable?.table_id}`, 
                label: displayText
            }
        ], // Source nodes don't have inputs
        outputHandles: [
            {
                id: `${nodeId}-${brokerId}`,
                label: brokerDisplayName || "Missing Broker Display Name",
            },
        ],
        
        // Custom components
        CompactContent: UserDataCompactContent,
        SettingsComponent: UserDataSourceSettingsWrapper,
        
        // Handlers
        onDuplicate: handleDuplicate,
        onDelete: handleDelete,
        
        // Feature configuration
        allowCompactMode: true,
    };
    
    return <BaseNode config={config} {...nodeProps} />;
};

export const UserDataSourceNode = memo(UserDataSourceNodeComponent); 