import { BrokerState } from "../types";

// Reducers for dangerous, testing-only actions that reset broker state
export const dangerousReducers = {
    // Completely deletes all current broker register entries (for testing purposes only)
    DANGEROUSLY_deleteAllRegisterEntries(state: BrokerState) {
        state.brokerMap = {};
        state.error = undefined;
    },

    // Completely deletes all current broker values (for testing purposes only)
    DANGEROUSLY_deleteAllBrokerValues(state: BrokerState) {
        state.brokers = {};
        state.error = undefined;
    },

    // Completely resets all broker values and register entries (for testing purposes only)
    DANGEROUSLY_resetAllBrokersAndRegisters(state: BrokerState) {
        state.brokerMap = {};
        state.brokers = {};
        state.error = undefined;
    },
};