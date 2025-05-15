import { createSlice } from "@reduxjs/toolkit";
import { BrokerState } from "./core/types";
import { coreReducers, coreSelectors } from "./core";
import { optionsReducers, optionsSelectors } from "./types/options";
import { tableReducers, tableSelectors } from "./types/tables";
import { textReducers, textSelectors } from "./types/text";
import { dynamicReducers, dynamicSelectors } from "./types/dynamic";
import { numberReducers, numberSelectors } from "./types/number";
import { booleanReducers, booleanSelectors } from "./types/boolean";
import { dateReducers, dateSelectors } from "./types/date";

// Define typed initial state
const initialState: BrokerState = {
    brokers: {},
    brokerMap: {},
    error: undefined,
};

// Create the slice with combined reducers
const brokerConceptSlice = createSlice({
    name: "brokerConcept",
    initialState,
    reducers: {
        ...coreReducers,
        ...optionsReducers,
        ...tableReducers,
        ...textReducers,
        ...dynamicReducers,
        ...numberReducers,
        ...booleanReducers,
        ...dateReducers,
    },
});

// Combine selectors
export const brokerConceptSelectors = {
    ...coreSelectors,
    ...optionsSelectors,
    ...tableSelectors,
    ...textSelectors,
    ...dynamicSelectors,
    ...numberSelectors,
    ...booleanSelectors,
    ...dateSelectors,
};

// Re-export types
export * from "./core/types";
export * from "./types/options/types";
export * from "./types/tables/types";
// export * from "./types/number/types";
// export * from "./types/boolean/types";
// export * from "./types/date/types";
// export * from "./types/text/types";
// export * from "./types/dynamic/types";

export * from "./hooks";

export default brokerConceptSlice.reducer;
export const brokerConceptActions = brokerConceptSlice.actions;
