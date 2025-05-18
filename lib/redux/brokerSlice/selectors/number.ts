// types/number/index.ts
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";


// Type guards
const isNumber = (value: any): value is number => typeof value === "number" && !isNaN(value);
const isInteger = (value: any): value is number => Number.isInteger(value);


// Input selector
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Selectors
const selectNumber = createSelector(
    [
        (state: RootState) => state.broker,
        selectIdArgs
    ],
    (broker, idArgs): number | undefined => {
        const brokerId = resolveBrokerId(broker, idArgs);
        if (!brokerId) return undefined;
        
        const brokerValue = broker.brokers[brokerId];
        return isNumber(brokerValue) ? brokerValue : undefined;
    }
);

const selectInteger = createSelector(
    [selectNumber],
    (value): number | undefined => {
        return value !== undefined && Number.isInteger(value) ? value : undefined;
    }
);

const selectNumberExists = createSelector(
    [selectNumber],
    (value): boolean => value !== undefined
);

const selectIsPositive = createSelector(
    [selectNumber],
    (value): boolean => value !== undefined && value > 0
);

const selectIsNegative = createSelector(
    [selectNumber],
    (value): boolean => value !== undefined && value < 0
);

const selectAbsoluteValue = createSelector(
    [selectNumber],
    (value): number | undefined => value !== undefined ? Math.abs(value) : undefined
);

export const numberSelectors = {
    selectNumber,
    selectInteger,
    selectNumberExists,
    selectIsPositive,
    selectIsNegative,
    selectAbsoluteValue,
};