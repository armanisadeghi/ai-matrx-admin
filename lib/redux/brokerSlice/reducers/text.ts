import { PayloadAction } from "@reduxjs/toolkit";
import { BrokerState, BrokerIdentifier } from "../types";
import { resolveBrokerId } from "../utils";

// Type guard for text values
const isTextValue = (value: any): value is string => typeof value === "string";

// Reducers for handling string-based data in brokers (e.g., for text inputs)
export const textReducers = {
  // Sets a text value for a broker
  setText(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; text: string }>) {
    const { idArgs, text } = action.payload;
    const targetBrokerId = resolveBrokerId(state, idArgs);
    if (!targetBrokerId) return;
    state.brokers[targetBrokerId] = text;
    state.error = undefined;
  },

  // Updates a text value for a broker (same as set, but included for consistency)
  updateText(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; text: string }>) {
    const { idArgs, text } = action.payload;
    const targetBrokerId = resolveBrokerId(state, idArgs);
    if (!targetBrokerId) return;
    state.brokers[targetBrokerId] = text;
    state.error = undefined;
  },

  // Appends text to existing text value
  appendText(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier; text: string }>) {
    const { idArgs, text } = action.payload;
    const targetBrokerId = resolveBrokerId(state, idArgs);
    if (!targetBrokerId) return;
    const currentValue = state.brokers[targetBrokerId];
    state.brokers[targetBrokerId] = isTextValue(currentValue) 
      ? currentValue + text 
      : text;
    state.error = undefined;
  },

  // Clears a broker's text value
  clearText(state: BrokerState, action: PayloadAction<{ idArgs: BrokerIdentifier }>) {
    const { idArgs } = action.payload;
    const targetBrokerId = resolveBrokerId(state, idArgs);
    if (!targetBrokerId) return;
    const { [targetBrokerId]: removed, ...newBrokers } = state.brokers;
    state.brokers = newBrokers;
    state.error = undefined;
  },
};