import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux/store";
import { ComponentToBrokerMapping } from "../types";

// --- Base Selectors ---

export const selectAppConfigs = (state: RootState) => state.componentDefinitions.appConfigs;
export const selectComponentDefinitions = (state: RootState) => state.componentDefinitions.definitions;
export const selectComponentInstances = (state: RootState) => state.componentDefinitions.instances;
export const selectContainers = (state: RootState) => state.componentDefinitions.containers;
export const selectApplets = (state: RootState) => state.componentDefinitions.applets;
export const selectComponentToBrokerMap = (state: RootState) => state.componentDefinitions.componentToBrokerMap;
export const selectBrokerValues = (state: RootState) => state.brokerValues.values;
export const selectBrokerHistoryMap = (state: RootState) => state.brokerValues.history;
export const selectNeededBrokers = (state: RootState) => state.brokerValues.neededBrokers;
export const selectBrokerDefinitions = (state: RootState) => state.brokerValues.brokerDefinitions;

// --- Derived Selectors ---

export const selectAppConfig = createSelector(
    [selectAppConfigs, (_: RootState, appId: string) => appId],
    (appConfigs, appId) => appConfigs[appId] || null
);

export const selectAppAppletList = createSelector(
    [selectAppConfig],
    (appConfig) => appConfig?.appletList || []
);

export const selectComponentDefinition = createSelector(
    [selectComponentDefinitions, (_: RootState, appId: string, id: string) => ({ appId, id })],
    (definitions, { appId, id }) => definitions[appId]?.[id] || null
);

export const selectComponentInstance = createSelector(
    [selectComponentInstances, (_: RootState, appId: string, id: string) => ({ appId, id })],
    (instances, { appId, id }) => instances[appId]?.[id] || null
);

export const selectContainer = createSelector(
    [selectContainers, (_: RootState, appId: string, id: string) => ({ appId, id })],
    (containers, { appId, id }) => containers[appId]?.[id] || null
);

export const selectApplet = createSelector(
    [selectApplets, (_: RootState, appId: string, id: string) => ({ appId, id })],
    (applets, { appId, id }) => applets[appId]?.[id] || null
);

export const selectBrokerValue = createSelector(
    [selectBrokerValues, (_: RootState, id: string) => id],
    (values, id) => values[id] || null
);

export const selectBrokerHistory = createSelector(
    [selectBrokerHistoryMap, (_: RootState, id: string) => id],
    (history, id) => history[id] || []
);

export const selectBrokerForComponentInstance = createSelector(
    [selectComponentToBrokerMap, selectBrokerValues, (_: RootState, appId: string, instanceId: string) => ({ appId, instanceId })],
    (mappings, values, { appId, instanceId }) => {
        const mapping = mappings[appId]?.find((map: ComponentToBrokerMapping) => map.instanceId === instanceId);
        return mapping ? values[mapping.brokerId] || null : null;
    }
);

export const selectComponentInstancesForContainer = createSelector(
    [selectContainers, selectComponentInstances, (_: RootState, appId: string, containerId: string) => ({ appId, containerId })],
    (containers, instances, { appId, containerId }) => {
        const container = containers[appId]?.[containerId];
        if (!container) return [];

        return container.fields
            .map((field) =>
                Object.values(instances[appId] || {}).filter((instance: any) => instance.id.startsWith(field.id))
            )
            .flat();
    }
);

export const selectAllBrokerValues = createSelector(
    [selectBrokerValues],
    (values) => ({ ...values })
);

export const selectAllBrokerMappings = createSelector(
    [selectComponentToBrokerMap, (_: RootState, appId: string) => appId],
    (mappings, appId) => [...(mappings[appId] || [])]
);

export const selectAllApplets = createSelector(
    [selectApplets, (_: RootState, appId: string) => appId],
    (applets, appId) => ({ ...(applets[appId] || {}) })
);

export const selectAllContainers = createSelector(
    [selectContainers, (_: RootState, appId: string) => appId],
    (containers, appId) => ({ ...(containers[appId] || {}) })
);

export const selectBrokerValueStatus = createSelector(
    [selectBrokerValues, selectNeededBrokers, (_: RootState, appId?: string) => appId],
    (values, neededBrokers, appId) => {
        const status: Record<string, boolean> = {};
        const brokers = appId ? neededBrokers[appId] || [] : Object.values(neededBrokers).flat();
        brokers.forEach((brokerId) => {
            status[brokerId] = !!values[brokerId];
        });
        return status;
    }
);

export const selectMissingNeededBrokers = createSelector(
    [selectBrokerValues, selectNeededBrokers, (_: RootState, appId?: string) => appId],
    (values, neededBrokers, appId) => {
        const brokers = appId ? neededBrokers[appId] || [] : Object.values(neededBrokers).flat();
        return brokers.filter((brokerId) => !values[brokerId]);
    }
);

export const selectBrokerDefinition = createSelector(
    [selectBrokerDefinitions, (_: RootState, appId: string, brokerId: string) => ({ appId, brokerId })],
    (definitions, { appId, brokerId }) => definitions[appId]?.[brokerId] || null
);

export const selectAllBrokerDefinitions = createSelector(
    [selectBrokerDefinitions, (_: RootState, appId: string) => appId],
    (definitions, appId) => ({ ...(definitions[appId] || {}) })
);