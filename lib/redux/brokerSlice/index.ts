import { createSlice } from '@reduxjs/toolkit';
import { BrokerState } from './core/types';
import { coreReducers, coreSelectors } from './core';
import { optionsReducers, optionsSelectors } from './types/options';
import { tableReducers, tableSelectors } from './types/tables';
import { textReducers, textSelectors } from './types/text';
import { dynamicReducers, dynamicSelectors } from './types/dynamic';

// Define typed initial state
const initialState: BrokerState = {
  brokers: {},
  brokerMap: {},
  error: undefined,
};

// Create the slice with combined reducers
const brokerConceptSlice = createSlice({
  name: 'brokerConcept',
  initialState,
  reducers: {
    ...coreReducers, // Use raw reducer functions, not action creators
    ...optionsReducers,
    ...tableReducers,
    ...textReducers,
    ...dynamicReducers,
  },
});

// Export actions and selectors
export const brokerConceptActions = brokerConceptSlice.actions;
export const brokerConceptSelectors = {
  ...coreSelectors,
  ...optionsSelectors,
  ...tableSelectors,
  ...textSelectors,
  ...dynamicSelectors,
};

// Re-export types from core and type-specific modules
export * from './core/types'; // BrokerState, BrokerIdentifier, BrokerMapEntry, DynamicBrokerMapEntry
export * from './types/options/types'; // FieldOption, FieldOptionsRuntime
export * from './types/tables/types'; // Table, Column, Row
// export * from './types/text/types'; // Any text-specific types (if defined)
// export * from './types/dynamic/types'; // Any dynamic-specific types (if defined)

export default brokerConceptSlice.reducer;