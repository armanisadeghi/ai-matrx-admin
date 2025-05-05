import { RuntimeBrokerDefinition } from "../../applets/types";

interface BrokerMapping {
    appletId: string;
    componentId: string; // Field ID
    brokerId: string;
}

interface BrokerMappingState {
    mappings: Record<string, BrokerMapping>; // Keyed by unique ID (e.g., `${appletId}_${brokerId}`)
    availableBrokers: Record<string, RuntimeBrokerDefinition>; // appletId -> brokerId -> definition
    isLoading: boolean;
    error: string | null;
}