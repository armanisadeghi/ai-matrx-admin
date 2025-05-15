import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerIdentifier } from "../types";
import { FieldOptionsRuntime } from "../types";
import { getBrokerId } from "../utils";

// Type guard for FieldOptionsRuntime array
const isOptionsArray = (value: any): value is FieldOptionsRuntime[] =>
    Array.isArray(value) && (value.length === 0 || ("id" in value[0] && "label" in value[0] && "isSelected" in value[0]));

// Selectors
const selectBrokerOptions = createSelector(
    [
        (state: RootState, idArgs: BrokerIdentifier) => {
            const brokerId = getBrokerId(state.brokerConcept, idArgs);
            return brokerId ? state.brokerConcept.brokers[brokerId] : undefined;
        },
    ],
    (brokerValue): FieldOptionsRuntime[] | undefined => {
        if (isOptionsArray(brokerValue)) {
            return brokerValue;
        }
        return undefined;
    }
);

const selectSelectedOptions = createSelector(
    [selectBrokerOptions],
    (options): FieldOptionsRuntime[] => options?.filter((opt) => opt.isSelected) || []
);

// Create input selector for optionId to avoid creating new objects
const selectOptionId = (_: RootState, __: BrokerIdentifier, optionId: string) => optionId;

const selectOptionById = createSelector(
    [selectBrokerOptions, selectOptionId],
    (options, optionId): FieldOptionsRuntime | undefined => options?.find((opt) => opt.id === optionId)
);

const selectIsOptionSelected = createSelector(
    [selectOptionById], 
    (option): boolean => !!option?.isSelected
);

const selectOptionOtherText = createSelector(
    [selectOptionById], 
    (option): string | undefined => option?.otherText
);

// Create input selector for searchQuery to avoid creating new objects
const selectSearchQuery = (_: RootState, __: BrokerIdentifier, searchQuery: string) => searchQuery;

const selectFilteredOptions = createSelector(
    [selectBrokerOptions, selectSearchQuery],
    (options, searchQuery): FieldOptionsRuntime[] => {
        if (!options) return [];
        if (!searchQuery.trim()) return options;
        
        const query = searchQuery.toLowerCase();
        return options.filter((option) => {
            const matchLabel = option.label.toLowerCase().includes(query);
            const matchDescription = option.description?.toLowerCase().includes(query) || false;
            return matchLabel || matchDescription;
        });
    }
);

export const optionsSelectors = {
    selectBrokerOptions,
    selectSelectedOptions,
    selectOptionById,
    selectIsOptionSelected,
    selectOptionOtherText,
    selectFilteredOptions,
};