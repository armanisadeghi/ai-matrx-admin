"use client";

import React, { useCallback, memo } from "react";
import { Database } from "lucide-react";
import { NodeProps, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { workflowsSelectors, workflowActions, BrokerSourceConfig } from "@/lib/redux/workflow";
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

    if (!data || !data.brokerId || !data.workflowId) {
        return null;
    }
    
    const userDataSource = useAppSelector((state) => workflowsSelectors.userDataSourceByBrokerId(state, data.workflowId, data.brokerId)) as BrokerSourceConfig<"user_data">;

    const handleDuplicate = useCallback((nodeId: string) => {
        console.log("Duplicate clicked for user data source node:", nodeId);
        // TODO: Implement duplicate logic
    }, []);

    const handleDelete = useCallback((nodeId: string) => {
        if (!data.brokerId) {
            console.error("No broker ID found for deletion");
            return;
        }
        
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
    const sourceDataType = selectedTable?.type as "table_row" | "table_column" | "table_cell" | "full_table";
    const typeToComponentMap = {
        table_cell: "UserTableCell",
        table_row: "UserTableRow",
        table_column: "UserTableColumn",
        full_table: "UserDataTable",
    };
    
    // Configure the BaseNode with custom handles
    const config: NodeConfig = {
        nodeType: "user_data",
        icon: Database,
        displayText: selectedTable?.table_name || "Unknown Table",
        
        // Custom handles for source nodes
        customInputs: [],
        
        customOutputs: [
            {
                name: brokerDisplayName || "Missing Broker Display Name",
                broker_id: userDataSource?.brokerId,
                component: typeToComponentMap[sourceDataType || "DefaultComponent"],
                data_type: "dict",
                description: selectedTable?.description || null,
                output_type: "userData",
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
        useWorkflowActions: false, // This is a source node, not a workflow node
    };
    
    return <BaseNode config={config} {...nodeProps} />;
};

export const UserDataSourceNode = memo(UserDataSourceNodeComponent); 