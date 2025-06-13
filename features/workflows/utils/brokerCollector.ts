import { FunctionNode, ConvertedWorkflowData } from "@/features/workflows/types";

/**
 * Structure returned by prepareWorkflowData() - used for execution
 */
export interface PreparedWorkflowData {
    nodes: FunctionNode[];
    user_inputs: Array<{ broker_id: string; value: any }>;
    relays: Array<{ source: string; targets: string[] }>;
}

/**
 * Represents a connection to/from a broker in the pub/sub system
 */
export interface BrokerConnection {
    nodeId: string;
    nodeName: string;
    connectionType: "user_input" | "relay" | "function_node" | "dependency_relay";
    details?: string; // Additional context like arg name, value, etc.
}

/**
 * Represents a broker in the pub/sub system
 */
export interface BrokerInfo {
    id: string;
    producers: BrokerConnection[]; // Who publishes TO this broker
    consumers: BrokerConnection[]; // Who subscribes FROM this broker
}

/**
 * Organized collection of all broker information
 */
export interface WorkflowBrokerCollection {
    allBrokers: BrokerInfo[];
    uniqueCount: number;
    stats: {
        withProducers: number;
        withConsumers: number;
        orphaned: number; // Brokers with no producers (orphaned from data sources)
    };
}

/**
 * Creates an empty broker collection for loading/error states
 */
function createEmptyBrokerCollection(): WorkflowBrokerCollection {
    return {
        allBrokers: [],
        uniqueCount: 0,
        stats: {
            withProducers: 0,
            withConsumers: 0,
            orphaned: 0,
        },
    };
}

/**
 * Collects broker IDs from prepared workflow data (for execution)
 * Uses broker-centric pub/sub approach
 * @param preparedData - Prepared workflow data from prepareWorkflowData()
 * @returns Organized collection of broker information
 */
export function collectBrokersFromPreparedData(preparedData: PreparedWorkflowData): WorkflowBrokerCollection {
    if (!preparedData || !preparedData.user_inputs || !preparedData.nodes || !preparedData.relays) {
        return createEmptyBrokerCollection();
    }

    const brokerMap = new Map<string, BrokerInfo>();

    // Helper function to get or create broker
    const getBroker = (brokerId: string): BrokerInfo => {
        if (!brokerMap.has(brokerId)) {
            brokerMap.set(brokerId, {
                id: brokerId,
                producers: [],
                consumers: [],
            });
        }
        return brokerMap.get(brokerId)!;
    };

    // Helper to add producer (publishes TO this broker)
    const addProducer = (brokerId: string, connection: BrokerConnection) => {
        if (!brokerId) return;
        getBroker(brokerId).producers.push(connection);
    };

    // Helper to add consumer (subscribes FROM this broker)
    const addConsumer = (brokerId: string, connection: BrokerConnection) => {
        if (!brokerId) return;
        getBroker(brokerId).consumers.push(connection);
    };

    // PRODUCERS: User inputs publish to their broker_id
    preparedData.user_inputs.forEach((userInput) => {
        if (!userInput || !userInput.broker_id) return;
        
        addProducer(userInput.broker_id, {
            nodeId: "user_input",
            nodeName: "User Input",
            connectionType: "user_input",
            details: `Value: ${userInput.value || "N/A"}`,
        });
    });

    // RELAYS: source_broker_id is consumed, target_broker_ids are produced
    preparedData.relays.forEach((relay, index) => {
        if (!relay) return;
        
        const relayName = `Relay ${index + 1}`;

        // Relay consumes from source broker
        if (relay.source) {
            addConsumer(relay.source, {
                nodeId: `relay_${index}`,
                nodeName: relayName,
                connectionType: "relay",
            });
        }

        // Relay produces to target brokers
        if (relay.targets && Array.isArray(relay.targets)) {
            relay.targets.forEach((targetBrokerId) => {
                if (targetBrokerId) {
                    addProducer(targetBrokerId, {
                        nodeId: `relay_${index}`,
                        nodeName: relayName,
                        connectionType: "relay",
                    });
                }
            });
        }
    });

    // FUNCTION NODES
    preparedData.nodes.forEach((node) => {
        // Skip if node or node.data is undefined
        if (!node || !node.data) return;
        
        const nodeName = node.data.step_name || `Node ${node.id.slice(0, 8)}`;

        // return_broker_overrides: Node produces to these brokers
        if (node.data.return_broker_overrides && Array.isArray(node.data.return_broker_overrides)) {
            node.data.return_broker_overrides.forEach((returnBrokerId) => {
                if (returnBrokerId) {
                    addProducer(returnBrokerId, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: "Return value",
                    });
                }
            });
        }

        // arg_mapping: Node consumes from these brokers
        if (node.data.arg_mapping && Array.isArray(node.data.arg_mapping)) {
            node.data.arg_mapping.forEach((mapping) => {
                if (mapping && mapping.source_broker_id) {
                    addConsumer(mapping.source_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: `Argument: ${mapping.target_arg_name}`,
                    });
                }
            });
        }

        // Dependencies: source consumed, target produced (acts as relay)
        if (node.data.additional_dependencies && Array.isArray(node.data.additional_dependencies)) {
            node.data.additional_dependencies.forEach((dependency, index) => {
                if (!dependency) return;
                
                // Node consumes from source broker
                if (dependency.source_broker_id) {
                    addConsumer(dependency.source_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: `Dependency ${index + 1}`,
                    });
                }

                // If target exists, node produces to target (internal relay)
                if (dependency.target_broker_id) {
                    addProducer(dependency.target_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "dependency_relay",
                        details: `Dependency relay ${index + 1}`,
                    });
                }
            });
        }
    });

    // Calculate stats
    const allBrokers = Array.from(brokerMap.values());
    const withProducers = allBrokers.filter((b) => b.producers.length > 0).length;
    const withConsumers = allBrokers.filter((b) => b.consumers.length > 0).length;
    const orphaned = allBrokers.filter((b) => b.producers.length === 0).length;

    return {
        allBrokers,
        uniqueCount: allBrokers.length,
        stats: {
            withProducers,
            withConsumers,
            orphaned,
        },
    };
}

/**
 * Collects broker IDs from complete workflow data (from database)
 * Uses broker-centric pub/sub approach
 * @param workflowData - Complete workflow data from database
 * @returns Organized collection of broker information
 */
export function collectWorkflowBrokers(workflowData: ConvertedWorkflowData): WorkflowBrokerCollection {
    if (!workflowData || !workflowData.userInputs || !workflowData.functionNodes || !workflowData.relays) {
        return createEmptyBrokerCollection();
    }

    const userInputsData = workflowData.userInputs?.map((userInput) => userInput.data);
    const relaysData = workflowData.relays?.map((relay) => relay.data);
    const nodesData = workflowData.functionNodes?.map((node) => node.data);

    const brokerMap = new Map<string, BrokerInfo>();

    // Helper function to get or create broker
    const getBroker = (brokerId: string): BrokerInfo => {
        if (!brokerMap.has(brokerId)) {
            brokerMap.set(brokerId, {
                id: brokerId,
                producers: [],
                consumers: [],
            });
        }
        return brokerMap.get(brokerId)!;
    };

    // Helper to add producer (publishes TO this broker)
    const addProducer = (brokerId: string, connection: BrokerConnection) => {
        if (!brokerId) return;
        getBroker(brokerId).producers.push(connection);
    };

    // Helper to add consumer (subscribes FROM this broker)
    const addConsumer = (brokerId: string, connection: BrokerConnection) => {
        if (!brokerId) return;
        getBroker(brokerId).consumers.push(connection);
    };

    // PRODUCERS: User inputs publish to their broker_id
    userInputsData.forEach((userInput) => {
        if (!userInput || !userInput.broker_id) return;
        
        addProducer(userInput.broker_id, {
            nodeId: userInput.id,
            nodeName: userInput.label || "User Input",
            connectionType: "user_input",
            details: `Default: ${userInput.default_value || "N/A"}`,
        });
    });

    // RELAYS: source_broker_id is consumed, target_broker_ids are produced
    relaysData.forEach((relay) => {
        if (!relay) return;
        
        const relayName = relay.label || `Relay ${relay.id.slice(0, 8)}`;

        // Relay consumes from source broker
        if (relay.source_broker_id) {
            addConsumer(relay.source_broker_id, {
                nodeId: relay.id,
                nodeName: relayName,
                connectionType: "relay",
            });
        }

        // Relay produces to target brokers
        if (relay.target_broker_ids && Array.isArray(relay.target_broker_ids)) {
            relay.target_broker_ids.forEach((targetBrokerId) => {
                if (targetBrokerId) {
                    addProducer(targetBrokerId, {
                        nodeId: relay.id,
                        nodeName: relayName,
                        connectionType: "relay",
                    });
                }
            });
        }
    });

    // FUNCTION NODES
    nodesData.forEach((node) => {
        // Skip if node is undefined
        if (!node) return;
        
        const nodeName = node.step_name || `Node ${node.id.slice(0, 8)}`;

        // return_broker_overrides: Node produces to these brokers
        if (node.return_broker_overrides && Array.isArray(node.return_broker_overrides)) {
            node.return_broker_overrides.forEach((returnBrokerId) => {
                if (returnBrokerId) {
                    addProducer(returnBrokerId, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: "Return value",
                    });
                }
            });
        }

        // arg_mapping: Node consumes from these brokers
        if (node.arg_mapping && Array.isArray(node.arg_mapping)) {
            node.arg_mapping.forEach((mapping) => {
                if (mapping && mapping.source_broker_id) {
                    addConsumer(mapping.source_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: `Argument: ${mapping.target_arg_name}`,
                    });
                }
            });
        }

        // Dependencies: source consumed, target produced (acts as relay)
        if (node.additional_dependencies && Array.isArray(node.additional_dependencies)) {
            node.additional_dependencies.forEach((dependency, index) => {
                if (!dependency) return;
                
                // Node consumes from source broker
                if (dependency.source_broker_id) {
                    addConsumer(dependency.source_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "function_node",
                        details: `Dependency ${index + 1}`,
                    });
                }

                // If target exists, node produces to target (internal relay)
                if (dependency.target_broker_id) {
                    addProducer(dependency.target_broker_id, {
                        nodeId: node.id,
                        nodeName,
                        connectionType: "dependency_relay",
                        details: `Dependency relay ${index + 1}`,
                    });
                }
            });
        }
    });

    // Calculate stats
    const allBrokers = Array.from(brokerMap.values());
    const withProducers = allBrokers.filter((b) => b.producers.length > 0).length;
    const withConsumers = allBrokers.filter((b) => b.consumers.length > 0).length;
    const orphaned = allBrokers.filter((b) => b.producers.length === 0).length;

    return {
        allBrokers,
        uniqueCount: allBrokers.length,
        stats: {
            withProducers,
            withConsumers,
            orphaned,
        },
    };
}

/**
 * Quick function to get just the unique broker IDs as a simple array
 * @param workflowData - Complete workflow data
 * @returns Array of unique broker ID strings
 */
export function getUniqueBrokerIds(workflowData: ConvertedWorkflowData): string[] {
    const collection = collectWorkflowBrokers(workflowData);
    return collection.allBrokers.map((broker) => broker.id);
}
