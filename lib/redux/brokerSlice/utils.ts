import { BrokerState, BrokerIdentifier, BrokerMapEntry } from './types';

export const getBrokerId = (state: BrokerState, idArgs: BrokerIdentifier): string | undefined => {
  if (idArgs.brokerId) return idArgs.brokerId;
  if (idArgs.source && idArgs.itemId) {
      const mapKey = `${idArgs.source}:${idArgs.itemId}`;
      const brokerId = state.brokerMap[mapKey]?.brokerId;
      if (!brokerId) {
          console.error(`No brokerId found for mapKey: ${mapKey}`);
      }
      return brokerId;
  }
  console.error(`Invalid BrokerIdentifier: ${JSON.stringify(idArgs)}`);
  return undefined;
};