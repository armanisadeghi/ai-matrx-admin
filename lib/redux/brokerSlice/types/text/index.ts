import { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';
import { BrokerState, BrokerIdentifier } from '../../core/types';
import { ensureBrokerIdAndMapping, getBrokerId } from '../../core/helpers';

export const textReducers = {
  setBrokerText(state: BrokerState, action: PayloadAction<{
    idArgs: BrokerIdentifier;
    text: string;
  }>) {
    const { idArgs, text } = action.payload;
    const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
    if (!targetBrokerId) {
      state.error = 'No brokerId could be resolved or created for text';
      return;
    }
    state.brokers[targetBrokerId] = text;
    state.error = undefined;
  },
  clearBrokerText(state: BrokerState, action: PayloadAction<{
    idArgs: BrokerIdentifier;
  }>) {
    const { idArgs } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for clearing text';
      return;
    }
    state.brokers[targetBrokerId] = '';
    state.error = undefined;
  },
};

const selectBrokerText = createSelector(
  [(state: RootState, idArgs: BrokerIdentifier) => state.brokerConcept.brokers[getBrokerId(state.brokerConcept, idArgs) || '']],
  (brokerValue): string | undefined => (typeof brokerValue === 'string' ? brokerValue : undefined)
);

const selectBrokerTextLength = createSelector(
  [selectBrokerText],
  (text): number => text?.length || 0
);

export const textSelectors = {
  selectBrokerText,
  selectBrokerTextLength,
};