"use client";

import React, { memo, useCallback } from "react";
import { NodeProps, Position, useNodeId, useReactFlow } from "@xyflow/react";
import { Download } from "lucide-react";
import { BaseNode, NodeConfig, BaseNodeData } from "../../BaseNode";
import { BaseNodeToolbar } from "../../BaseNodeToolbar";
import UserInputNodeSettings from "./UserInputNodeSettings";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectFieldLabel } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useDataBrokerWithFetch } from "@/lib/redux/entity/hooks/entityMainHooks";
import { workflowSelectors } from "@/lib/redux/workflow/selectors";
import { workflowActions } from "@/lib/redux/workflow/slice";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { useToast } from "@/components/ui/use-toast";

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

// Custom toolbar component
const SourceInputNodeToolbar: React.FC<{
    nodeId: string;
    isVisible: boolean;
    isCompact: boolean;
    displayMode: "detailed" | "compact";
    onDisplayModeToggle: () => void;
    onSettings?: () => void;
}> = (props) => {
    const { getNode } = useReactFlow();
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    const node = getNode(props.nodeId);
    const data = (node?.data || {}) as SourceInputNodeData;

    // Get Redux data for this source
    const currentSource = useAppSelector((state) =>
        data.brokerId ? workflowSelectors.userInputSourceByBrokerId(state, data.brokerId) : null
    );

    const handleCustomDelete = useCallback(
        async (nodeId: string) => {
            const currentMapping = {
                brokerId: currentSource?.brokerId || data.brokerId,
                mappedItemId: currentSource?.sourceDetails?.mappedItemId || data.mappedItemId,
                source: currentSource?.sourceDetails?.source || data.source,
                sourceId: currentSource?.sourceDetails?.sourceId || data.sourceId,
            };

            if (!currentMapping.brokerId) {
                throw new Error("No broker ID found for deletion");
            }

            // Remove from workflow sources
            if (currentMapping.sourceId) {
                dispatch(workflowActions.selectWorkflow(currentMapping.sourceId));
                dispatch(
                    workflowActions.removeSource({
                        sourceType: "user_input",
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

            toast({
                title: "Source Input Deleted",
                description: "Source input node deleted successfully.",
            });
        },
        [currentSource, data, dispatch, toast]
    );

    return <BaseNodeToolbar {...props} onDelete={handleCustomDelete} />;
};

// Custom settings component wrapper
const SourceInputSettings: React.FC<{
    nodeId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}> = ({ nodeId, isOpen, onOpenChange }) => {
    const { getNode } = useReactFlow();
    const node = getNode(nodeId);
    const data = (node?.data || {}) as SourceInputNodeData;

    // Get Redux data for this source
    const currentSource = useAppSelector((state) =>
        data.brokerId ? workflowSelectors.userInputSourceByBrokerId(state, data.brokerId) : null
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
            workflowId={data.sourceId || ""}
            mode={mode}
            currentMapping={currentMapping}
            onSuccess={() => {
                console.log("User input source saved successfully");
            }}
        />
    );
};

const SourceInputNodeComponent: React.FC<SourceInputNodeProps> = ({ data, ...nodeProps }) => {
    const nodeId = useNodeId();
    const dispatch = useAppDispatch();
    const { dataBrokerRecordsById } = useDataBrokerWithFetch();

    // Get Redux data for this source
    const currentSource = useAppSelector((state) =>
        data.brokerId ? workflowSelectors.userInputSourceByBrokerId(state, data.brokerId) : null
    );

    // Custom display mode toggle handler that saves to metadata
    const handleDisplayModeToggle = useCallback((nodeId: string, newDisplayMode: "detailed" | "compact") => {
        if (currentSource && data.workflowId) {
            // Update the source metadata in Redux
            dispatch(workflowActions.updateSource({
                sourceType: "user_input",
                brokerId: currentSource.brokerId,
                source: {
                    ...currentSource,
                    metadata: {
                        ...currentSource.metadata,
                        displayMode: newDisplayMode
                    }
                }
            }));
        }
    }, [currentSource, data.workflowId, dispatch]);

    const brokerId = currentSource?.brokerId || data.brokerId;
    const mappedItemId = currentSource?.sourceDetails?.mappedItemId || data.mappedItemId;
    const brokerDisplayName = brokerId ? dataBrokerRecordsById[brokerId]?.name || brokerId : "Unknown";

    // Get field label for better display
    const fieldLabel = useAppSelector((state) => (mappedItemId ? selectFieldLabel(state, mappedItemId) : null));

    // Generate display text
    const displayText = `${brokerDisplayName} Input`;

    // Configure the BaseNode with simple handle arrays
    const config: NodeConfig = {
        nodeType: "userInput",
        icon: Download,
        displayText,

        // Simple handles - just labels and dots
        inputHandles: [
            {
                id: `${nodeId}-${mappedItemId}`,
                label: fieldLabel || "Missing Field Label",
            },
        ],
        outputHandles: [
            {
                id: `${nodeId}-${brokerId}`,
                label: brokerDisplayName || "Missing Broker Display Name",
            },
        ],

        // Custom components
        ToolbarComponent: SourceInputNodeToolbar,
        SettingsComponent: SourceInputSettings,

        // Event handlers
        onDisplayModeToggle: handleDisplayModeToggle,

        // Feature configuration
        showActiveToggle: true,
        showStatusIcons: true,
        allowCompactMode: true,
    };

    return <BaseNode config={config} {...nodeProps} />;
};

export const SourceInputNode = memo(SourceInputNodeComponent);
