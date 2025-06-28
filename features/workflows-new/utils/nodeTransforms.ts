import { Node } from "@xyflow/react";
import { WorkflowNodeData } from "@/lib/redux/workflow-node/types";
import { InputMapping } from "@/lib/redux/workflow/types";

// Helper to calculate z-index based on creation time
const getNodeZIndex = (nodeData: WorkflowNodeData): number => {
    // Base z-index of 1
    let zIndex = 1;

    // If we have a created_at timestamp, use it to calculate z-index
    if (nodeData.created_at) {
        const timestamp = new Date(nodeData.created_at).getTime();
        // Use the timestamp to create a higher z-index for newer nodes
        // This ensures duplicated nodes appear on top
        zIndex = Math.floor(timestamp / 1000) % 10000; // Keep it reasonable
    }

    return zIndex;
};

// Convert Redux WorkflowNodeData to React Flow Node
export const nodeToReactFlow = (nodeData: WorkflowNodeData): Node => {
    // Extract position from ui_data or use default
    const uiData = nodeData.ui_data || {};

    // Provide safe defaults for position
    let position = { x: 100, y: 100 };
    if (
        uiData.position &&
        typeof uiData.position.x === "number" &&
        typeof uiData.position.y === "number" &&
        !isNaN(uiData.position.x) &&
        !isNaN(uiData.position.y)
    ) {
        position = uiData.position;
    } else {
        // Generate a semi-random position if no valid position exists
        position = {
            x: Math.random() * 400 + 50,
            y: Math.random() * 300 + 50,
        };
    }

    const width = typeof uiData.width === "number" && uiData.width > 0 ? uiData.width : 200;
    const height = typeof uiData.height === "number" && uiData.height > 0 ? uiData.height : 150;

    return {
        id: nodeData.id,
        type: nodeData.node_type || "default",
        position,
        data: {
            // Include all the Redux data for the node component to use
            ...nodeData,
            // Add computed properties for React Flow
            label: nodeData.step_name || `Node ${nodeData.id.slice(0, 8)}`,
            inputs: nodeData.inputs || [],
            outputs: nodeData.outputs || [],
            dependencies: nodeData.dependencies || [],
        },
        selected: false,
        dragging: false,
        // Set z-index based on creation time or explicit value
        zIndex: uiData.zIndex || getNodeZIndex(nodeData),
        // Add measured dimensions for SSR compatibility
        measured: {
            width,
            height,
        },
    };
};

// Convert React Flow Node back to Redux WorkflowNodeData
export const reactFlowToNode = (node: Node): Partial<WorkflowNodeData> => {
    const nodeData = node.data as unknown as WorkflowNodeData;

    return {
        ...nodeData,
        ui_data: {
            ...nodeData.ui_data,
            position: node.position,
            selected: node.selected,
            dragging: node.dragging,
            width: node.measured?.width,
            height: node.measured?.height,
        },
    };
};

// Helper to create a new node with default values
export const createNewNode = (
    type: string,
    position: { x: number; y: number },
    workflowId: string,
    userId: string,
    functionId?: string
): Omit<WorkflowNodeData, "id" | "created_at" | "updated_at"> => {
    return {
        workflow_id: workflowId,
        function_id: functionId || null,
        type,
        step_name: `New ${type} Node`,
        node_type: type,
        execution_required: false,
        inputs: createDefaultInputs(type) as InputMapping[],
        outputs: createDefaultOutputs(type),
        dependencies: [],
        metadata: {},
        ui_data: {
            position,
            selected: false,
            dragging: false,
            width: 200,
            height: 150,
        },
        is_public: false,
        authenticated_read: true,
        public_read: false,
        user_id: userId,
    };
};

// Create default inputs based on node type
const createDefaultInputs = (nodeType: string) => {
    switch (nodeType) {
        case "functionNode":
            return [
                {
                    type: "arg_mapping",
                    arg_name: null,
                    source_broker_id: null,
                    default_value: null,
                    metadata: {},
                },
            ];
        case "userInput":
            return [
                {
                    type: "broker",
                    arg_name: null,
                    source_broker_id: null,
                    default_value: null,
                    metadata: {},
                },
            ];
        case "brokerRelay":
            return [
                {
                    type: "broker",
                    arg_name: null,
                    source_broker_id: null,
                    default_value: null,
                    metadata: {},
                },
            ];
        default:
            return [
                {
                    type: "broker",
                    arg_name: null,
                    source_broker_id: null,
                    default_value: null,
                    metadata: {},
                },
            ];
    }
};

// Create default outputs based on node type
const createDefaultOutputs = (nodeType: string) => {
    const brokerId = `broker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    switch (nodeType) {
        case "functionNode":
            return [
                {
                    broker_id: brokerId,
                    name: "result",
                    bookmark: null,
                    conversion: null,
                    data_type: "any",
                    result: null,
                    relays: [],
                    metadata: {},
                },
            ];
        case "userInput":
            return [
                {
                    broker_id: brokerId,
                    name: "user_data",
                    bookmark: null,
                    conversion: null,
                    data_type: "string",
                    result: null,
                    relays: [],
                    metadata: {},
                },
            ];
        case "brokerRelay":
            return [
                {
                    broker_id: brokerId,
                    name: "relayed_data",
                    bookmark: null,
                    conversion: null,
                    data_type: "message",
                    result: null,
                    relays: [],
                    metadata: {},
                },
            ];
        default:
            return [
                {
                    broker_id: brokerId,
                    name: "output",
                    bookmark: null,
                    conversion: null,
                    data_type: "any",
                    result: null,
                    relays: [],
                    metadata: {},
                },
            ];
    }
};

// Helper to validate node data
export const validateNodeData = (nodeData: Partial<WorkflowNodeData>): boolean => {
    return !!(nodeData.workflow_id && nodeData.type && nodeData.step_name && nodeData.node_type);
};

// Helper to calculate node bounds for grouping
export const calculateNodeBounds = (nodes: Node[]) => {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    const positions = nodes.map((node) => ({
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width || 200,
        height: node.measured?.height || 150,
    }));

    const minX = Math.min(...positions.map((p) => p.x));
    const minY = Math.min(...positions.map((p) => p.y));
    const maxX = Math.max(...positions.map((p) => p.x + p.width));
    const maxY = Math.max(...positions.map((p) => p.y + p.height));

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
    };
};

// Helper to find a good position for a new node
export const findGoodNodePosition = (existingNodes: Node[], preferredPosition?: { x: number; y: number }) => {
    if (preferredPosition) {
        // Check if the preferred position overlaps with existing nodes
        const overlaps = existingNodes.some((node) => {
            const nodeWidth = node.measured?.width || 200;
            const nodeHeight = node.measured?.height || 150;

            return (
                preferredPosition.x < node.position.x + nodeWidth &&
                preferredPosition.x + 200 > node.position.x &&
                preferredPosition.y < node.position.y + nodeHeight &&
                preferredPosition.y + 150 > node.position.y
            );
        });

        if (!overlaps) {
            return preferredPosition;
        }
    }

    // Find an empty spot
    const gridSize = 250; // Space between nodes
    let x = 50;
    let y = 50;

    while (true) {
        const overlaps = existingNodes.some((node) => {
            const nodeWidth = node.measured?.width || 200;
            const nodeHeight = node.measured?.height || 150;

            return (
                x < node.position.x + nodeWidth &&
                x + 200 > node.position.x &&
                y < node.position.y + nodeHeight &&
                y + 150 > node.position.y
            );
        });

        if (!overlaps) {
            return { x, y };
        }

        x += gridSize;
        if (x > 1000) {
            x = 50;
            y += gridSize;
        }
    }
};
