import { PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import { RootState } from '@/lib/redux';
import { BrokerState, BrokerIdentifier } from '../../core/types';
import { ensureBrokerIdAndMapping, getBrokerId } from '../../core/helpers';

export const dynamicReducers = {
  setBrokerDynamic(state: BrokerState, action: PayloadAction<{
    idArgs: BrokerIdentifier;
    value: any;
  }>) {
    const { idArgs, value } = action.payload;
    const targetBrokerId = ensureBrokerIdAndMapping(state, idArgs, true);
    if (!targetBrokerId) {
      state.error = 'No brokerId could be resolved or created for dynamic value';
      return;
    }
    state.brokers[targetBrokerId] = value;
    state.error = undefined;
  },
  clearBrokerDynamic(state: BrokerState, action: PayloadAction<{
    idArgs: BrokerIdentifier;
  }>) {
    const { idArgs } = action.payload;
    const targetBrokerId = getBrokerId(state, idArgs);
    if (!targetBrokerId) {
      state.error = 'BrokerId not found for clearing dynamic value';
      return;
    }
    state.brokers[targetBrokerId] = undefined;
    state.error = undefined;
  },
};

const selectBrokerDynamic = createSelector(
  [(state: RootState, idArgs: BrokerIdentifier) => state.brokerConcept.brokers[getBrokerId(state.brokerConcept, idArgs) || '']],
  (brokerValue): any => brokerValue
);

const selectBrokerDynamicType = createSelector(
  [selectBrokerDynamic],
  (value): string => typeof value
);

export const dynamicSelectors = {
  selectBrokerDynamic,
  selectBrokerDynamicType,
};