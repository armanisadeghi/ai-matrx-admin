import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { getBrokerId } from "../utils";


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

const selectBrokerId = createSelector(
    [selectBrokerConceptSlice, selectIdArgs], 
    (state, idArgs) => getBrokerId(state, idArgs)
);

const selectValue = createSelector(
    [selectAllValues, selectBrokerId], 
    (brokers, brokerId) => brokerId ? brokers[brokerId] : undefined
);

// Additional utility selectors
const selectMapEntry = createSelector(
    [selectMap, (_: RootState, source: string, itemId: string) => ({ source, itemId })],
    (map, { source, itemId }) => {
        const mapKey = `${source}:${itemId}`;
        return map[mapKey];
    }
);

const selectHasValue = createSelector(
    [selectValue],
    (value) => value !== undefined
);

export const coreSelectors = {
    selectError,
    selectMap,
    selectAllValues,
    selectBrokerId,
    selectValue,
    selectMapEntry,
    selectHasValue,
};