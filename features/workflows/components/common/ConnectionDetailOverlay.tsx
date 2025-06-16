"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui";
import { DbFunctionNode, DbNodeData, WorkflowDependency } from "@/features/workflows/types";
import { addArgMappingWithBrokerId } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";
import { upsertWorkflowDependency } from "../../react-flow/node-editor/workflow-node-editor/utils/dependency-utils";

interface MatrxEdge {
    source: {
        id: string;
        label: string;
        type: string;
        handleId: string;
        node_id: string;
    };
    target: {
        id: string;
        label: string;
        type: string;
        handleId: string;
        node_id: string;
    };
}

interface ConnectionDetailOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialSourceNode: DbNodeData | null;
    initialTargetNode: DbNodeData | null;
    matrxEdge: MatrxEdge | null;
    onSaveConnection: (sourceNode: DbNodeData, targetNode: DbNodeData, matrxEdge: any) => void;
    onDirectAddRelay: (source_broker_id: string, target_broker_ids?: string) => void;
}

interface PendingOperation {
    type: "relay_creation";
    source_broker_id: string;
    target_broker_ids?: string;
}

interface CommonUpdateProps {
    sourceNode: any;
    targetNode: any;
    matrxEdge: MatrxEdge;
    handleUpdateSourceNode: (node: DbNodeData) => void;
    handleUpdateTargetNode: (node: DbNodeData) => void;
    setConnectionMessage: (message: string) => void;
    setIsDirty: (dirty: boolean) => void;
    setPendingOperation: (operation: PendingOperation | null) => void;
}

interface CommonSingleNodeUpdateProps {
    node: any;
    matrxEdge: MatrxEdge;
    handleUpdateNode: (node: DbNodeData) => void;
}

const getNodeType = (nodeData: any): string => {
    if (!nodeData) return "unknown";
    if (nodeData.type === "userInput") return "userInput";
    if (nodeData.type === "brokerRelay") return "brokerRelay";
    if (nodeData.node_type !== undefined) return "workflowNode";
    return "unknown";
};

const getConnectionFieldMapping = (nodeType: string, connectionType: string, isSource: boolean): string => {
    if (isSource) {
        if (nodeType === "userInput") return "broker_id";
        if (nodeType === "brokerRelay") return "target_broker_ids";
        if (nodeType === "workflowNode") return "return_broker_overrides";
    } else {
        if (nodeType === "workflowNode") {
            if (connectionType === "dependency") return "additional_dependencies";
            if (connectionType === "direct_broker" || connectionType === "return_broker") return "arg_mapping";
            if (connectionType === "argument") return "arg_mapping";
        }
        if (nodeType === "brokerRelay") return "source_broker_id";
    }
    return "unknown";
};

const handleAddArgMapping = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    const brokerId = matrxEdge.source.id;
    const argName = matrxEdge.target.id;
    console.log("handleAddArgMapping brokerId", brokerId);
    console.log("handleAddArgMapping argName", argName);

    const existingMapping = node.arg_mapping?.find(
        (mapping: any) => mapping.source_broker_id === brokerId && mapping.target_arg_name === argName
    );
    console.log("handleAddArgMapping existingMapping", existingMapping);

    if (existingMapping) {
        console.log("handleAddArgMapping existingMapping found, skipping");
        return;
    }

    addArgMappingWithBrokerId(node, handleUpdateNode, argName, brokerId);
};

const handleUpdateUserInputSource = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    console.log("📝 UPDATE: User Input source needs update");
    // TODO: Implement logic to update user input source (broker_id)
};

const handleUserInputWithoutBrokerId = (
    sourceNode: any,
    targetNode: any,
    matrxEdge: MatrxEdge,
    handleUpdateTargetNode: (node: DbNodeData) => void
) => {
    console.warn("UNKNOWN SOURCE: Source ID is empty, cannot create connection", matrxEdge);
    // For now, we cannot create a dependency without a source broker ID
    // TODO: Implement logic to handle unknown source (possibly update user input to add broker_id first)
};

const handleUserInputToBrokerIdToWorkflowNodeArgMapping = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    if (!matrxEdge.source.id || matrxEdge.source.id === "") {
        return handleUserInputWithoutBrokerId(sourceNode, targetNode, matrxEdge, handleUpdateTargetNode);
    }

    handleAddArgMapping({ node: targetNode, matrxEdge, handleUpdateNode: handleUpdateTargetNode });
};

// Target update placeholders
const handleAddAdditionalDependency = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    const partialDependency: WorkflowDependency = {
        source_broker_id: matrxEdge.source.id,
        source_broker_name: "",
        target_broker_id: "",
        target_broker_name: "",
    };

    upsertWorkflowDependency(node, partialDependency, handleUpdateNode);
};

const handleUpdateBrokerRelayTarget = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    console.log("📝 UPDATE: Updating broker relay target");
    // TODO: Implement logic to update broker relay target (source_broker_id)
};

// Connection handler methods (placeholders for now)
const handleUserInputToBrokerIdToWorkflowNodeAdditionalDependencies = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    console.log("🔗 METHOD: handleUserInputToBrokerIdToWorkflowNodeAdditionalDependencies");

    if (!matrxEdge.source.id || matrxEdge.source.id === "") {
        console.warn("UNKNOWN SOURCE: Source ID is empty, cannot create dependency", matrxEdge);
        return;
    }
    handleAddAdditionalDependency({ node: targetNode, matrxEdge, handleUpdateNode: handleUpdateTargetNode });
};

const handleUserInputToBrokerIdToBrokerRelaySourceBrokerId = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    console.log("🔗 METHOD: handleUserInputToBrokerIdToBrokerRelaySourceBrokerId");
    // TODO: Implement logic to set relay source_broker_id
};

const handleBrokerRelayTargetBrokerIdsToWorkflowNodeAdditionalDependencies = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    console.log("🔗 METHOD: handleBrokerRelayTargetBrokerIdsToWorkflowNodeAdditionalDependencies");

    if (!matrxEdge.source.id || matrxEdge.source.id === "") {
        return handleBrokerRelayWithoutBrokerId({ node: sourceNode, matrxEdge, handleUpdateNode: handleUpdateSourceNode });
    }
    handleUpdateBrokerRelaySource({ node: sourceNode, matrxEdge, handleUpdateNode: handleUpdateSourceNode });

    handleAddAdditionalDependency({ node: targetNode, matrxEdge, handleUpdateNode: handleUpdateTargetNode });
};

const handleBrokerRelayWithoutBrokerId = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    console.warn("UNKNOWN SOURCE: Broker Relay source ID is empty, cannot create connection", matrxEdge);
    // For now, we cannot create a dependency without a source broker ID
    // TODO: Implement logic for broker relay without source broker ID (possibly add to additional_dependencies)
};

const handleUpdateBrokerRelaySource = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    console.log("📝 UPDATE: Broker Relay source needs update");
    // TODO: Implement logic to update broker relay source node
};

const handleBrokerRelayTargetBrokerIdsToWorkflowNodeArgMapping = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    if (!matrxEdge.source.id || matrxEdge.source.id === "") {
        return handleBrokerRelayWithoutBrokerId({ node: sourceNode, matrxEdge, handleUpdateNode: handleUpdateSourceNode });
    }

    handleUpdateBrokerRelaySource({ node: sourceNode, matrxEdge, handleUpdateNode: handleUpdateSourceNode });

    handleAddArgMapping({ node: targetNode, matrxEdge, handleUpdateNode: handleUpdateTargetNode });
};

const handleBrokerRelayTargetBrokerIdsToBrokerRelaySourceBrokerId = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    console.log("🔗 METHOD: handleBrokerRelayTargetBrokerIdsToBrokerRelaySourceBrokerId");
    // TODO: Implement logic for relay to relay connection
};

const handleUpdateWorkflowNodeSource = ({ node, matrxEdge, handleUpdateNode }: CommonSingleNodeUpdateProps) => {
    console.log("📝 UPDATE: Workflow Node source needs update");
};

const handleWorkflowNodeReturnBrokerOverridesToWorkflowNodeArgMapping = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
}: CommonUpdateProps) => {
    if (!matrxEdge.source.id || matrxEdge.source.id === "") {
        console.warn("UNKNOWN SOURCE: Workflow Node source ID is empty, cannot create connection", matrxEdge);
        return;
    }

    console.log("The source doesn't need any updates");

    handleAddArgMapping({ node: targetNode, matrxEdge, handleUpdateNode: handleUpdateTargetNode });
};

const handleWorkflowNodeReturnBrokerOverridesToWorkflowNodeAdditionalDependencies = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
    setConnectionMessage,
    setIsDirty,
    setPendingOperation,
}: CommonUpdateProps) => {
    console.log("🔗 METHOD: handleWorkflowNodeReturnBrokerOverridesToWorkflowNodeAdditionalDependencies");

    setConnectionMessage("This will create a new relay to connect these brokers.");
    setIsDirty(true);
    setPendingOperation({
        type: "relay_creation",
        source_broker_id: matrxEdge.source.id,
        target_broker_ids: matrxEdge.target.id,
    });
};

const handleWorkflowNodeReturnBrokerOverridesToBrokerRelaySourceBrokerId = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
    setConnectionMessage,
}: CommonUpdateProps & { setConnectionMessage?: (message: string) => void }) => {
    console.log("🔗 METHOD: handleWorkflowNodeReturnBrokerOverridesToBrokerRelaySourceBrokerId");

    // Check if the relay already has a source_broker_id
    if (matrxEdge.target.id && matrxEdge.target.id !== "") {
        // Relay already has a source broker - show message instead of updating
        if (setConnectionMessage) {
            setConnectionMessage(
                "To map this broker to another node, simply drag and connect it to the destination and a new relay will be automatically created or a new map entry will be made."
            );
        }
        return;
    }

    // Relay doesn't have a source broker - we can update it directly
    const updatedTargetNode = {
        ...targetNode,
        source_broker_id: matrxEdge.source.id,
    };

    handleUpdateTargetNode(updatedTargetNode);
};

const getConnectionType = (sourceNode: any, targetNode: any, matrxEdge: MatrxEdge): string => {
    if (!sourceNode || !targetNode || !matrxEdge) return "unknown";

    const sourceNodeType = getNodeType(sourceNode);
    const targetNodeType = getNodeType(targetNode);
    const sourceConnectionType = matrxEdge?.source.type;
    const targetConnectionType = matrxEdge?.target.type;

    const sourceField = getConnectionFieldMapping(sourceNodeType, sourceConnectionType, true);
    const targetField = getConnectionFieldMapping(targetNodeType, targetConnectionType, false);

    const connectionType = `${sourceNodeType}_${sourceField} → ${targetNodeType}_${targetField}`;

    return connectionType;
};

const handleConnection = ({
    sourceNode,
    targetNode,
    matrxEdge,
    handleUpdateSourceNode,
    handleUpdateTargetNode,
    setConnectionMessage,
    setIsDirty,
    setPendingOperation,
}: CommonUpdateProps) => {
    const connectionType = getConnectionType(sourceNode, targetNode, matrxEdge);

    // Trigger the appropriate handler method based on connection type
    if (connectionType === "userInput_broker_id → workflowNode_additional_dependencies") {
        handleUserInputToBrokerIdToWorkflowNodeAdditionalDependencies({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "userInput_broker_id → workflowNode_arg_mapping") {
        handleUserInputToBrokerIdToWorkflowNodeArgMapping({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "userInput_broker_id → brokerRelay_source_broker_id") {
        handleUserInputToBrokerIdToBrokerRelaySourceBrokerId({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "brokerRelay_target_broker_ids → workflowNode_additional_dependencies") {
        handleBrokerRelayTargetBrokerIdsToWorkflowNodeAdditionalDependencies({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "brokerRelay_target_broker_ids → workflowNode_arg_mapping") {
        handleBrokerRelayTargetBrokerIdsToWorkflowNodeArgMapping({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "brokerRelay_target_broker_ids → brokerRelay_source_broker_id") {
        handleBrokerRelayTargetBrokerIdsToBrokerRelaySourceBrokerId({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "workflowNode_return_broker_overrides → workflowNode_additional_dependencies") {
        handleWorkflowNodeReturnBrokerOverridesToWorkflowNodeAdditionalDependencies({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "workflowNode_return_broker_overrides → workflowNode_arg_mapping") {
        handleWorkflowNodeReturnBrokerOverridesToWorkflowNodeArgMapping({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else if (connectionType === "workflowNode_return_broker_overrides → brokerRelay_source_broker_id") {
        handleWorkflowNodeReturnBrokerOverridesToBrokerRelaySourceBrokerId({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    } else {
        console.log("⚠️  UNKNOWN CONNECTION TYPE:", connectionType);
        const sourceNodeType = getNodeType(sourceNode);
        const targetNodeType = getNodeType(targetNode);
        const sourceConnectionType = matrxEdge?.source.type;
        const targetConnectionType = matrxEdge?.target.type;
        const sourceField = getConnectionFieldMapping(sourceNodeType, sourceConnectionType, true);
        const targetField = getConnectionFieldMapping(targetNodeType, targetConnectionType, false);
        console.log("   → Source:", { nodeType: sourceNodeType, connectionType: sourceConnectionType, field: sourceField });
        console.log("   → Target:", { nodeType: targetNodeType, connectionType: targetConnectionType, field: targetField });
    }

    return connectionType;
};

export const ConnectionDetailOverlay: React.FC<ConnectionDetailOverlayProps> = ({
    isOpen,
    onClose,
    initialSourceNode,
    initialTargetNode,
    matrxEdge,
    onSaveConnection,
    onDirectAddRelay,
}) => {
    const [sourceNode, setSourceNode] = useState<DbNodeData | null>(null);
    const [targetNode, setTargetNode] = useState<DbNodeData | null>(null);
    const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);

    // Reset state when dialog opens with new data
    useEffect(() => {
        if (isOpen && initialSourceNode && initialTargetNode && matrxEdge) {
            setSourceNode(initialSourceNode);
            setTargetNode(initialTargetNode);
            setConnectionMessage(null);
            setIsDirty(false);
            setPendingOperation(null);
        }
    }, [isOpen, initialSourceNode, initialTargetNode, matrxEdge]);

    const handleUpdateSourceNode = (node: DbNodeData) => {
        setSourceNode(node);
        setIsDirty(true);
    };

    const handleUpdateTargetNode = (node: DbNodeData) => {
        setTargetNode(node);
        setIsDirty(true);
    };

    // Calculate connection type and handle connection only when we have valid data
    const connectionType = useMemo(() => {
        if (!sourceNode || !targetNode || !matrxEdge) return null;
        
        return handleConnection({
            sourceNode,
            targetNode,
            matrxEdge,
            handleUpdateSourceNode,
            handleUpdateTargetNode,
            setConnectionMessage,
            setIsDirty,
            setPendingOperation,
        });
    }, [sourceNode, targetNode, matrxEdge]);

    const sourceNodeType = useMemo(() => getNodeType(sourceNode), [sourceNode]);
    const targetNodeType = useMemo(() => getNodeType(targetNode), [targetNode]);

    const handleSaveConnectionWithLogic = () => {
        if (isDirty && sourceNode && targetNode && matrxEdge) {
            // Handle pending operations
            if (pendingOperation && pendingOperation.type === "relay_creation") {
                onDirectAddRelay(pendingOperation.source_broker_id, pendingOperation.target_broker_ids);
            }

            // Save node updates
            onSaveConnection(sourceNode, targetNode, matrxEdge);
            
            setIsDirty(false);
            setPendingOperation(null);
            setConnectionMessage(null);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-7xl w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Connection Details
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
                        Review and configure the connection between workflow nodes
                    </DialogDescription>
                </DialogHeader>

                {/* Connection Summary */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Connection Summary</h3>

                    {/* Connection Type */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Connection Type</h4>
                        <p className="text-sm font-mono text-blue-800 dark:text-blue-200">{connectionType || "Loading..."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Source Info */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Node Type:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">{sourceNodeType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Node ID:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.source?.node_id || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Source ID:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.source?.id || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Connection Type:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.source?.type || "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Target Info */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Target</h4>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Node Type:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">{targetNodeType}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Node ID:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.target?.node_id || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Target ID:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.target?.id || "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Connection Type:</span>
                                    <span className="text-xs font-mono text-gray-800 dark:text-gray-200">
                                        {matrxEdge?.target?.type || "N/A"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connection Message */}
                {connectionMessage && (
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Connection Information</h3>
                                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                                        <p>{connectionMessage}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Grid */}
                <div className="p-4 flex-1 overflow-auto">
                    <div className="grid grid-cols-2 gap-4 h-full">
                        {/* Source Node Data */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex flex-col">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Source Node Data</h3>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto flex-1 font-mono text-gray-800 dark:text-gray-200 mb-4">
                                {sourceNode ? JSON.stringify(sourceNode, null, 2) : "No source node data"}
                            </pre>

                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">MatrxEdge.source</h4>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto flex-1 font-mono text-gray-800 dark:text-gray-200">
                                {matrxEdge?.source ? JSON.stringify(matrxEdge.source, null, 2) : "No source edge data"}
                            </pre>
                        </div>

                        {/* Target Node Data */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex flex-col">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Target Node Data</h3>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto flex-1 font-mono text-gray-800 dark:text-gray-200 mb-4">
                                {targetNode ? JSON.stringify(targetNode, null, 2) : "No target node data"}
                            </pre>

                            <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">MatrxEdge.target</h4>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-auto flex-1 font-mono text-gray-800 dark:text-gray-200">
                                {matrxEdge?.target ? JSON.stringify(matrxEdge.target, null, 2) : "No target edge data"}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Footer with Action Buttons */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        onClick={handleSaveConnectionWithLogic}
                        disabled={!isDirty}
                        className={isDirty ? "" : "opacity-50 cursor-not-allowed"}
                    >
                        Save Connection
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
