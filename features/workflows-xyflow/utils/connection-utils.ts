import { Connection, Edge } from "@xyflow/react";

// const handleConnect: OnConnect = useCallback(
//     (connection) => {
//         console.log('-> onConnect called with connection:', {
//             isValid: isValidConnection(connection),
//             sourceNode: nodes.find(n => n.id === connection.source),
//             targetNode: nodes.find(n => n.id === connection.target),
//         });
//         console.log(JSON.stringify(connection, null, 2));

//         if (isValidConnection(connection)) {
//             // Create a new edge with proper styling and ID
//             const newEdge: Edge = {
//                 id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
//                 source: connection.source!,
//                 target: connection.target!,
//                 sourceHandle: connection.sourceHandle,
//                 targetHandle: connection.targetHandle,
//                 type: "smoothstep",
//                 animated: false,
//                 style: {
//                     strokeWidth: 2,
//                     stroke: currentTheme === "dark" ? "#6b7280" : "#374151",
//                 },
//                 data: {
//                     // Store connection metadata for future use
//                     createdAt: new Date().toISOString(),
//                     isTemporary: true, // Mark as temporary until backend is implemented
//                 },
//             };

//             console.log('✅ Creating new edge:', newEdge);
//             setEdges((eds) => [...eds, newEdge]);
//         } else {
//             console.log('❌ Connection rejected - validation failed');
//         }
//     },
//     [setEdges, isValidConnection, currentTheme, nodes]
// );

// Example Connection to broker dependency
// {
//     "animated": false,
//     "type": "default",
//     "style": {
//       "strokeWidth": 2,
//       "stroke": "#6b7280"
//     },
//     "source": "b1d49dbe-32a9-4b44-bf15-6a0e03e4165e",
//     "sourceHandle": "7b601ec6-c20a-40d9-8d35-80796083f8db",
//     "target": "7c55700f-3e38-4ee3-b2a7-85e3c425a3e3",
//     "targetHandle": "broker-5d8c5ed2-5a84-476a-9258-6123a45f996a"
//   }
//
// Example connection to argument
// {
//     "animated": false,
//     "type": "default",
//     "style": {
//       "strokeWidth": 2,
//       "stroke": "#6b7280"
//     },
//     "source": "7c55700f-3e38-4ee3-b2a7-85e3c425a3e3",
//     "sourceHandle": "784f9b61-81cc-44af-8d24-a1cc3d9eac56",
//     "target": "c68b99e1-f223-4909-8210-6c2c488a6dd2",
//     "targetHandle": "argument-keyword"
//   }

interface ArgMapping {
    arg_name: string;
    ready: boolean;
}

// Simple type mapping
type MappingDetails = {
    user_input: any;
    arg_mapping: ArgMapping;
    dependency: Record<string, any>;
    environment: Record<string, any>;
    other: Record<string, any>;
};

interface InputConfig<T extends keyof MappingDetails = keyof MappingDetails> {
    mappingType: T;
    scope: "global" | "session" | "task" | "organization" | "user" | "workflow" | "action" | "temporary" | string;
    scopeId: string;
    brokerId: string;
    mappingDetails: MappingDetails[T];
    extraction?: "label" | "id" | "object" | "string" | null;
    metadata?: Record<string, any> | null;
}

interface Bookmark {
    name?: string | null;
    path?: string[];
}

interface Result {
    component?: string | null;
    bookmark?: Bookmark | null;
    metadata?: Record<string, any>;
}


interface Relay {
    type?: string | null;
    id?: string | null;
}

interface Output {
    broker_id: string | null;
    is_default_output: boolean;
    name: string | null;
    bookmark: Bookmark | null;
    conversion: any;
    data_type: string | null;
    result: Result | null;
    relays?: Relay[];
    metadata: Record<string, any>;
}


interface ConnectionResult {
    edge: Edge;
    inputConfig: InputConfig;
    output: Output;
}


const filterBrokerData = (connection: Connection, workflowId: string, sourceOutput: Output): ConnectionResult => {
    const sourceHandleId = connection.sourceHandle;
    const targetType = connection.targetHandle?.split("-")[0];
    const targetHandleId = connection.targetHandle?.split("-")[1];
    let updatedInput: InputConfig;
    let updatedOutput: Output;

    if (sourceHandleId === targetHandleId) {
        console.log("-> source and target are the same. No node changes needed. Just create an edge.");
    } else if (targetType === "broker") {
        console.log("-> target is a broker");
        const relay: Relay = {
            type: "broker",
            id: targetHandleId,
        };
        updatedOutput = {
            ...sourceOutput,
            relays: [...sourceOutput.relays, relay],
        }
    } else if (targetType === "argument") {
        console.log("-> target is an argument");
        const mappingEntry: ArgMapping = {
            arg_name: targetHandleId,
            ready: true,
        };
        const inputConfig: InputConfig<"arg_mapping"> = {
            mappingType: "arg_mapping",
            scope: "workflow",
            scopeId: workflowId,
            brokerId: sourceHandleId,
            mappingDetails: mappingEntry,
        };
    }

    const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "smoothstep",
        animated: false,
        style: {
            strokeWidth: 2,
        },
        data: {
            // Store connection metadata for future use
            createdAt: new Date().toISOString(),
            isTemporary: true, // Mark as temporary until backend is implemented
        },
    };

    return {
        edge: newEdge,
        inputConfig: updatedInput,
        output: updatedOutput,
    };
};

const processConnectionToBroker = (connection: Connection, workflowId: string, sourceOutput: Output): Output => {
    const sourceHandleId = connection.sourceHandle;
    const targetType = connection.targetHandle?.split("-")[0];
    const targetHandleId = connection.targetHandle?.split("-")[1];
    const relay: Relay = {
        type: "broker",
        id: targetHandleId,
    };
    const updatedOutput: Output = {
        ...sourceOutput,
        relays: [...sourceOutput.relays, relay],
    }

    return updatedOutput;
}

const processConnectionToArgument = (connection: Connection, workflowId: string): InputConfig<"arg_mapping"> => {
    const sourceHandleId = connection.sourceHandle;
    const targetType = connection.targetHandle?.split("-")[0];
    const targetHandleId = connection.targetHandle?.split("-")[1];
    const mappingEntry: ArgMapping = {
        arg_name: targetHandleId,
        ready: true,
    };
    const inputConfig: InputConfig<"arg_mapping"> = {
        mappingType: "arg_mapping",
        scope: "workflow",
        scopeId: workflowId,
        brokerId: sourceHandleId,
        mappingDetails: mappingEntry,
    };

    return inputConfig;
}

const createEdgeFromConnection = (connection: Connection): Edge => {
    const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: "smoothstep",
        animated: false,
    };
    return newEdge;
}

