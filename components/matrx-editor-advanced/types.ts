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
