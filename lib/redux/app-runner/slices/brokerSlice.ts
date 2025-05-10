import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';

interface BrokerMapEntry {
  source: string;
  sourceId: string;
  itemId: string;
  brokerId: string;
}

interface BrokerState {
  brokers: { [brokerId: string]: any };
  brokerMap: { [key: string]: BrokerMapEntry };
}

const initialState: BrokerState = {
  brokers: {},
  brokerMap: {},
};

const brokersSlice = createSlice({
  name: 'brokers',
  initialState,
  reducers: {
    updateBrokerValue(
      state,
      action: PayloadAction<{
        source?: string;
        itemId?: string;
        brokerId?: string;
        value: any;
      }>
    ) {
      const { source, itemId, brokerId, value } = action.payload;

      // Determine brokerId
      let targetBrokerId: string | undefined = brokerId;
      if (source && itemId) {
        const mapKey = `${source}:${itemId}`;
        targetBrokerId = state.brokerMap[mapKey]?.brokerId;
      }

      if (!targetBrokerId) {
        console.warn('No brokerId found for update', { source, itemId, brokerId });
        return;
      }

      // Update broker value
      state.brokers[targetBrokerId] = value;
    },
    setBrokerMap(state, action: PayloadAction<BrokerMapEntry[]>) {
      const newMap: BrokerState['brokerMap'] = {};
      action.payload.forEach((entry) => {
        const key = `${entry.source}:${entry.itemId}`;
        newMap[key] = entry;
      });
      state.brokerMap = newMap;
    },
    resetMapEntry(
      state,
      action: PayloadAction<{ source: string; itemId: string }>
    ) {
      const { source, itemId } = action.payload;
      const mapKey = `${source}:${itemId}`;
      delete state.brokerMap[mapKey];
    },
    resetMapFull(state) {
      state.brokerMap = {};
    },
    resetBrokerValue(
      state,
      action: PayloadAction<{
        source?: string;
        itemId?: string;
        brokerId?: string;
      }>
    ) {
      const { source, itemId, brokerId } = action.payload;

      // Determine brokerId
      let targetBrokerId: string | undefined = brokerId;
      if (source && itemId) {
        const mapKey = `${source}:${itemId}`;
        targetBrokerId = state.brokerMap[mapKey]?.brokerId;
      }

      if (!targetBrokerId) {
        console.warn('No brokerId found for reset', { source, itemId, brokerId });
        return;
      }

      // Reset broker value to undefined
      delete state.brokers[targetBrokerId];
    },
    resetAllBrokerValues(state) {
      state.brokers = {};
    },
  },
});

export const {
  updateBrokerValue,
  setBrokerMap,
  resetMapEntry,
  resetMapFull,
  resetBrokerValue,
  resetAllBrokerValues,
} = brokersSlice.actions;

// Selectors
const selectBrokersState = (state: RootState) => state.brokers;

export const selectBrokerValue = createSelector(
  [
    selectBrokersState,
    (_: RootState, source: string, itemId: string) => ({ source, itemId }),
  ],
  (brokersState, { source, itemId }) => {
    const mapKey = `${source}:${itemId}`;
    const brokerId = brokersState.brokerMap[mapKey]?.brokerId;
    return brokerId ? brokersState.brokers[brokerId] : undefined;
  }
);

export const selectBrokerValueByBrokerId = createSelector(
  [selectBrokersState, (_: RootState, brokerId: string) => brokerId],
  (brokersState, brokerId) => brokersState.brokers[brokerId]
);

export default brokersSlice.reducer;