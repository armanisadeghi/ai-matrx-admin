// Shared interfaces used across all data types
export type BrokerIdentifier =
  | { brokerId: string; source?: never; itemId?: never; sourceId?: never }
  | { brokerId?: never; source: string; sourceId?: string; itemId: string };

export interface BrokerMapEntry {
  source: string;
  sourceId: string;
  itemId: string;
  brokerId: string;
}

export interface BrokerState {
  brokers: { [brokerId: string]: any };
  brokerMap: { [key: string]: BrokerMapEntry };
  error?: string;
}

export interface DynamicBrokerMapEntry {
  source: string;
  sourceId: string;
  itemId: string;
}

