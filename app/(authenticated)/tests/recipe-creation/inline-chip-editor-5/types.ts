// types.ts

export interface ContentBlock {
  id: string;
  type: "text" | "chip" | "lineBreak";
  content: string;
  position: number;
}

export interface DocumentState {
  blocks: ContentBlock[];
  version: number;
  lastUpdate: number;
}

