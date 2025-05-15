import { PayloadAction } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "@/lib/redux";
import { BrokerState, BrokerMapEntry, DynamicBrokerMapEntry, BrokerIdentifier } from "./types";
import { getBrokerId } from "./helpers";
import { v4 as uuidv4 } from "uuid";

// Define core reducers for broker mapping and value management
export const coreReducers = {
    // Sets the broker mapping from database entries
    setMap(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
        const newMap: BrokerState["brokerMap"] = {};
        action.payload.forEach((entry) => {
            const key = `${entry.source}:${entry.itemId}`;
            newMap[key] = entry;
        });
        state.brokerMap = newMap;
        state.error = undefined;
    },

    // Adds or updates a single broker mapping entry
    updateMapEntry(state: BrokerState, action: PayloadAction<BrokerMapEntry>) {
        const entry = action.payload;
        const mapKey = `${entry.source}:${entry.itemId}`;
        state.brokerMap[mapKey] = entry;
        state.error = undefined;
    },

    // Creates a dynamic broker for testing purposes only
    addDynamicBroker(state: BrokerState, action: PayloadAction<DynamicBrokerMapEntry | DynamicBrokerMapEntry[]>) {
        const entries = Array.isArray(action.payload) ? action.payload : [action.payload];
        
        const newMapEntries: Record<string, BrokerMapEntry> = {};
        const newBrokers: Record<string, any> = {};
        
        entries.forEach((entry) => {
            const mapKey = `${entry.source}:${entry.itemId}`;
            if (state.brokerMap[mapKey]) {
                return; // Skip existing entries
            }
            
            const brokerId = uuidv4();
            newMapEntries[mapKey] = { 
                source: entry.source, 
                sourceId: entry.sourceId || "", 
                itemId: entry.itemId, 
                brokerId 
            };
            newBrokers[brokerId] = undefined; // Initialize with undefined
        });
        
        // Update state with new entries
        state.brokerMap = { ...state.brokerMap, ...newMapEntries };
        state.brokers = { ...state.brokers, ...newBrokers };
        state.error = undefined;
    },

    // Removes a specific broker mapping
    removeMapEntry(state: BrokerState, action: PayloadAction<{ source: string; itemId: string }>) {
        const { source, itemId } = action.payload;
        const mapKey = `${source}:${itemId}`;
        
        // Create new brokerMap without the specified entry
        const { [mapKey]: removed, ...newMap } = state.brokerMap;
        state.brokerMap = newMap;
        state.error = undefined;
    },

    // Clears all broker mappings
    clearMap(state: BrokerState) {
        state.brokerMap = {};
        state.error = undefined;
    },

    // Sets a broker's value
    setValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Updates a broker's value
    updateValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; value: any }>) {
        const { idArgs, value } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        state.brokers[targetBrokerId] = value;
        state.error = undefined;
    },

    // Removes a broker's value
    removeValue(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
        const { idArgs } = action.payload;
        const targetBrokerId = getBrokerId(state, idArgs);
        if (!targetBrokerId) return;
        
        // Create new brokers object without the specified broker
        const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
        state.brokers = newBrokers;
        state.error = undefined;
    },

    // Clears all broker values
    clearAllValues(state: BrokerState) {
        state.brokers = {};
        state.error = undefined;
    },

    // Clears the error state
    clearError(state: BrokerState) {
        state.error = undefined;
    },

    addMapEntries(state: BrokerState, action: PayloadAction<BrokerMapEntry[]>) {
      const entries = action.payload;
      entries.forEach((entry) => {
          const key = `${entry.source}:${entry.itemId}`;
          state.brokerMap[key] = entry;
          // Initialize broker value as undefined
          if (!state.brokers[entry.brokerId]) {
              state.brokers[entry.brokerId] = undefined;
          }
      });
      state.error = undefined;
  },

  // Remove multiple map entries at once
  removeMapEntries(state: BrokerState, action: PayloadAction<BrokerIdentifier[]>) {
      const identifiers = action.payload;
      const newMap = { ...state.brokerMap };
      
      identifiers.forEach(({ source, itemId }) => {
          const key = `${source}:${itemId}`;
          delete newMap[key];
      });
      
      state.brokerMap = newMap;
      state.error = undefined;
  },
  
};

// Core Selectors
const selectBrokerConceptSlice = (state: RootState) => state.brokerConcept;

const selectError = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.error
);

const selectMap = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.brokerMap
);

const selectAllValues = createSelector(
    [selectBrokerConceptSlice], 
    (state) => state.brokers
);

// Create input selector for idArgs to avoid creating new objects
const selectIdArgs = (_: RootState, idArgs: BrokerIdentifier) => idArgs;

const selectBrokerId = createSelector(
    [selectBrokerConceptSlice, selectIdArgs], 
    (state, idArgs) => getBrokerId(state, idArgs)
);

const selectValue = createSelector(
    [selectAllValues, selectBrokerId], 
    (brokers, brokerId) => brokerId ? brokers[brokerId] : undefined
);

// Additional utility selectors
const selectMapEntry = createSelector(
    [selectMap, (_: RootState, source: string, itemId: string) => ({ source, itemId })],
    (map, { source, itemId }) => {
        const mapKey = `${source}:${itemId}`;
        return map[mapKey];
    }
);

const selectHasValue = createSelector(
    [selectValue],
    (value) => value !== undefined
);

export const coreSelectors = {
    selectError,
    selectMap,
    selectAllValues,
    selectBrokerId,
    selectValue,
    selectMapEntry,
    selectHasValue,
};