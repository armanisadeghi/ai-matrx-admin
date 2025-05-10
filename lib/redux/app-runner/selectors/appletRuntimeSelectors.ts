import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux/store";
import { ComponentToBrokerMapping } from "../types";

// ================================ Base Selectors ================================
// Component Definitions Selectors
export const selectAppConfigs = (state: RootState) => state.componentDefinitions.appConfigs ?? {};
export const selectComponentDefinitions = (state: RootState) => state.componentDefinitions.definitions ?? {};
export const selectComponentInstances = (state: RootState) => state.componentDefinitions.instances ?? {};
export const selectContainers = (state: RootState) => state.componentDefinitions.containers ?? {};
export const selectApplets = (state: RootState) => state.componentDefinitions.applets ?? {};
export const selectComponentToBrokerMap = (state: RootState) => state.componentDefinitions.componentToBrokerMap ?? {};

// Broker Selectors
export const selectBrokerValues = (state: RootState) => state.brokerValues.values ?? {};
export const selectBrokerHistoryMap = (state: RootState) => state.brokerValues.history ?? {};
export const selectNeededBrokers = (state: RootState) => state.brokerValues.neededBrokers ?? {};
export const selectBrokerDefinitions = (state: RootState) => state.brokerValues.brokerDefinitions ?? {};

// ================================ App Selectors ================================
// App Config Selectors
export const selectAppConfig = createSelector(
    [selectAppConfigs, (_: RootState, appId?: string | null) => appId ?? ""],
    (appConfigs, appId) => appId ? appConfigs[appId] ?? {} : {}
);

export const selectAppAppletList = createSelector(
    [selectAppConfig],
    (appConfig) => appConfig?.appletList ?? []
);

// ================================ Component Selectors ================================
// Component Definition and Instance Selectors
export const selectComponentDefinition = createSelector(
    [
        selectComponentDefinitions, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId ?? "", 
            id: id ?? "" 
        })
    ],
    (definitions, { appId, id }) => {
        if (!appId || !id) return {};
        return definitions[appId]?.[id] ?? {};
    }
);

export const selectComponentInstance = createSelector(
    [
        selectComponentInstances, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId ?? "", 
            id: id ?? "" 
        })
    ],
    (instances, { appId, id }) => {
        if (!appId || !id) return {};
        return instances[appId]?.[id] ?? {};
    }
);

// ================================ Container Selectors ================================
export const selectContainer = createSelector(
    [
        selectContainers, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId ?? "", 
            id: id ?? "" 
        })
    ],
    (containers, { appId, id }) => {
        if (!appId || !id) return {};
        return containers[appId]?.[id] ?? {};
    }
);

export const selectAllContainers = createSelector(
    [selectContainers, (_: RootState, appId?: string | null) => appId ?? ""],
    (containers, appId) => {
        if (!appId) return {};
        return containers[appId] ?? {};
    }
);

export const selectComponentInstancesForContainer = createSelector(
    [
        selectContainers, 
        selectComponentInstances, 
        (_: RootState, appId?: string | null, containerId?: string | null) => ({ 
            appId: appId ?? "", 
            containerId: containerId ?? "" 
        })
    ],
    (containers, instances, { appId, containerId }) => {
        if (!appId || !containerId) return [];
        
        const container = containers[appId]?.[containerId];
        if (!container?.fields) return [];
        
        const result = container.fields
            .map((field) =>
                Object.values(instances[appId] ?? {}).filter((instance: any) => 
                    instance?.id && field?.id && instance.id.startsWith(field.id)
                )
            )
            .flat();
            
        return result;
    }
);

// ================================ Applet Selectors ================================
export const selectApplet = createSelector(
    [
        selectApplets, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId ?? "", 
            id: id ?? "" 
        })
    ],
    (applets, { appId, id }) => {
        if (!appId || !id) return {};
        return applets[appId]?.[id] ?? {};
    }
);

export const selectAllApplets = createSelector(
    [selectApplets, (_: RootState, appId?: string | null) => appId ?? ""],
    (applets, appId) => {
        if (!appId) return {};
        return applets[appId] ?? {};
    }
);

// ================================ Broker Selectors ================================
// Individual Broker Selectors
export const selectBrokerValue = createSelector(
    [selectBrokerValues, (_: RootState, id?: string | null) => id ?? ""],
    (values, id) => id ? values[id] ?? null : null
);

export const selectBrokerHistory = createSelector(
    [selectBrokerHistoryMap, (_: RootState, id?: string | null) => id ?? ""],
    (history, id) => {
        if (!id) return [];
        return history[id] ?? [];
    }
);

export const selectBrokerDefinition = createSelector(
    [
        selectBrokerDefinitions, 
        (_: RootState, appId?: string | null, brokerId?: string | null) => ({ 
            appId: appId ?? "", 
            brokerId: brokerId ?? "" 
        })
    ],
    (definitions, { appId, brokerId }) => {
        if (!appId || !brokerId) return {};
        return definitions[appId]?.[brokerId] ?? {};
    }
);

// Broker Collection Selectors
export const selectAllBrokerValues = createSelector(
    [selectBrokerValues],
    (values) => values
);

export const selectAllBrokerDefinitions = createSelector(
    [selectBrokerDefinitions, (_: RootState, appId?: string | null) => appId ?? ""],
    (definitions, appId) => {
        if (!appId) return {};
        return definitions[appId] ?? {};
    }
);

// ================================ Broker Mapping Selectors ================================
export const selectBrokerForComponentInstance = createSelector(
    [
        selectComponentToBrokerMap, 
        selectBrokerValues, 
        (_: RootState, appId?: string | null, instanceId?: string | null) => ({ 
            appId: appId ?? "", 
            instanceId: instanceId ?? "" 
        })
    ],
    (mappings, values, { appId, instanceId }) => {
        if (!appId || !instanceId) return null;
        
        const mapping = mappings[appId]?.find(
            (map: ComponentToBrokerMapping) => map?.instanceId === instanceId
        );
        
        if (!mapping?.brokerId) return null;
        return values[mapping.brokerId] ?? null;
    }
);

export const selectAllBrokerMappings = createSelector(
    [selectComponentToBrokerMap, (_: RootState, appId?: string | null) => appId ?? ""],
    (mappings, appId) => {
        if (!appId) return [];
        return mappings[appId] ?? [];
    }
);

// ================================ Broker Status Selectors ================================
export const selectBrokerValueStatus = createSelector(
    [selectBrokerValues, selectNeededBrokers, (_: RootState, appId?: string | null) => appId],
    (values, neededBrokers, appId) => {
        const status: Record<string, boolean> = {};
        
        if (!neededBrokers) return status;
        
        const brokers = appId 
            ? (neededBrokers[appId] ?? []) 
            : Object.values(neededBrokers).flat();
            
        brokers.forEach((brokerId) => {
            if (brokerId) {
                status[brokerId] = !!values[brokerId];
            }
        });
        
        return status;
    }
);

export const selectMissingNeededBrokers = createSelector(
    [selectBrokerValues, selectNeededBrokers, (_: RootState, appId?: string | null) => appId],
    (values, neededBrokers, appId) => {
        if (!neededBrokers) return [];
        
        const brokers = appId 
            ? (neededBrokers[appId] ?? []) 
            : Object.values(neededBrokers).flat();
            
        return brokers.filter(brokerId => brokerId && !values[brokerId]);
    }
);