import { createSelector } from 'reselect';
import { PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/lib/redux';
import { BrokerState, BrokerIdentifier } from '../../core/types';
import { FieldOption, FieldOptionsRuntime } from './types';
import { getBrokerId, ensureBrokerIdAndMapping } from '../../core/helpers';

// Utilities
const defaultFieldOptionRuntimeValues: Omit<FieldOptionsRuntime, 'id' | 'label'> = {
  description: '',
  helpText: '',
  iconName: '',
  parentId: '',
  metadata: null,
  isSelected: false,
  otherText: '',
};

export const normalizeToRuntimeOption = (
  optionInput: Partial<FieldOption> & Pick<FieldOption, 'id' | 'label'>
): FieldOptionsRuntime => ({
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

// Actions (to be registered in core slice)
export const optionsReducers = {
  setBrokerOptions(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      options: (Partial<FieldOption> & Pick<FieldOption, 'id' | 'label'>)[];
      initialSelectedIds?: string[];
      initialOtherTexts?: { optionId: string; text: string }[];
    }>
  ) {
    const { idArgs, options: inputOptions, initialSelectedIds = [], initialOtherTexts = [] } = action.payload;
    const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
    if (!targetBrokerId) {
      state.error = 'No brokerId could be resolved or created for options';
      return;
    }
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
  setOptionSelectedState(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      optionId: string;
      isSelected: boolean;
    }>
  ) {
    const { idArgs, optionId, isSelected } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for setting option state';
      return;
    }
    const options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options) || !options[0]?.isSelected) {
      state.error = `Broker ${targetBrokerId} does not have valid options`;
      return;
    }
    const optionIndex = options.findIndex((opt) => opt.id === optionId);
    if (optionIndex === -1) {
      state.error = `Option ${optionId} not found in broker ${targetBrokerId}`;
      return;
    }
    options[optionIndex].isSelected = isSelected;
    state.error = undefined;
  },
  selectOption(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      optionId: string;
    }>
  ) {
    const { idArgs, optionId } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for selecting option';
      return;
    }
    const options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options) || !options[0]?.isSelected) {
      state.error = `Broker ${targetBrokerId} does not have valid options`;
      return;
    }
    const optionIndex = options.findIndex((opt) => opt.id === optionId);
    if (optionIndex === -1) {
      state.error = `Option ${optionId} not found in broker ${targetBrokerId}`;
      return;
    }
    options[optionIndex].isSelected = true;
    state.error = undefined;
  },
  deselectOption(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      optionId: string;
    }>
  ) {
    const { idArgs, optionId } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for deselecting option';
      return;
    }
    const options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options) || !options[0]?.isSelected) {
      state.error = `Broker ${targetBrokerId} does not have valid options`;
      return;
    }
    const optionIndex = options.findIndex((opt) => opt.id === optionId);
    if (optionIndex === -1) {
      state.error = `Option ${optionId} not found in broker ${targetBrokerId}`;
      return;
    }
    options[optionIndex].isSelected = false;
    state.error = undefined;
  },
  updateOptionProperties(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      optionId: string;
      properties: Partial<Omit<FieldOptionsRuntime, 'id'>>;
    }>
  ) {
    const { idArgs, optionId, properties } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for updating option properties';
      return;
    }
    const options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options) || !options[0]?.isSelected) {
      state.error = `Broker ${targetBrokerId} does not have valid options`;
      return;
    }
    const optionIndex = options.findIndex((opt) => opt.id === optionId);
    if (optionIndex === -1) {
      state.error = `Option ${optionId} not found in broker ${targetBrokerId}`;
      return;
    }
    options[optionIndex] = { ...options[optionIndex], ...properties };
    state.error = undefined;
  },
  addBrokerOption(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      option: Partial<FieldOption> & Pick<FieldOption, 'id' | 'label'>;
      selectAfterAdding?: boolean;
    }>
  ) {
    const { idArgs, option: optionInput, selectAfterAdding = false } = action.payload;
    const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
    if (!targetBrokerId) {
      state.error = 'No brokerId could be resolved or created for adding option';
      return;
    }
    let options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options)) {
      options = [];
      state.brokers[targetBrokerId] = options;
    }
    if (options.find((opt) => opt.id === optionInput.id)) {
      state.error = `Option with ID ${optionInput.id} already exists in broker ${targetBrokerId}`;
      return;
    }
    const newOption = normalizeToRuntimeOption(optionInput);
    if (selectAfterAdding) {
      newOption.isSelected = true;
    }
    options.push(newOption);
    state.error = undefined;
  },
  removeBrokerOption(
    state: BrokerState,
    action: PayloadAction<{
      idArgs: BrokerIdentifier;
      optionId: string;
    }>
  ) {
    const { idArgs, optionId } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for removing option';
      return;
    }
    const options = state.brokers[targetBrokerId] as FieldOptionsRuntime[] | undefined;
    if (!Array.isArray(options) || !options[0]?.isSelected) {
      state.error = `Broker ${targetBrokerId} does not have valid options`;
      return;
    }
    const updatedOptions = options.filter((opt) => opt.id !== optionId);
    if (updatedOptions.length === options.length) {
      state.error = `Option ${optionId} not found in broker ${targetBrokerId}`;
      return;
    }
    state.brokers[targetBrokerId] = updatedOptions;
    state.error = undefined;
  },
};

// Selectors
const selectBrokerOptions = createSelector(
  [(state: RootState, idArgs: BrokerIdentifier) => state.brokerConcept.brokers[getBrokerId(state.brokerConcept, idArgs) || '']],
  (brokerValue): FieldOptionsRuntime[] | undefined => {
    if (Array.isArray(brokerValue) && (brokerValue.length === 0 || ('id' in brokerValue[0] && 'isSelected' in brokerValue[0]))) {
      return brokerValue as FieldOptionsRuntime[];
    }
    return undefined;
  }
);

const selectSelectedBrokerOptions = createSelector(
  [selectBrokerOptions],
  (options): FieldOptionsRuntime[] => {
    return options ? options.filter((opt) => opt.isSelected) : [];
  }
);

const selectBrokerOptionById = createSelector(
  [
    selectBrokerOptions,
    (_: RootState, idArgs: BrokerIdentifier, optionId: string) => ({ idArgs, optionId }),
  ],
  (options, { optionId }): FieldOptionsRuntime | undefined => {
    return options?.find((opt) => opt.id === optionId);
  }
);

const isBrokerOptionSelected = createSelector(
  [selectBrokerOptionById],
  (option): boolean => {
    return !!option?.isSelected;
  }
);

const selectBrokerOptionOtherText = createSelector(
  [selectBrokerOptionById],
  (option): string | undefined => {
    return option?.otherText;
  }
);

const selectFilteredBrokerOptions = createSelector(
  [
    selectBrokerOptions,
    (_: RootState, idArgs: BrokerIdentifier, searchQuery: string) => ({ idArgs, searchQuery }),
  ],
  (options, { searchQuery }): FieldOptionsRuntime[] => {
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
  selectSelectedBrokerOptions,
  selectBrokerOptionById,
  isBrokerOptionSelected,
  selectBrokerOptionOtherText,
  selectFilteredBrokerOptions,
};