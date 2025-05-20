import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";

// Core Selectors
const selectBrokerSlice = (state: RootState) => state.broker;


const selectError = createSelector(
    [selectBrokerSlice], 
    (state) => state.error
);

const selectMap = createSelector(
    [selectBrokerSlice], 
    (state) => state.brokerMap
);

const selectAllValues = createSelector(
    [selectBrokerSlice], 
    (state) => state.brokers
);

// Create input selector for idArgs to avoid creating new objects
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Create input selector for brokerId
const selectBrokerIdInput = (_: RootState, brokerId: string) => brokerId;

// Selects brokerId from idArgs (for mapped entities)
const selectBrokerId = createSelector(
    [selectBrokerSlice, selectIdArgs], 
    (state, idArgs) => resolveBrokerId(state, idArgs)
);

// Selects value by direct brokerId
const selectValue = createSelector(
    [selectAllValues, selectBrokerIdInput],
    (brokers, brokerId) => brokers[brokerId]
);

// Selects value using source and id (requires mapping)
const selectValueWithoutBrokerId = createSelector(
    [selectAllValues, selectBrokerId],
    (brokers, brokerId) => brokerId ? brokers[brokerId] : undefined
);

// Checks if a brokerId is registered in brokerMap
const selectIsBrokerIdMapped = createSelector(
    [selectMap, selectBrokerIdInput],
    (map, brokerId) => Object.values(map).some(entry => entry.mappedItemId === brokerId)
);

// Selects a mapping entry by source and id
const selectMapEntry = createSelector(
    [selectMap, (_: RootState, source: string, mappedItemId: string) => ({ source, mappedItemId })],
    (map, { source, mappedItemId }) => {
        const mapKey = `${source}:${mappedItemId}`;
        return map[mapKey];
    }
);

// Checks if a value exists for a brokerId or mapped idArgs
const selectHasValue = createSelector(
    [selectValueWithoutBrokerId],
    (value) => value !== undefined
);


const selectMultipleValues = createSelector(
    [selectAllValues, (_: RootState, brokerIds: string[]) => brokerIds],
    (brokers, brokerIds) => {
        if (!brokerIds || brokerIds.length === 0) {
            return {};
        }
        
        return brokerIds.reduce<Record<string, any>>((acc, brokerId) => {
            if (brokerId) {
                acc[brokerId] = brokers[brokerId];
            }
            return acc;
        }, {});
    }
);

export const coreSelectors = {
    selectBrokerSlice,
    selectError,
    selectMap,
    selectAllValues,
    selectBrokerId,
    selectValue,
    selectValueWithoutBrokerId,
    selectIsBrokerIdMapped,
    selectMapEntry,
    selectHasValue,
    selectMultipleValues,
};