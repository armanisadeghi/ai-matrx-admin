import { BrokerDataType } from "@/providers/brokerSync/types";
import { BrokerData, MatrxRecordId } from "@/types";

// types.ts
export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
}

export interface ContentBlock {
  id: string;
  type: "text" | "chip" | "lineBreak";
  content: string;
  position: number;
  style?: TextStyle;  // Add style property
}

export interface DocumentState {
  blocks: ContentBlock[];
  version: number;
  lastUpdate: number;
}

export interface BrokerChipEvent {
  type: "remove" | "edit" | "toggle";
  brokerId: string;
  content?: string;
}

export interface EditorBroker {
  id: MatrxRecordId;
  displayName: string;
  name: string;
  value: Record<string, unknown>;
  stringValue?: string;
  dataType: BrokerDataType;
  color?: string;
  isTemporary?: boolean;
  editorId?: string;
  // Add these required fields
  componentType?: string;
  isConnected?: boolean;
  isDeleted?: boolean;
}


export function toBrokerChip(
  broker: BrokerData,
  editorState?: {
    color?: string;
    isTemporary?: boolean;
    editorId?: string;
  }
): EditorBroker {
  return {
    id: broker.id,
    displayName: broker.displayName ?? broker.name,
    name: broker.name ?? broker.displayName,
    value: broker.value,
    stringValue: broker.stringValue,
    dataType: broker.dataType,
    ...editorState,
  };
}
