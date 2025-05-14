// Shared interfaces used across all data types
export interface BrokerMapEntry {
    source: string;
    sourceId: string;
    itemId: string;
    brokerId: string;
  }
  
  export interface DynamicBrokerMapEntry {
    source: string;
    sourceId: string;
    itemId: string;
  }
  
  export type BrokerIdentifier =
    | { brokerId: string; source?: never; itemId?: never; sourceId?: never }
    | { brokerId?: never; source: string; sourceId: string; itemId: string };
  
  export interface BrokerState {
    brokers: { [brokerId: string]: any }; // Flexible to accommodate all data types
    brokerMap: { [key: string]: BrokerMapEntry };
    error?: string;
  }