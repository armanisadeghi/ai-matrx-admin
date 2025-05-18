import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";


// Input selectors to avoid object creation in selectors
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectDynamicValue = createSelector(
    [
        (state: RootState) => state.broker,
        selectIdArgs
    ],
    (broker, idArgs): any => {
        const brokerId = resolveBrokerId(broker, idArgs);
        return brokerId ? broker.brokers[brokerId] : undefined;
    }
);

const selectDynamicValueType = createSelector(
    [selectDynamicValue], 
    (value): string => typeof value
);

const selectDynamicValueExists = createSelector(
    [selectDynamicValue],
    (value): boolean => value !== undefined
);

const selectDynamicValueIsNull = createSelector(
    [selectDynamicValue],
    (value): boolean => value === null
);

const selectDynamicValueIsObject = createSelector(
    [selectDynamicValue],
    (value): boolean => value !== null && typeof value === 'object'
);

export const dynamicSelectors = {
    selectDynamicValue,
    selectDynamicValueType,
    selectDynamicValueExists,
    selectDynamicValueIsNull,
    selectDynamicValueIsObject,
};