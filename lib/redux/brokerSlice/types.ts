// lib/redux/brokerSlice/types.ts

export type BrokerIdentifier =
  | { brokerId: string; source?: string; id?: string }
  | { source: string; id: string; brokerId?: string };

export interface BrokerMapEntry {
  brokerId: string;
  id: string;
  source: string;
  sourceId: string;
}

export interface BrokerState {
  brokers: { [brokerId: string]: any };
  brokerMap: { [key: string]: BrokerMapEntry };
  error?: string;
}

export interface DynamicBrokerMapEntry {
  source: string;
  sourceId: string;
  id: string;
}

export interface FieldOption {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  iconName?: string;
  parentId?: string;
  metadata?: any;
}

export interface FieldOptionsRuntime extends FieldOption {
  isSelected: boolean;
  otherText: string;
}

export interface Table {
  columns: Column[];
  rows: Row[];
}

export interface Column {
  id: string;
  name: string;
  type?: string;
  order?: number;
  isFixed?: boolean;
  minWidthClass?: string;
}

export interface Row {
  id: string;
  cells: { [columnId: string]: any };
  order?: number;
}