"use client";

import React, { memo, useCallback } from "react";
import { NodeProps, useReactFlow } from "@xyflow/react";
import { Download } from "lucide-react";
import { BaseNode, NodeConfig, BaseNodeData } from "../../base/BaseNode";
import UserInputNodeSettings from "./UserInputNodeSettings";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { workflowsSelectors } from "@/lib/redux/workflow/selectors";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { brokerActions } from "@/lib/redux/brokerSlice";

// Extend BaseNodeData with source-specific properties
interface SourceInputNodeData extends BaseNodeData {
    brokerId?: string;
    mappedItemId?: string;
    source?: string;
    sourceId?: string;
}

interface SourceInputNodeProps extends NodeProps {
    data: SourceInputNodeData;
}

// Custom settings component wrapper
const SourceInputSettings: React.FC<{
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ nodeId, isOpen, onOpenChange }) => {
    const { getNode } = useReactFlow();
    const node = getNode(nodeId);
    const data = (node?.data || {}) as SourceInputNodeData;
    const workflowId = data.workflowId as string;

    // Get Redux data for this source
    const currentSource = useAppSelector((state) =>
        data.brokerId ? workflowsSelectors.userInputSourceByBrokerId(state, workflowId, data.brokerId) : null
    );

    // Determine mode based on whether we have an existing source
    const mode = data.brokerId && currentSource ? "edit" : "create";

    const currentMapping =
        mode === "edit"
            ? {
                  brokerId: currentSource?.brokerId || data.brokerId || "",
                  mappedItemId: currentSource?.sourceDetails?.mappedItemId || data.mappedItemId || "",
                  source: currentSource?.sourceDetails?.source || data.source || "",
                  sourceId: currentSource?.sourceDetails?.sourceId || data.sourceId || "",
              }
            : undefined;

    return (
        <UserInputNodeSettings
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            workflowId={workflowId}
            mode={mode}
            currentMapping={currentMapping}
            onSuccess={() => {
                console.log("User input source saved successfully");
            }}
        />
    );
};

const UserInputNodeComponent: React.FC<SourceInputNodeProps> = ({ data, ...nodeProps }) => {
    const dispatch = useAppDispatch();
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();
    const workflowId = data.workflowId;

    const currentSource = useAppSelector((state) =>
        data.brokerId ? workflowsSelectors.userInputSourceByBrokerId(state, workflowId, data.brokerId) : null
    );

    // Handle duplicate
    const handleDuplicate = useCallback((nodeId: string) => {
        console.log("Duplicate clicked for source input node:", nodeId);
        // TODO: Implement duplicate logic
    }, []);

    // Handle delete
    const handleDelete = useCallback((nodeId: string) => {
        const currentMapping = {
            brokerId: currentSource?.brokerId || data.brokerId,
            mappedItemId: currentSource?.sourceDetails?.mappedItemId || data.mappedItemId,
            source: currentSource?.sourceDetails?.source || data.source,
            sourceId: currentSource?.sourceDetails?.sourceId || data.sourceId,
        };

        if (!currentMapping.brokerId) {
            console.error("No broker ID found for deletion");
            return;
        }

        // Remove from workflow sources
        if (currentMapping.sourceId) {
            dispatch(
                workflowActions.removeSourceByBrokerId({
                    id: currentMapping.sourceId,
                    brokerId: currentMapping.brokerId,
                })
            );
        }

        // Remove from broker registry
        if (currentMapping.source && currentMapping.mappedItemId) {
            dispatch(
                brokerActions.removeRegisterEntry({
                    source: currentMapping.source,
                    mappedItemId: currentMapping.mappedItemId,
                })
            );
        }

    }, [currentSource, data, dispatch]);

    const brokerId = currentSource?.brokerId || data.brokerId;
    const mappedItemId = currentSource?.sourceDetails?.mappedItemId || data.mappedItemId;
    const brokerDisplayName = brokerId ? dataBrokerRecordsById[brokerId]?.name || brokerId : "Unknown";

    // Get field label for better display
    const fieldLabel = useAppSelector((state) => (mappedItemId ? selectFieldLabel(state, mappedItemId) : null));

    // Generate display text
    const displayText = `${brokerDisplayName} Input`;

    // Configure the BaseNode with custom handles
    const config: NodeConfig = {
        nodeType: "userInput",
        icon: Download,
        displayText,

        // Custom handles for source nodes
        customInputs: [], // User input nodes typically don't have input handles
        
        customOutputs: [
            {
                name: brokerDisplayName || "Missing Broker Display Name",
                broker_id: brokerId || "",
                component: "UserInput",
                data_type: "string",
                description: fieldLabel || "User input field",
                output_type: "userInput",
            },
        ],

        // Settings modal
        SettingsComponent: SourceInputSettings,

        // Handlers
        onDuplicate: handleDuplicate,
        onDelete: handleDelete,

        // Feature configuration
        allowCompactMode: true,
        useWorkflowActions: false, // This is a source node, not a workflow node
    };

    return <BaseNode config={config} {...nodeProps} />;
};

export const UserInputSourceNode = memo(UserInputNodeComponent);
