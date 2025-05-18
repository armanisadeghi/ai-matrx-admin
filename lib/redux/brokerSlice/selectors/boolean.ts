// types/boolean/index.ts
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";

// Type guard
const isBoolean = (value: any): value is boolean => typeof value === "boolean";

// Input selector
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectBoolean = createSelector(
    [
        (state: RootState) => state.broker,
        selectIdArgs
    ],
    (broker, idArgs): boolean | undefined => {
        const brokerId = resolveBrokerId(broker, idArgs);
        if (!brokerId) return undefined;
        
        const brokerValue = broker.brokers[brokerId];
        return isBoolean(brokerValue) ? brokerValue : undefined;
    }
);

const selectIsTrue = createSelector(
    [selectBoolean],
    (value): boolean => value === true
);

const selectIsFalse = createSelector(
    [selectBoolean],
    (value): boolean => value === false
);

const selectBooleanExists = createSelector(
    [selectBoolean],
    (value): boolean => value !== undefined
);

export const booleanSelectors = {
    selectBoolean,
    selectIsTrue,
    selectIsFalse,
    selectBooleanExists,
};