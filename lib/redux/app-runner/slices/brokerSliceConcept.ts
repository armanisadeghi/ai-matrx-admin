import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';
import { v4 as uuidv4 } from 'uuid';

// --- Core Types ---
export interface FieldOption {
  id: string; // Unique identifier for the option
  label: string; // Human-readable label
  description?: string; // AI context, not shown to user
  helpText?: string; // User-visible help text
  iconName?: string; // Lucide-react icon name
  parentId?: string; // For hierarchical options
  metadata?: any; // Additional data
}

export interface FieldOptionsRuntime extends FieldOption {
  isSelected: boolean; // Selection state
  otherText: string; // User-entered text for "Other" option, always a string
}

export type BrokerValue = FieldOptionsRuntime[] | any;

export interface BrokerMapEntry {
  source: string;
  sourceId: string;
  itemId: string;
  brokerId: string;
}

export interface DynamicBrokerMapEntry {
  source: string;
  sourceId: string;
  itemId: string;
}

export type BrokerIdentifier =
  | { brokerId: string; source?: never; itemId?: never; sourceId?: never }
  | { brokerId?: never; source: string; sourceId: string; itemId: string };

export interface BrokerState {
  brokers: { [brokerId: string]: BrokerValue };
  brokerMap: { [key: string]: BrokerMapEntry };
  error?: string; // Optional error state for user feedback
}

// --- Initial State ---
const initialState: BrokerState = {
  brokers: {},
  brokerMap: {},
  error: undefined,
};

// --- Helper Functions ---
const defaultFieldOptionRuntimeValues: Omit<FieldOptionsRuntime, 'id' | 'label'> = {
  description: '',
  helpText: '',
  iconName: '',
  parentId: '',
  metadata: null,
  isSelected: false,
  otherText: '',
};

function normalizeToRuntimeOption(
  optionInput: Partial<FieldOption> & Pick<FieldOption, 'id' | 'label'>
): FieldOptionsRuntime {
  return {
    id: optionInput.id,
    label: optionInput.label,
    description: optionInput.description ?? defaultFieldOptionRuntimeValues.description,
    helpText: optionInput.helpText ?? defaultFieldOptionRuntimeValues.helpText,
    iconName: optionInput.iconName ?? defaultFieldOptionRuntimeValues.iconName,
    parentId: optionInput.parentId ?? defaultFieldOptionRuntimeValues.parentId,
    metadata: optionInput.metadata ?? defaultFieldOptionRuntimeValues.metadata,
    isSelected: (optionInput as Partial<FieldOptionsRuntime>).isSelected ?? defaultFieldOptionRuntimeValues.isSelected,
    otherText: (optionInput as Partial<FieldOptionsRuntime>).otherText ?? defaultFieldOptionRuntimeValues.otherText,
  };
}

const getBrokerId = (state: BrokerState, idArgs: BrokerIdentifier): string | undefined => {
  if (idArgs.brokerId) {
    return idArgs.brokerId;
  }
  if (idArgs.source && idArgs.itemId) {
    const mapKey = `${idArgs.source}:${idArgs.itemId}`;
    return state.brokerMap[mapKey]?.brokerId;
  }
  return undefined;
};

const ensureBrokerIdAndMapping = (
  state: BrokerState,
  idArgs: BrokerIdentifier,
  autoCreateBrokerValue: boolean = false
): string | undefined => {
  if (idArgs.brokerId) {
    if (autoCreateBrokerValue && !state.brokers[idArgs.brokerId]) {
      state.brokers[idArgs.brokerId] = undefined;
    }
    return idArgs.brokerId;
  }
  if (idArgs.source && idArgs.itemId && idArgs.sourceId) {
    const mapKey = `${idArgs.source}:${idArgs.itemId}`;
    let brokerId = state.brokerMap[mapKey]?.brokerId;
    if (!brokerId) {
      brokerId = uuidv4();
      state.brokerMap[mapKey] = {
        source: idArgs.source,
        sourceId: idArgs.sourceId,
        itemId: idArgs.itemId,
        brokerId,
      };
    }
    if (autoCreateBrokerValue && !state.brokers[brokerId]) {
      state.brokers[brokerId] = undefined;
    }
    return brokerId;
  }
  state.error = 'Could not resolve or create brokerId';
  return undefined;
};

const getBrokerOptions = (state: BrokerState, brokerId: string): FieldOptionsRuntime[] | undefined => {
  const brokerValue = state.brokers[brokerId];
  if (
    Array.isArray(brokerValue) &&
    (brokerValue.length === 0 ||
      (typeof brokerValue[0] === 'object' &&
        brokerValue[0] !== null &&
        'id' in brokerValue[0] &&
        'isSelected' in brokerValue[0]))
  ) {
    return brokerValue as FieldOptionsRuntime[];
  }
  return undefined;
};

// --- Slice Definition ---
const brokerConceptSlice = createSlice({
  name: 'brokerConcept',
  initialState,
  reducers: {
    // General Broker and Map Management
    updateBrokerValue(
      state,
      action: PayloadAction<{ idArgs: BrokerIdentifier; value: BrokerValue }>
    ) {
      const { idArgs, value } = action.payload;
      const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
      if (!targetBrokerId) {
        state.error = 'No brokerId could be resolved or created for update';
        return;
      }
      state.brokers[targetBrokerId] = value;
      state.error = undefined;
    },

    setBrokerMap(state, action: PayloadAction<BrokerMapEntry[]>) {
      const newMap: BrokerState['brokerMap'] = {};
      action.payload.forEach((entry) => {
        const key = `${entry.source}:${entry.itemId}`;
        newMap[key] = entry;
      });
      state.brokerMap = newMap;
      state.error = undefined;
    },

    addDynamicBrokerMap(
      state,
      action: PayloadAction<DynamicBrokerMapEntry | DynamicBrokerMapEntry[]>
    ) {
      const entries = Array.isArray(action.payload) ? action.payload : [action.payload];
      entries.forEach((entry) => {
        const mapKey = `${entry.source}:${entry.itemId}`;
        if (state.brokerMap[mapKey]) {
          state.error = `Map key ${mapKey} already exists`;
          return;
        }
        const brokerId = uuidv4();
        state.brokerMap[mapKey] = { ...entry, brokerId };
        state.error = undefined;
      });
    },

    resetMapEntry(state, action: PayloadAction<{ source: string; itemId: string }>) {
      const { source, itemId } = action.payload;
      const mapKey = `${source}:${itemId}`;
      delete state.brokerMap[mapKey];
      state.error = undefined;
    },

    resetMapFull(state) {
      state.brokerMap = {};
      state.error = undefined;
    },

    resetBrokerValue(state, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
      const { idArgs } = action.payload;
      const targetBrokerId = getBrokerId(state, idArgs);
      if (!targetBrokerId) {
        state.error = 'No brokerId found for reset';
        return;
      }
      delete state.brokers[targetBrokerId];
      state.error = undefined;
    },

    resetAllBrokerValues(state) {
      state.brokers = {};
      state.error = undefined;
    },

    // Options-Specific Reducers
    setBrokerOptions(
      state,
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
      let runtimeOptions: FieldOptionsRuntime[] = inputOptions.map((opt) => normalizeToRuntimeOption(opt));
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
      state,
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
      const options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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
      state,
      action: PayloadAction<{
        idArgs: BrokerIdentifier;
        optionId: string;
      }>
    ) {
      // Alias for setOptionSelectedState with isSelected: true
      const { idArgs, optionId } = action.payload;
      const targetBrokerId = getBrokerId(state, idArgs);
      if (!targetBrokerId) {
        state.error = 'BrokerId not found for selecting option';
        return;
      }
      const options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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
      state,
      action: PayloadAction<{
        idArgs: BrokerIdentifier;
        optionId: string;
      }>
    ) {
      // Alias for setOptionSelectedState with isSelected: false
      const { idArgs, optionId } = action.payload;
      const targetBrokerId = getBrokerId(state, idArgs);
      if (!targetBrokerId) {
        state.error = 'BrokerId not found for deselecting option';
        return;
      }
      const options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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
      state,
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
      const options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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
      state,
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
      let options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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
      state,
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
      const options = getBrokerOptions(state, targetBrokerId);
      if (!options) {
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

    clearError(state) {
      state.error = undefined;
    },
  },
});

// --- Export Actions ---
export const {
  updateBrokerValue: updateBrokerValueConcept,
  setBrokerMap: setBrokerMapConcept,
  addDynamicBrokerMap: addDynamicBrokerMapConcept,
  resetMapEntry: resetMapEntryConcept,
  resetMapFull: resetMapFullConcept,
  resetBrokerValue: resetBrokerValueConcept,
  resetAllBrokerValues: resetAllBrokerValuesConcept,
  setBrokerOptions: setBrokerOptionsConcept,
  setOptionSelectedState: setOptionSelectedStateConcept,
  selectOption: selectOptionConcept,
  deselectOption: deselectOptionConcept,
  updateOptionProperties: updateOptionPropertiesConcept,
  addBrokerOption: addBrokerOptionConcept,
  removeBrokerOption: removeBrokerOptionConcept,
  clearError: clearErrorConcept,
} = brokerConceptSlice.actions;

// --- Selectors ---
const selectBrokerConceptSlice = (state: RootState) => state.brokerConcept;

const selectBrokerError = createSelector(
  [selectBrokerConceptSlice],
  (brokerConceptState) => brokerConceptState.error
);

const selectBrokerMap = createSelector(
  [selectBrokerConceptSlice],
  (brokerConceptState) => brokerConceptState.brokerMap
);

const selectAllBrokerData = createSelector(
  [selectBrokerConceptSlice],
  (brokerConceptState) => brokerConceptState.brokers
);

const selectBrokerId = createSelector(
  [
    (state: RootState) => state.brokerConcept.brokerMap,
    (_: RootState, idArgs: BrokerIdentifier) => idArgs,
  ],
  (brokerMap, idArgs) => {
    if (idArgs.brokerId) return idArgs.brokerId;
    if (idArgs.source && idArgs.itemId) {
      const mapKey = `${idArgs.source}:${idArgs.itemId}`;
      return brokerMap[mapKey]?.brokerId;
    }
    return undefined;
  }
);

const selectBrokerValue = createSelector(
  [selectAllBrokerData, selectBrokerId],
  (brokers, targetBrokerId) => {
    return targetBrokerId ? brokers[targetBrokerId] : undefined;
  }
);

const selectBrokerValueByBrokerId = createSelector(
  [selectAllBrokerData, (_: RootState, brokerId: string) => brokerId],
  (brokers, brokerId) => brokers[brokerId]
);

const selectBrokerOptions = createSelector(
  [selectBrokerValue],
  (brokerValue): FieldOptionsRuntime[] | undefined => {
    if (
      Array.isArray(brokerValue) &&
      (brokerValue.length === 0 ||
        (typeof brokerValue[0] === 'object' &&
          brokerValue[0] !== null &&
          'id' in brokerValue[0] &&
          'isSelected' in brokerValue[0]))
    ) {
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


export const selectFilteredBrokerOptions = createSelector(
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






export const brokerConceptSelectors = { 
  selectBrokerError,
  selectBrokerMap,
  selectAllBrokerData,
  selectBrokerId,
  selectBrokerValue,
  selectBrokerValueByBrokerId,
  selectBrokerOptions,
  selectSelectedBrokerOptions,
  selectBrokerOptionById,
  isBrokerOptionSelected,
  selectBrokerOptionOtherText,
  selectFilteredBrokerOptions,
};

export const brokerConceptActions = {
  updateBrokerValue: updateBrokerValueConcept,
  setBrokerMap: setBrokerMapConcept,
  addDynamicBrokerMap: addDynamicBrokerMapConcept,
  resetMapEntry: resetMapEntryConcept,
  resetMapFull: resetMapFullConcept,
  resetBrokerValue: resetBrokerValueConcept,
  resetAllBrokerValues: resetAllBrokerValuesConcept,
  setBrokerOptions: setBrokerOptionsConcept,
  setOptionSelectedState: setOptionSelectedStateConcept,
  selectOption: selectOptionConcept,
  deselectOption: deselectOptionConcept,
  updateOptionProperties: updateOptionPropertiesConcept,
  addBrokerOption: addBrokerOptionConcept,
  removeBrokerOption: removeBrokerOptionConcept,
  clearError: clearErrorConcept,
};






// --- Export Reducer ---
export default brokerConceptSlice.reducer;