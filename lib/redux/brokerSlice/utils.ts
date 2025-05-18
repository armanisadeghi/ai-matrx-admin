// lib/redux/brokerSlice/utils.ts

import { BrokerState, BrokerIdentifier, BrokerMapEntry } from './types';

export const resolveBrokerId = (state: BrokerState, idArgs: BrokerIdentifier): string | undefined => {
  if ('brokerId' in idArgs) {
    return idArgs.brokerId;
  }
  if ('source' in idArgs && 'mappedItemId' in idArgs) {
    const mapKey = `${idArgs.source}:${idArgs.mappedItemId}`;
    const brokerId = state.brokerMap[mapKey]?.brokerId;
    if (!brokerId) {
      console.warn(`No brokerId found for mapKey: ${mapKey}`);
    }
    return brokerId;
  }
  console.error(`Invalid BrokerIdentifier: ${JSON.stringify(idArgs)}`);
  return undefined;
};
