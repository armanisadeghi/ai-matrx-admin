import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';
import { BrokerState, BrokerMapEntry, DynamicBrokerMapEntry, BrokerIdentifier } from './types';
import { getBrokerId, ensureBrokerIdAndMapping } from './helpers';
import { v4 as uuidv4 } from 'uuid';


const initialState: BrokerState = {
  brokers: {},
  brokerMap: {},
  error: undefined,
};

// Define core reducers as a plain object
export const coreReducers = {
  setBrokerMap(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
    const newMap: BrokerState['brokerMap'] = {};
    action.payload.forEach((entry) => {
      const key = `${entry.source}:${entry.itemId}`;
      newMap[key] = entry;
    });
    state.brokerMap = newMap;
    state.error = undefined;
  },
  addDynamicBrokerMap(state: BrokerState, action: PayloadAction<DynamicBrokerMapEntry | DynamicBrokerMapEntry[]>) {
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
  resetMapEntry(state: BrokerState, action: PayloadAction<{ source: string; itemId: string }>) {
    const { source, itemId } = action.payload;
    const mapKey = `${source}:${itemId}`;
    delete state.brokerMap[mapKey];
    state.error = undefined;
  },
  resetMapFull(state: BrokerState) {
    state.brokerMap = {};
    state.error = undefined;
  },
  updateBrokerValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
    const { idArgs, value } = action.payload;
    const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
    if (!targetBrokerId) {
      state.error = 'No brokerId could be resolved or created for update';
      return;
    }
    state.brokers[targetBrokerId] = value;
    state.error = undefined;
  },
  resetBrokerValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
    const { idArgs } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'No brokerId found for reset';
      return;
    }
    delete state.brokers[targetBrokerId];
    state.error = undefined;
  },
  resetAllBrokerValues(state: BrokerState) {
    state.brokers = {};
    state.error = undefined;
  },
  clearError(state: BrokerState) {
    state.error = undefined;
  },
};

// Create a core slice to generate action creators
const brokerConceptSlice = createSlice({
  name: 'brokerConcept',
  initialState,
  reducers: coreReducers,
});

// Core Selectors
const selectBrokerConceptSlice = (state: RootState) => state.brokerConcept;

const selectBrokerError = createSelector([selectBrokerConceptSlice], (state) => state.error);
const selectBrokerMap = createSelector([selectBrokerConceptSlice], (state) => state.brokerMap);
const selectAllBrokerData = createSelector([selectBrokerConceptSlice], (state) => state.brokers);
const selectBrokerId = createSelector(
  [selectBrokerMap, (_: RootState, idArgs: BrokerIdentifier) => idArgs],
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
  (brokers, brokerId) => (brokerId ? brokers[brokerId] : undefined)
);

export const coreSelectors = {
  selectBrokerError,
  selectBrokerMap,
  selectAllBrokerData,
  selectBrokerId,
  selectBrokerValue,
};

export const coreActions = brokerConceptSlice.actions;

export default brokerConceptSlice.reducer;