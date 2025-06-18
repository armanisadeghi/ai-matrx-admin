import { DataBrokerData } from "@/types";
import { UserInputNodeData, BrokerRelayNodeData, FunctionNodeData } from "@/features/workflows/types";
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
    outputComponent?: string;
    fieldComponentId?: string;
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

// Default object for to_argument connection type
export const DEFAULT_TO_ARGUMENT_EDGE = {
    id: "",
    source: "",
    target: "",
    sourceHandle: "",
    targetHandle: "",
    type: "virtual",
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
    sourceHandle: "",
    targetHandle: "",
    type: "virtual",
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
    sourceHandle: "",
    targetHandle: "",
    type: "virtual",
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

export class DataFlowManager {
    private static instance: DataFlowManager | null = null;
    private static currentWorkflowId: string | null = null;

    private sources: Set<string> = new Set();
    private targets: Set<string> = new Set();
    private knownBrokers: DataBrokerRecords = {};

    private constructor(
        private userInputs: UserInputNodeData[] = [],
        private relays: BrokerRelayNodeData[] = [],
        private functionNodes: FunctionNodeData[] = [],
        knownBrokers: DataBrokerRecords = {}
    ) {
        this.knownBrokers = knownBrokers;
        this.processUserInputs();
        this.processRelays();
        this.processFunctionNodes();
    }

    public static getInstance(workflowId?: string): DataFlowManager {
        if (workflowId && DataFlowManager.currentWorkflowId !== workflowId) {
            DataFlowManager.instance = null;
            DataFlowManager.currentWorkflowId = workflowId;
        }

        if (!DataFlowManager.instance) {
            DataFlowManager.instance = new DataFlowManager();
        }

        return DataFlowManager.instance;
    }

    public static initializeForWorkflow(
        workflowId: string,
        userInputs: UserInputNodeData[] = [],
        relays: BrokerRelayNodeData[] = [],
        functionNodes: FunctionNodeData[] = [],
        knownBrokers: DataBrokerRecords
    ): DataFlowManager {
        const instance = DataFlowManager.getInstance(workflowId);
        instance.updateDataSources(userInputs, relays, functionNodes);
        instance.setKnownBrokers(knownBrokers);

        return instance;
    }

    public static resetInstance(): void {
        console.log("DataFlowManager: Force resetting instance");
        DataFlowManager.instance = null;
        DataFlowManager.currentWorkflowId = null;
    }

    public static getCurrentWorkflowId(): string | null {
        return DataFlowManager.currentWorkflowId;
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
            const label = parts.slice(2).join(":");
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

    private findNode(nodeId: string): { type: string; data: any } | null {
        const userInput = this.userInputs.find((ui) => ui.id === nodeId);
        if (userInput) return { type: "userInput", data: userInput };

        const relay = this.relays.find((r) => r.id === nodeId);
        if (relay) return { type: "brokerRelay", data: relay };

        const functionNode = this.functionNodes.find((fn) => fn.id === nodeId);
        if (functionNode) return { type: "functionNode", data: functionNode };

        return null;
    }

    private getUserInputSourceHandle(source: BrokerSource): string {
        return `output--direct_broker--${source.brokerId}`;
    }

    private getBrokerRelaySourceHandle(source: BrokerSource, relayData: BrokerRelayNodeData): string {
        if (relayData.target_broker_ids.includes(source.brokerId)) {
            return `output--direct_broker--${source.brokerId}`;
        }
        console.warn(`Broker ID ${source.brokerId} not found in relay target_broker_ids`);
        return `output--direct_broker--${source.brokerId}`;
    }

    private getFunctionNodeSourceHandle(source: BrokerSource, fnData: FunctionNodeData): string {
        if (fnData.return_broker_overrides?.includes(source.brokerId)) {
            return `output--return_broker--${source.brokerId}`;
        }
        if (fnData.additional_dependencies?.some((dep) => dep.target_broker_id === source.brokerId)) {
            return `output--dependency--${source.brokerId}`;
        }
        console.warn(`Broker ID ${source.brokerId} not matched in function node outputs, defaulting`);
        return `output--direct_broker--${source.brokerId}`;
    }

    private getBrokerRelayTargetHandle(target: BrokerTarget): string {
        return `input--direct_broker--${target.brokerId}`;
    }

    private getFunctionNodeTargetHandle(target: BrokerTarget, fnData: FunctionNodeData): string {
        if (target.label === "Dependency") {
            if (fnData.additional_dependencies?.some((dep) => dep.source_broker_id === target.brokerId)) {
                return `input--dependency--${target.brokerId}`;
            }
        } else if (fnData.arg_mapping?.some((m) => m.source_broker_id === target.brokerId && m.target_arg_name === target.label)) {
            const mapping = fnData.arg_mapping.find((m) => m.source_broker_id === target.brokerId && m.target_arg_name === target.label);
            return `input--arg_mapping--${mapping.source_broker_id}`;
        } else if (fnData.arg_overrides?.some((arg) => arg.name === target.label)) {
            return `input--argument--${target.label}`;
        }
        console.warn(`No matching input for target brokerId: ${target.brokerId}, label: ${target.label}, defaulting`);
        return `input--argument--${target.label}`;
    }

    private createEdge(source: BrokerSource, target: BrokerTarget, connectionType: string): GeneratedEdge {
        const fingerprint = createVirtualEdgeFingerprint(source.nodeId, target.nodeId, target.brokerId, connectionType);
        const edgeId = `virtual_${source.nodeId}_${target.nodeId}_${target.brokerId}`;

        let baseEdge;
        let displayLabel = target.label;

        const sourceNode = this.findNode(source.nodeId);
        const targetNode = this.findNode(target.nodeId);

        let sourceHandle = "";
        let targetHandle = "";

        if (!sourceNode || !targetNode) {
            console.error(`Unknown node: source ${source.nodeId}, target ${target.nodeId}`);
            throw new Error("Invalid node ID");
        }

        // Set sourceHandle
        if (sourceNode.type === "userInput") {
            sourceHandle = this.getUserInputSourceHandle(source);
        } else if (sourceNode.type === "brokerRelay") {
            sourceHandle = this.getBrokerRelaySourceHandle(source, sourceNode.data);
        } else if (sourceNode.type === "functionNode") {
            sourceHandle = this.getFunctionNodeSourceHandle(source, sourceNode.data);
        }

        // Set targetHandle and baseEdge
        if (connectionType === "to_relay" && targetNode.type === "brokerRelay") {
            baseEdge = DEFAULT_TO_RELAY_EDGE;
            targetHandle = this.getBrokerRelayTargetHandle(target);
        } else if (connectionType === "to_dependency" && targetNode.type === "functionNode") {
            baseEdge = DEFAULT_TO_DEPENDENCY_EDGE;
            targetHandle = this.getFunctionNodeTargetHandle(target, targetNode.data);
        } else if (connectionType === "to_argument" && targetNode.type === "functionNode") {
            baseEdge = DEFAULT_TO_ARGUMENT_EDGE;
            displayLabel = this.formatArgumentName(target.label);
            targetHandle = this.getFunctionNodeTargetHandle(target, targetNode.data);
        } else {
            console.warn(`Invalid connection: ${connectionType}, target type: ${targetNode.type}`);
            baseEdge = DEFAULT_TO_ARGUMENT_EDGE;
            displayLabel = this.formatArgumentName(target.label);
            targetHandle = `input--argument--${target.label}`;
        }

        const knownBrokerData = this.findKnownBroker(target.brokerId);
        const isKnownBroker = !!knownBrokerData;

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
        this.sources.clear();
        this.targets.clear();
        this.processUserInputs();
        this.processRelays();
        this.processFunctionNodes();
    }

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

    static generateEdgesForWorkflow(
        workflowId: string,
        userInputs: UserInputNodeData[],
        relays: BrokerRelayNodeData[],
        functionNodes: FunctionNodeData[],
        existingEdges: any[] = [],
        knownBrokers: DataBrokerRecords
    ): any[] {
        const instance = DataFlowManager.initializeForWorkflow(workflowId, userInputs, relays, functionNodes, knownBrokers);
        return instance.mergeWithExistingEdges(existingEdges);
    }

    static processReactFlowNodes(workflowId: string, nodes: any[], existingEdges: any[] = [], knownBrokers: DataBrokerRecords): any[] {
        const userInputs: UserInputNodeData[] = nodes.filter((node) => node.type === "userInput").map((node) => node.data);
        const relays: BrokerRelayNodeData[] = nodes.filter((node) => node.type === "brokerRelay").map((node) => node.data);
        const functionNodes: FunctionNodeData[] = nodes
            .filter((node) => node.type === "functionNode" || (node.type !== "userInput" && node.type !== "brokerRelay"))
            .map((node) => node.data);
        return DataFlowManager.generateEdgesForWorkflow(workflowId, userInputs, relays, functionNodes, existingEdges, knownBrokers);
    }

    setKnownBrokers(knownBrokers: DataBrokerRecords): void {
        this.knownBrokers = knownBrokers;
    }

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
                fieldComponentId: knownBrokerData?.fieldComponentId,
                usageType: brokerSources.length > 0 && brokerTargets.length > 0 ? "both" : brokerSources.length > 0 ? "source" : "target",
                sourceNodes: brokerSources.map((s) => s.nodeId),
                targetNodes: brokerTargets.map((t) => t.nodeId),
                targetLabels: brokerTargets.map((t) => t.label),
            };
        });
    }

    getEnrichedBrokersForNode(nodeId: string): EnrichedBroker[] {
        return this.getEnrichedBrokers().filter((broker) => broker.sourceNodes.includes(nodeId) || broker.targetNodes.includes(nodeId));
    }

    getAllKnownBrokers(): DataBrokerData[] {
        return Object.values(this.knownBrokers);
    }

    private findKnownBroker(brokerId: string): DataBrokerData | undefined {
        const directMatch = Object.values(this.knownBrokers).find((broker) => broker.id === brokerId);
        if (directMatch) return directMatch;
        const recordKey = `id:${brokerId}`;
        return this.knownBrokers[recordKey];
    }

    static processReactFlowNodesWithEnrichment(
        workflowId: string,
        nodes: any[],
        knownBrokers: DataBrokerRecords,
        existingEdges: any[] = []
    ): { edges: any[]; enrichedBrokers: EnrichedBroker[] } {
        const userInputs: UserInputNodeData[] = nodes.filter((node) => node.type === "userInput").map((node) => node.data);
        const relays: BrokerRelayNodeData[] = nodes.filter((node) => node.type === "brokerRelay").map((node) => node.data);
        const functionNodes: FunctionNodeData[] = nodes
            .filter((node) => node.type === "functionNode" || (node.type !== "userInput" && node.type !== "brokerRelay"))
            .map((node) => node.data);
        const instance = DataFlowManager.initializeForWorkflow(workflowId, userInputs, relays, functionNodes, knownBrokers);
        const edges = instance.mergeWithExistingEdges(existingEdges);
        const enrichedBrokers = instance.getEnrichedBrokers();
        return { edges, enrichedBrokers };
    }
}
