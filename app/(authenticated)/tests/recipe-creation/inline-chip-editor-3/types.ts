export interface ContentItem {
    type: "text" | "chip";
    content: string;
    id?: string;
  }