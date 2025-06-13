import { DataBrokerData } from "@/types";
import { UserInputNodeData, BrokerRelayNodeData, FunctionNodeData } from "@/features/workflows/types";
// import { DEFAULT_TO_ARGUMENT_EDGE, DEFAULT_TO_RELAY_EDGE, DEFAULT_TO_DEPENDENCY_EDGE } from "@/features/workflows/utils/default-edges";
import { createVirtualEdgeFingerprint } from "../service/edgeService";

interface BrokerSource {
    nodeId: string;
    brokerId: string;
}

interface BrokerTarget {
    nodeId: string;
    brokerId: string;
    label: string;
}

export interface EnrichedBroker {
    id: string;
    name?: string;
    isKnown: boolean;
    knownBrokerData?: DataBrokerData;
    usageType: "source" | "target" | "both";
    sourceNodes: string[];
    targetNodes: string[];
    targetLabels: string[];
}

export interface GeneratedEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle: string;
    targetHandle: string;
    type?: string;
    animated: boolean;
    isVirtual: boolean;
    style: {
        stroke: string;
        strokeWidth: number;
        strokeDasharray?: string;
    };
    data: {
        connectionType?: string;
        sourceBrokerId: string;
        sourceBrokerName: string;
        targetBrokerId: string;
        targetBrokerName: string;
        metadata: {
            isKnownBroker: boolean;
            knownBrokerData?: DataBrokerData;
            virtualEdgeFingerprint: string;
        };
        label: string;
    };
}

// Default object for to_argument connection type
export const DEFAULT_TO_ARGUMENT_EDGE = {
    id: "",
    source: "",
    target: "",
    sourceHandle: "output",
    targetHandle: "input",
    // type: "custom",
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
    targetHandle: "input", // input--direct_broker--${brokerRelayData.source_broker_id}
    // type: "custom",
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
    // type: "custom",
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

export type DataBrokerRecords = Record<string, DataBrokerData>;

export class EdgeGenerator {
    private sources: Set<string> = new Set();
    private targets: Set<string> = new Set();
    private knownBrokers: DataBrokerRecords = {};

    constructor(
        private userInputs: UserInputNodeData[],
        private relays: BrokerRelayNodeData[],
        private functionNodes: FunctionNodeData[],
        knownBrokers?: DataBrokerRecords
    ) {
        if (knownBrokers) {
            this.knownBrokers = knownBrokers;
        }
        this.processUserInputs();
        this.processRelays();
        this.processFunctionNodes();
    }

    private processUserInputs(): void {
        this.userInputs.forEach((userInput) => {
            this.addSource(userInput.id, userInput.broker_id);
        });
    }

    private processRelays(): void {
        this.relays.forEach((relay) => {
            this.addTarget(relay.id, relay.source_broker_id, "Relay");

            relay.target_broker_ids?.forEach((targetBrokerId) => {
                this.addSource(relay.id, targetBrokerId);
            });
        });
    }

    private processFunctionNodes(): void {
        this.functionNodes.forEach((node) => {
            node.additional_dependencies?.forEach((dependency) => {
                this.addTarget(node.id, dependency.source_broker_id, "Dependency");
                if (dependency.target_broker_id) {
                    this.addSource(node.id, dependency.target_broker_id);
                }
            });

            node.arg_mapping?.forEach((mapping) => {
                this.addTarget(node.id, mapping.source_broker_id, mapping.target_arg_name);
            });

            node.return_broker_overrides?.forEach((brokerId) => {
                this.addSource(node.id, brokerId);
            });
        });
    }

    private addSource(nodeId: string, brokerId: string): void {
        this.sources.add(`${nodeId}:${brokerId}`);
    }

    private addTarget(nodeId: string, brokerId: string, label: string): void {
        this.targets.add(`${nodeId}:${brokerId}:${label}`);
    }

    getSources(): BrokerSource[] {
        return Array.from(this.sources).map((entry) => {
            const [nodeId, brokerId] = entry.split(":");
            return { nodeId, brokerId };
        });
    }

    getTargets(): BrokerTarget[] {
        return Array.from(this.targets).map((entry) => {
            const parts = entry.split(":");
            const nodeId = parts[0];
            const brokerId = parts[1];
            const label = parts.slice(2).join(":"); // Handle labels that might contain colons
            return { nodeId, brokerId, label };
        });
    }

    generateEdges(): GeneratedEdge[] {
        const sources = this.getSources();
        const targets = this.getTargets();
        const edges: GeneratedEdge[] = [];
        const edgeSet = new Set<string>();

        targets.forEach((target) => {
            const matchingSources = sources.filter((source) => source.brokerId === target.brokerId);

            matchingSources.forEach((source) => {
                const edgeKey = `${source.nodeId}-${target.nodeId}-${target.brokerId}`;

                if (!edgeSet.has(edgeKey)) {
                    edgeSet.add(edgeKey);
                    const connectionType =
                        target.label === "Relay" ? "to_relay" : target.label === "Dependency" ? "to_dependency" : "to_argument";
                    edges.push(this.createEdge(source, target, connectionType));
                }
            });
        });

        return edges;
    }

    private findNodeType(nodeId: string): { type: string; data: any } | null {
        const userInput = this.userInputs.find((ui) => ui.id === nodeId);
        if (userInput) return { type: "userInput", data: userInput };

        const relay = this.relays.find((r) => r.id === nodeId);
        if (relay) return { type: "brokerRelay", data: relay };

        const functionNode = this.functionNodes.find((fn) => fn.id === nodeId);
        if (functionNode) return { type: "functionNode", data: functionNode };

        return null;
    }

    private createEdge(source: BrokerSource, target: BrokerTarget, connectionType: string): GeneratedEdge {
        const fingerprint = createVirtualEdgeFingerprint(source.nodeId, target.nodeId, target.brokerId, connectionType);
        const edgeId = `virtual_${source.nodeId}_${target.nodeId}_${target.brokerId}`;

        let baseEdge;
        let displayLabel = target.label;

        // Determine source and target node types
        const sourceNode = this.findNodeType(source.nodeId);
        const targetNode = this.findNodeType(target.nodeId);

        // Default handles (to be overridden)
        let sourceHandle = "output--direct_broker--" + source.brokerId;
        let targetHandle = "input--direct_broker--" + target.brokerId;

        if (!sourceNode || !targetNode) {
            console.warn(`Unknown node type for source: ${source.nodeId} or target: ${target.nodeId}`);
        } else {
            // Set sourceHandle based on source node type
            if (sourceNode.type === "userInput") {
                sourceHandle = `output--direct_broker--${source.brokerId}`;
            } else if (sourceNode.type === "brokerRelay") {
                sourceHandle = `output--direct_broker--${source.brokerId}`;
            } else if (sourceNode.type === "functionNode") {
                const fnData = sourceNode.data as FunctionNodeData;
                // Check if brokerId is a return broker or dependency
                if (fnData.return_broker_overrides?.includes(source.brokerId)) {
                    sourceHandle = `output--return_broker--${source.brokerId}`;
                } else if (fnData.additional_dependencies?.some((dep) => dep.target_broker_id === source.brokerId)) {
                    sourceHandle = `output--dependency--${source.brokerId}`;
                }
            }

            // Set targetHandle based on connectionType and target node type
            if (connectionType === "to_relay" && targetNode.type === "brokerRelay") {
                baseEdge = DEFAULT_TO_RELAY_EDGE;
                targetHandle = `input--direct_broker--${target.brokerId}`;
            } else if (connectionType === "to_dependency" && targetNode.type === "functionNode") {
                baseEdge = DEFAULT_TO_DEPENDENCY_EDGE;
                targetHandle = `input--dependency--${target.brokerId}`;
            } else if (connectionType === "to_argument" && targetNode.type === "functionNode") {
                baseEdge = DEFAULT_TO_ARGUMENT_EDGE;
                displayLabel = this.formatArgumentName(target.label);
                const fnData = targetNode.data as FunctionNodeData;
                // Check if label is an argument name or part of arg_mapping
                if (fnData.arg_overrides?.some((arg) => arg.name === target.label)) {
                    targetHandle = `input--argument--${target.label}`;
                } else if (
                    fnData.arg_mapping?.some(
                        (mapping) => mapping.source_broker_id === target.brokerId && mapping.target_arg_name === target.label
                    )
                ) {
                    targetHandle = `input--arg_mapping--${target.brokerId}`;
                } else {
                    // Fallback: assume argument if label is provided
                    targetHandle = `input--argument--${target.label}`;
                }
            }
        }

        const knownBrokerData = this.findKnownBroker(target.brokerId);
        const isKnownBroker = !!knownBrokerData;

        // Ensure baseEdge is set if not assigned
        if (!baseEdge) {
            baseEdge = DEFAULT_TO_ARGUMENT_EDGE;
            displayLabel = this.formatArgumentName(target.label);
        }

        return {
            ...baseEdge,
            id: edgeId,
            source: source.nodeId,
            target: target.nodeId,
            sourceHandle,
            targetHandle,
            data: {
                ...baseEdge.data,
                sourceBrokerId: source.brokerId,
                sourceBrokerName: knownBrokerData?.name || source.brokerId,
                targetBrokerId: target.brokerId,
                targetBrokerName: knownBrokerData?.name || target.brokerId,
                metadata: {
                    isKnownBroker,
                    knownBrokerData,
                    virtualEdgeFingerprint: fingerprint,
                },
                label: displayLabel,
            },
        };
    }

    private formatArgumentName(argName: string): string {
        return argName
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/_/g, " ")
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    }

    // Convenience methods for getting unique broker IDs
    getSourceBrokerIds(): string[] {
        const brokerIds = new Set<string>();
        this.getSources().forEach((source) => brokerIds.add(source.brokerId));
        return Array.from(brokerIds);
    }

    getTargetBrokerIds(): string[] {
        const brokerIds = new Set<string>();
        this.getTargets().forEach((target) => brokerIds.add(target.brokerId));
        return Array.from(brokerIds);
    }

    getAllBrokers(): string[] {
        const allBrokerIds = new Set<string>();
        this.getSources().forEach((source) => allBrokerIds.add(source.brokerId));
        this.getTargets().forEach((target) => allBrokerIds.add(target.brokerId));
        return Array.from(allBrokerIds);
    }

    // Method to update data sources without recreating the class
    updateDataSources(userInputs: UserInputNodeData[], relays: BrokerRelayNodeData[], functionNodes: FunctionNodeData[]): void {
        this.userInputs = userInputs;
        this.relays = relays;
        this.functionNodes = functionNodes;

        // Clear and repopulate
        this.sources.clear();
        this.targets.clear();

        this.processUserInputs();
        this.processRelays();
        this.processFunctionNodes();
    }

    // Method to merge generated virtual edges with existing edges
    mergeWithExistingEdges(existingEdges: any[]): any[] {
        const savedFingerprints = new Set<string>();

        const nonVirtualEdges = existingEdges.filter((edge) => {
            if (edge.id.startsWith("virtual_")) return false;

            if (edge.data?.metadata?.virtualEdgeFingerprint) {
                savedFingerprints.add(edge.data.metadata.virtualEdgeFingerprint);
            }
            return true;
        });

        const virtualEdges = this.generateEdges().filter((edge) => !savedFingerprints.has(edge.data.metadata.virtualEdgeFingerprint));

        return [...nonVirtualEdges, ...virtualEdges];
    }

    // Static method to create and generate edges in one call
    static generateEdgesForWorkflow(
        userInputs: UserInputNodeData[],
        relays: BrokerRelayNodeData[],
        functionNodes: FunctionNodeData[],
        existingEdges: any[] = []
    ): any[] {
        const generator = new EdgeGenerator(userInputs, relays, functionNodes);
        return generator.mergeWithExistingEdges(existingEdges);
    }

    // NEW: Process ReactFlow nodes directly
    static processReactFlowNodes(nodes: any[], existingEdges: any[] = []): any[] {
        // Extract data from nodes based on type
        const userInputs: UserInputNodeData[] = nodes.filter((node) => node.type === "userInput").map((node) => node.data);

        const relays: BrokerRelayNodeData[] = nodes.filter((node) => node.type === "brokerRelay").map((node) => node.data);

        const functionNodes: FunctionNodeData[] = nodes
            .filter((node) => node.type === "functionNode" || (node.type !== "userInput" && node.type !== "brokerRelay"))
            .map((node) => node.data);

        // Generate edges using existing static method
        return EdgeGenerator.generateEdgesForWorkflow(userInputs, relays, functionNodes, existingEdges);
    }

    // Set or update known brokers
    setKnownBrokers(knownBrokers: DataBrokerRecords): void {
        this.knownBrokers = knownBrokers;
    }

    // Get enriched broker data for all brokers in this workflow
    getEnrichedBrokers(): EnrichedBroker[] {
        const allBrokerIds = this.getAllBrokers();
        const sources = this.getSources();
        const targets = this.getTargets();

        return allBrokerIds.map((brokerId) => {
            const brokerSources = sources.filter((s) => s.brokerId === brokerId);
            const brokerTargets = targets.filter((t) => t.brokerId === brokerId);
            const knownBrokerData = this.findKnownBroker(brokerId);

            return {
                id: brokerId,
                name: knownBrokerData?.name || brokerId,
                isKnown: !!knownBrokerData,
                knownBrokerData,
                usageType: brokerSources.length > 0 && brokerTargets.length > 0 ? "both" : brokerSources.length > 0 ? "source" : "target",
                sourceNodes: brokerSources.map((s) => s.nodeId),
                targetNodes: brokerTargets.map((t) => t.nodeId),
                targetLabels: brokerTargets.map((t) => t.label),
            };
        });
    }

    // Get enriched brokers for a specific node
    getEnrichedBrokersForNode(nodeId: string): EnrichedBroker[] {
        return this.getEnrichedBrokers().filter((broker) => broker.sourceNodes.includes(nodeId) || broker.targetNodes.includes(nodeId));
    }

    // Get all known brokers (not just ones in this workflow)
    getAllKnownBrokers(): DataBrokerData[] {
        return Object.values(this.knownBrokers);
    }

    // Find known broker data by ID
    private findKnownBroker(brokerId: string): DataBrokerData | undefined {
        // Try direct lookup first
        const directMatch = Object.values(this.knownBrokers).find((broker) => broker.id === brokerId);
        if (directMatch) return directMatch;

        // Try with MatrxRecordId format (id:some-uuid)
        const recordKey = `id:${brokerId}`;
        return this.knownBrokers[recordKey];
    }

    // Static method for enriched edge generation from nodes
    static processReactFlowNodesWithEnrichment(
        nodes: any[],
        knownBrokers: DataBrokerRecords,
        existingEdges: any[] = []
    ): { edges: any[]; enrichedBrokers: EnrichedBroker[] } {
        const userInputs: UserInputNodeData[] = nodes.filter((node) => node.type === "userInput").map((node) => node.data);

        const relays: BrokerRelayNodeData[] = nodes.filter((node) => node.type === "brokerRelay").map((node) => node.data);

        const functionNodes: FunctionNodeData[] = nodes
            .filter((node) => node.type === "functionNode" || (node.type !== "userInput" && node.type !== "brokerRelay"))
            .map((node) => node.data);

        const generator = new EdgeGenerator(userInputs, relays, functionNodes, knownBrokers);
        const edges = generator.mergeWithExistingEdges(existingEdges);
        const enrichedBrokers = generator.getEnrichedBrokers();

        return { edges, enrichedBrokers };
    }
}
