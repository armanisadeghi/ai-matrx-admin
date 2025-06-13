// Default object for to_argument connection type
export const DEFAULT_TO_ARGUMENT_EDGE = {
    id: "",
    source: "",
    target: "",
    sourceHandle: "output",
    targetHandle: "input",
    type: "custom",
    animated: true,
    isVirtual: true,
    style: {
        stroke: "#10b981",
        strokeWidth: 2,
        strokeDasharray: "5,5",
    },
    data: {
        connectionType: "to_argument",
        sourceBrokerId: "",
        sourceBrokerName: "",
        targetBrokerId: "",
        targetBrokerName: "",
        metadata: {
            isKnownBroker: false,
        },
        label: "",
    },
} as const;

// Default object for to_relay connection type
export const DEFAULT_TO_RELAY_EDGE = {
    id: "",
    source: "",
    target: "",
    sourceHandle: "output",
    targetHandle: "input",
    type: "custom",
    animated: false,
    isVirtual: true,
    style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
    },
    data: {
        sourceBrokerId: "",
        sourceBrokerName: "",
        targetBrokerId: "",
        targetBrokerName: "",
        metadata: {
            isKnownBroker: false,
        },
        label: "Relay",
    },
} as const;

// Default object for to_dependency connection type
export const DEFAULT_TO_DEPENDENCY_EDGE = {
    id: "",
    source: "",
    target: "",
    sourceHandle: "output",
    targetHandle: "input",
    type: "custom",
    animated: true,
    isVirtual: true,
    style: {
        stroke: "#8b5cf6",
        strokeWidth: 1,
        strokeDasharray: "2,2",
    },
    data: {
        sourceBrokerId: "",
        sourceBrokerName: "",
        targetBrokerId: "",
        targetBrokerName: "",
        metadata: {
            isKnownBroker: false,
        },
        label: "Dependency",
    },
} as const;
