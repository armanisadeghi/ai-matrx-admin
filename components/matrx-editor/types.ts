// types.ts
export interface ContentBlock {
  id: string; // For text blocks: generated uuid, For chips: broker.id
  type: "text" | "chip" | "lineBreak";
  content: string;
  position: number;
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
