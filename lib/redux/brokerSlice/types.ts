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
  isFixed?: boolean;        // Whether the column is draggable/deletable
  minWidthClass?: string;   // CSS class for minimum width
}

export interface Row {
  id: string;
  cells: { [columnId: string]: any };
  order?: number;
}