import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";

// Core Selectors
const selectBrokerConceptSlice = (state: RootState) => state.brokerConcept;

const selectError = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.error
);

const selectMap = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.brokerMap
);

const selectAllValues = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.brokers
);

// Create input selector for idArgs to avoid creating new objects
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Create input selector for brokerId
const selectBrokerIdInput = (_: RootState, brokerId: string) => brokerId;

// Selects brokerId from idArgs (for mapped entities)
const selectBrokerId = createSelector(
    [selectBrokerConceptSlice, selectIdArgs], 
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
    (map, brokerId) => Object.values(map).some(entry => entry.id === brokerId)
);

// Selects a mapping entry by source and id
const selectMapEntry = createSelector(
    [selectMap, (_: RootState, source: string, id: string) => ({ source, id })],
    (map, { source, id }) => {
        const mapKey = `${source}:${id}`;
        return map[mapKey];
    }
);

// Checks if a value exists for a brokerId or mapped idArgs
const selectHasValue = createSelector(
    [selectValueWithoutBrokerId],
    (value) => value !== undefined
);

export const coreSelectors = {
    selectError,
    selectMap,
    selectAllValues,
    selectBrokerId,
    selectValue,
    selectValueWithoutBrokerId,
    selectIsBrokerIdMapped,
    selectMapEntry,
    selectHasValue,
};