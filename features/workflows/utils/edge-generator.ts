import { DataBrokerData } from "@/types";
import { UserInputNodeData, BrokerRelayNodeData, FunctionNodeData } from "@/features/workflows/types";
import { DEFAULT_TO_ARGUMENT_EDGE, DEFAULT_TO_RELAY_EDGE, DEFAULT_TO_DEPENDENCY_EDGE } from "@/features/workflows/utils/default-edges";
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
    type: string;
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
                    const connectionType = target.label === "Relay" ? "to_relay" : 
                                         target.label === "Dependency" ? "to_dependency" : "to_argument";
                    edges.push(this.createEdge(source, target, connectionType));
                }
            });
        });

        return edges;
    }

    private createEdge(source: BrokerSource, target: BrokerTarget, connectionType: string): GeneratedEdge {
        const fingerprint = createVirtualEdgeFingerprint(source.nodeId, target.nodeId, target.brokerId, connectionType);
        const edgeId = `virtual_${source.nodeId}_${target.nodeId}_${target.brokerId}`;
        
        let baseEdge;
        let displayLabel = target.label;
        
        if (target.label === "Relay") {
            baseEdge = DEFAULT_TO_RELAY_EDGE;
        } else if (target.label === "Dependency") {
            baseEdge = DEFAULT_TO_DEPENDENCY_EDGE;
        } else {
            baseEdge = DEFAULT_TO_ARGUMENT_EDGE;
            displayLabel = this.formatArgumentName(target.label);
        }

        const knownBrokerData = this.findKnownBroker(target.brokerId);
        const isKnownBroker = !!knownBrokerData;

        return {
            ...baseEdge,
            id: edgeId,
            source: source.nodeId,
            target: target.nodeId,
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
        
        const nonVirtualEdges = existingEdges.filter(edge => {
            if (edge.id.startsWith('virtual_')) return false;
            
            if (edge.data?.metadata?.virtualEdgeFingerprint) {
                savedFingerprints.add(edge.data.metadata.virtualEdgeFingerprint);
            }
            return true;
        });
        
        const virtualEdges = this.generateEdges().filter(edge => 
            !savedFingerprints.has(edge.data.metadata.virtualEdgeFingerprint)
        );
        
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
        
        return allBrokerIds.map(brokerId => {
            const brokerSources = sources.filter(s => s.brokerId === brokerId);
            const brokerTargets = targets.filter(t => t.brokerId === brokerId);
            const knownBrokerData = this.findKnownBroker(brokerId);
            
            return {
                id: brokerId,
                name: knownBrokerData?.name || brokerId,
                isKnown: !!knownBrokerData,
                knownBrokerData,
                usageType: brokerSources.length > 0 && brokerTargets.length > 0 ? 'both' :
                          brokerSources.length > 0 ? 'source' : 'target',
                sourceNodes: brokerSources.map(s => s.nodeId),
                targetNodes: brokerTargets.map(t => t.nodeId),
                targetLabels: brokerTargets.map(t => t.label)
            };
        });
    }

    // Get enriched brokers for a specific node
    getEnrichedBrokersForNode(nodeId: string): EnrichedBroker[] {
        return this.getEnrichedBrokers().filter(broker => 
            broker.sourceNodes.includes(nodeId) || broker.targetNodes.includes(nodeId)
        );
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
