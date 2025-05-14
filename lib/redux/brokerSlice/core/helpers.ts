import { BrokerState, BrokerIdentifier, BrokerMapEntry } from './types';
import { v4 as uuidv4 } from 'uuid';

export const getBrokerId = (state: BrokerState, idArgs: BrokerIdentifier): string | undefined => {
  if (idArgs.brokerId) return idArgs.brokerId;
  if (idArgs.source && idArgs.itemId) {
    const mapKey = `${idArgs.source}:${idArgs.itemId}`;
    return state.brokerMap[mapKey]?.brokerId;
  }
  return undefined;
};

export const ensureBrokerIdAndMapping = (
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
      state.brokerMap[mapKey] = { source: idArgs.source, sourceId: idArgs.sourceId, itemId: idArgs.itemId, brokerId };
    }
    if (autoCreateBrokerValue && !state.brokers[brokerId]) {
      state.brokers[brokerId] = undefined;
    }
    return brokerId;
  }
  state.error = 'Could not resolve or create brokerId';
  return undefined;
};