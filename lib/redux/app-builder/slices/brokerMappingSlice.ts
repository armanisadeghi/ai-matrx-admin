import { ComponentToBrokerMapping, RuntimeBrokerDefinition } from "../../app-runner/types";


interface BrokerMappingState {
    mappings: Record<string, ComponentToBrokerMapping>; // Keyed by unique ID (e.g., `${appletId}_${brokerId}`)
    availableBrokers: Record<string, RuntimeBrokerDefinition>; // appletId -> brokerId -> definition
    isLoading: boolean;
    error: string | null;
}