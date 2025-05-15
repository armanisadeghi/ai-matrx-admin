import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { getBrokerId } from "../utils";

// Type guard for text values
const isTextValue = (value: any): value is string => typeof value === "string";


// Input selectors - properly memoized to avoid recreating objects
const selectBrokerConceptState = (state: RootState) => state.brokerConcept;
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

// Get the broker ID
const selectBrokerId = createSelector(
    [selectBrokerConceptState, selectIdArgs],
    (brokerConcept, idArgs) => getBrokerId(brokerConcept, idArgs)
);

// Get the broker value
const selectBrokerValue = createSelector(
    [selectBrokerConceptState, selectBrokerId],
    (brokerConcept, brokerId) => brokerId ? brokerConcept.brokers[brokerId] : undefined
);

// Selectors
const selectText = createSelector(
    [selectBrokerValue],
    (brokerValue): string | undefined => {
        return isTextValue(brokerValue) ? brokerValue : undefined;
    }
);

const selectTextLength = createSelector(
    [selectText], 
    (text): number => text?.length || 0
);

const selectTextExists = createSelector(
    [selectText],
    (text): boolean => text !== undefined
);

const selectTextIsEmpty = createSelector(
    [selectText],
    (text): boolean => text === ''
);

const selectTextWords = createSelector(
    [selectText],
    (text): string[] => text ? text.trim().split(/\s+/) : []
);

const selectTextWordCount = createSelector(
    [selectTextWords],
    (words): number => words.length
);

export const textSelectors = {
    selectText,
    selectTextLength,
    selectTextExists,
    selectTextIsEmpty,
    selectTextWords,
    selectTextWordCount,
};