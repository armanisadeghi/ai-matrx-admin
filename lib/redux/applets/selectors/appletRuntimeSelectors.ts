import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux/store";
import { ComponentToBrokerMapping } from "../types";

// ================================ Constants for Reference Stability ================================
// Use these constants to ensure reference stability with proper typing
const EMPTY_OBJECT = {} as Record<string, never>;
const EMPTY_ARRAY = [] as const;

// Type-safe empty object function to preserve return types
function emptyObject<T>(): T {
  return {} as T;
}

// Type-safe empty array function to preserve return types
function emptyArray<T>(): T[] {
  return [] as T[];
}

// ================================ Base Selectors ================================

// Component Definitions Selectors
export const selectAppConfigs = (state: RootState) => state.componentDefinitions.appConfigs || EMPTY_OBJECT;
export const selectComponentDefinitions = (state: RootState) => state.componentDefinitions.definitions || EMPTY_OBJECT;
export const selectComponentInstances = (state: RootState) => state.componentDefinitions.instances || EMPTY_OBJECT;
export const selectContainers = (state: RootState) => state.componentDefinitions.containers || EMPTY_OBJECT;
export const selectApplets = (state: RootState) => state.componentDefinitions.applets || EMPTY_OBJECT;
export const selectComponentToBrokerMap = (state: RootState) => state.componentDefinitions.componentToBrokerMap || EMPTY_OBJECT;

// Broker Selectors
export const selectBrokerValues = (state: RootState) => state.brokerValues.values || EMPTY_OBJECT;
export const selectBrokerHistoryMap = (state: RootState) => state.brokerValues.history || EMPTY_OBJECT;
export const selectNeededBrokers = (state: RootState) => state.brokerValues.neededBrokers || EMPTY_OBJECT;
export const selectBrokerDefinitions = (state: RootState) => state.brokerValues.brokerDefinitions || EMPTY_OBJECT;

// ================================ App Selectors ================================

// App Config Selectors
export const selectAppConfig = createSelector(
    [selectAppConfigs, (_: RootState, appId?: string | null) => appId || ""],
    (appConfigs, appId) => {
        const result = appId && appConfigs[appId];
        return result || emptyObject();
    }
);

export const selectAppAppletList = createSelector(
    [selectAppConfig],
    (appConfig) => appConfig?.appletList || emptyArray()
);

// ================================ Component Selectors ================================

// Component Definition and Instance Selectors
export const selectComponentDefinition = createSelector(
    [
        selectComponentDefinitions, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId || "", 
            id: id || "" 
        })
    ],
    (definitions, { appId, id }) => {
        const result = appId && id && definitions[appId]?.[id];
        return result || emptyObject();
    }
);

export const selectComponentInstance = createSelector(
    [
        selectComponentInstances, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId || "", 
            id: id || "" 
        })
    ],
    (instances, { appId, id }) => {
        const result = appId && id && instances[appId]?.[id];
        return result || emptyObject();
    }
);

// ================================ Container Selectors ================================

export const selectContainer = createSelector(
    [
        selectContainers, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId || "", 
            id: id || "" 
        })
    ],
    (containers, { appId, id }) => {
        const result = appId && id && containers[appId]?.[id];
        return result || emptyObject();
    }
);

export const selectAllContainers = createSelector(
    [selectContainers, (_: RootState, appId?: string | null) => appId || ""],
    (containers, appId) => {
        const result = appId && containers[appId];
        return result || emptyObject();
    }
);

export const selectComponentInstancesForContainer = createSelector(
    [
        selectContainers, 
        selectComponentInstances, 
        (_: RootState, appId?: string | null, containerId?: string | null) => ({ 
            appId: appId || "", 
            containerId: containerId || "" 
        })
    ],
    (containers, instances, { appId, containerId }) => {
        if (!appId || !containerId) return emptyArray();
        
        const container = containers[appId]?.[containerId];
        if (!container || !container.fields) return emptyArray();

        const result = container.fields
            .map((field) =>
                Object.values(instances[appId] || {}).filter((instance: any) => 
                    instance && instance.id && field && field.id && instance.id.startsWith(field.id)
                )
            )
            .flat();
            
        return result.length ? result : emptyArray();
    }
);

// ================================ Applet Selectors ================================

export const selectApplet = createSelector(
    [
        selectApplets, 
        (_: RootState, appId?: string | null, id?: string | null) => ({ 
            appId: appId || "", 
            id: id || "" 
        })
    ],
    (applets, { appId, id }) => {
        const result = appId && id && applets[appId]?.[id];
        return result || emptyObject();
    }
);

export const selectAllApplets = createSelector(
    [selectApplets, (_: RootState, appId?: string | null) => appId || ""],
    (applets, appId) => {
        const result = appId && applets[appId];
        return result || emptyObject();
    }
);

// ================================ Broker Selectors ================================

// Individual Broker Selectors
export const selectBrokerValue = createSelector(
    [selectBrokerValues, (_: RootState, id?: string | null) => id || ""],
    (values, id) => (id && values[id]) || null
);

export const selectBrokerHistory = createSelector(
    [selectBrokerHistoryMap, (_: RootState, id?: string | null) => id || ""],
    (history, id) => {
        const result = id && history[id];
        return result || emptyArray();
    }
);

export const selectBrokerDefinition = createSelector(
    [
        selectBrokerDefinitions, 
        (_: RootState, appId?: string | null, brokerId?: string | null) => ({ 
            appId: appId || "", 
            brokerId: brokerId || "" 
        })
    ],
    (definitions, { appId, brokerId }) => {
        const result = appId && brokerId && definitions[appId]?.[brokerId];
        return result || emptyObject();
    }
);

// Broker Collection Selectors
export const selectAllBrokerValues = createSelector(
    [selectBrokerValues],
    (values) => values || emptyObject()
);

export const selectAllBrokerDefinitions = createSelector(
    [selectBrokerDefinitions, (_: RootState, appId?: string | null) => appId || ""],
    (definitions, appId) => {
        const result = appId && definitions[appId];
        return result || emptyObject();
    }
);

// ================================ Broker Mapping Selectors ================================

export const selectBrokerForComponentInstance = createSelector(
    [
        selectComponentToBrokerMap, 
        selectBrokerValues, 
        (_: RootState, appId?: string | null, instanceId?: string | null) => ({ 
            appId: appId || "", 
            instanceId: instanceId || "" 
        })
    ],
    (mappings, values, { appId, instanceId }) => {
        if (!appId || !instanceId) return null;
        
        const mapping = mappings[appId]?.find(
            (map: ComponentToBrokerMapping) => map && map.instanceId === instanceId
        );
        
        return mapping && mapping.brokerId ? values[mapping.brokerId] || null : null;
    }
);

export const selectAllBrokerMappings = createSelector(
    [selectComponentToBrokerMap, (_: RootState, appId?: string | null) => appId || ""],
    (mappings, appId) => {
        const result = appId && mappings[appId];
        return result || emptyArray();
    }
);

// ================================ Broker Status Selectors ================================

export const selectBrokerValueStatus = createSelector(
    [selectBrokerValues, selectNeededBrokers, (_: RootState, appId?: string | null) => appId],
    (values, neededBrokers, appId) => {
        const status: Record<string, boolean> = {};
        
        if (!neededBrokers) return status;
        
        const brokers = appId 
            ? (neededBrokers[appId || ""] || emptyArray()) 
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
        if (!neededBrokers) return emptyArray();
        
        const brokers = appId 
            ? (neededBrokers[appId || ""] || emptyArray()) 
            : Object.values(neededBrokers).flat();
            
        const result = brokers.filter((brokerId) => brokerId && !values[brokerId]);
        
        return result.length ? result : emptyArray();
    }
);