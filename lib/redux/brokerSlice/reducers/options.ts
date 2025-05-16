import { createSelector } from "reselect";
import { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerIdentifier } from "../types";
import { FieldOption, FieldOptionsRuntime } from "../types";
import { resolveBrokerId } from "../utils";

// Type guard for FieldOptionsRuntime array
const isOptionsArray = (value: any): value is FieldOptionsRuntime[] =>
    Array.isArray(value) && (value.length === 0 || ("id" in value[0] && "label" in value[0] && "isSelected" in value[0]));

// Utilities
const defaultFieldOptionRuntimeValues: Omit<FieldOptionsRuntime, "id" | "label"> = {
    description: "",
    helpText: "",
    iconName: "",
    parentId: "",
    metadata: null,
    isSelected: false,
    otherText: "",
};

export const normalizeToRuntimeOption = (optionInput: Partial<FieldOption> & Pick<FieldOption, "id" | "label">): FieldOptionsRuntime => ({
    id: optionInput.id,
    label: optionInput.label,
    description: optionInput.description ?? defaultFieldOptionRuntimeValues.description,
    helpText: optionInput.helpText ?? defaultFieldOptionRuntimeValues.helpText,
    iconName: optionInput.iconName ?? defaultFieldOptionRuntimeValues.iconName,
    parentId: optionInput.parentId ?? defaultFieldOptionRuntimeValues.parentId,
    metadata: optionInput.metadata ?? defaultFieldOptionRuntimeValues.metadata,
    isSelected: (optionInput as Partial<FieldOptionsRuntime>).isSelected ?? defaultFieldOptionRuntimeValues.isSelected,
    otherText: (optionInput as Partial<FieldOptionsRuntime>).otherText ?? defaultFieldOptionRuntimeValues.otherText,
});

// Reducers
export const optionsReducers = {
    // Sets the options for a broker, initializing selection and otherText if provided
    setOptions(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            options: (Partial<FieldOption> & Pick<FieldOption, "id" | "label">)[];
            initialSelectedIds?: string[];
            initialOtherTexts?: { optionId: string; text: string }[];
        }>
    ) {
        const { idArgs, options: inputOptions, initialSelectedIds = [], initialOtherTexts = [] } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        let runtimeOptions: FieldOptionsRuntime[] = inputOptions.map(normalizeToRuntimeOption);
        
        if (initialSelectedIds.length > 0) {
            runtimeOptions = runtimeOptions.map((opt) => ({
                ...opt,
                isSelected: initialSelectedIds.includes(opt.id) ? true : opt.isSelected,
            }));
        }
        
        if (initialOtherTexts.length > 0) {
            const otherTextMap = new Map(initialOtherTexts.map((item) => [item.optionId, item.text]));
            runtimeOptions = runtimeOptions.map((opt) => ({
                ...opt,
                otherText: otherTextMap.has(opt.id) ? otherTextMap.get(opt.id)! : opt.otherText,
            }));
        }
        
        state.brokers[targetBrokerId] = runtimeOptions;
        state.error = undefined;
    },

    // Updates the selection state of a specific option
    updateOptionSelectionState(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            optionId: string;
            isSelected: boolean;
        }>
    ) {
        const { idArgs, optionId, isSelected } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue) return;
        
        if (!isOptionsArray(brokerValue)) return;

        const optionIndex = brokerValue.findIndex((opt) => opt.id === optionId);
        if (optionIndex === -1) return;

        const updatedOptions = [...brokerValue];
        updatedOptions[optionIndex] = {
            ...updatedOptions[optionIndex],
            isSelected: isSelected
        };
        state.brokers[targetBrokerId] = updatedOptions;
        state.error = undefined;
    },

    // Updates properties of a specific option
    updateOption(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            optionId: string;
            properties: Partial<Omit<FieldOptionsRuntime, "id">>;
        }>
    ) {
        const { idArgs, optionId, properties } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue) return;
        
        if (!isOptionsArray(brokerValue)) return;

        const optionIndex = brokerValue.findIndex((opt) => opt.id === optionId);
        if (optionIndex === -1) return;

        const updatedOptions = [...brokerValue];
        updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...properties };
        state.brokers[targetBrokerId] = updatedOptions;
        state.error = undefined;
    },

    // Updates the otherText for a specific option
    updateOptionOtherText(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            optionId: string;
            otherText: string;
        }>
    ) {
        const { idArgs, optionId, otherText } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue) return;
        
        if (!isOptionsArray(brokerValue)) return;

        const optionIndex = brokerValue.findIndex((opt) => opt.id === optionId);
        if (optionIndex === -1) return;

        const updatedOptions = [...brokerValue];
        updatedOptions[optionIndex] = {
            ...updatedOptions[optionIndex],
            otherText: otherText
        };
        state.brokers[targetBrokerId] = updatedOptions;
        state.error = undefined;
    },

    // Adds a new option to the broker
    addOption(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            option: Partial<FieldOption> & Pick<FieldOption, "id" | "label">;
            selectAfterAdding?: boolean;
        }>
    ) {
        const { idArgs, option: optionInput, selectAfterAdding = false } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        let options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
        
        if (!isOptionsArray(options)) {
            options = [];
            state.brokers[targetBrokerId] = options;
        }
        
        if (options.find((opt) => opt.id === optionInput.id)) return;

        const newOption = normalizeToRuntimeOption(optionInput);
        if (selectAfterAdding) {
            newOption.isSelected = true;
        }
        
        const updatedOptions = [...options, newOption];
        state.brokers[targetBrokerId] = updatedOptions;
        state.error = undefined;
    },

    // Removes an option from the broker
    removeOption(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            optionId: string;
        }>
    ) {
        const { idArgs, optionId } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue) return;
        
        if (!isOptionsArray(brokerValue)) return;

        const updatedOptions = brokerValue.filter((opt) => opt.id !== optionId);
        if (updatedOptions.length === brokerValue.length) return;

        state.brokers[targetBrokerId] = updatedOptions;
        state.error = undefined;
    },

    // Updates the order of options based on provided IDs
    updateOptionsOrder(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
            optionIds: string[];
        }>
    ) {
        const { idArgs, optionIds } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        const brokerValue = state.brokers[targetBrokerId];
        if (!brokerValue) return;
        
        if (!isOptionsArray(brokerValue)) return;

        const optionMap = new Map(brokerValue.map((opt) => [opt.id, opt]));
        const reorderedOptions = optionIds.map((id) => optionMap.get(id)).filter(Boolean) as FieldOptionsRuntime[];
        
        if (reorderedOptions.length !== brokerValue.length) return;

        state.brokers[targetBrokerId] = reorderedOptions;
        state.error = undefined;
    },

    // Clears all options for a broker
    clearOptions(
        state: BrokerState,
        action: PayloadAction<{
            idArgs: BrokerIdentifier;
        }>
    ) {
        const { idArgs } = action.payload;
        const targetBrokerId = resolveBrokerId(state, idArgs);
        if (!targetBrokerId) return;

        state.brokers[targetBrokerId] = [];
        state.error = undefined;
    },
};

