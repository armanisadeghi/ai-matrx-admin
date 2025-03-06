// types.ts
export interface Message {
    id: string;
    text: string;
    role: 'user' | 'assistant' | 'system' | string;
    timestamp: string;
    metadata?: any;
    isStreaming?: boolean;
  }
  
  export type MessageEntityType = {
    id: string;
    conversationId: string;
    role: "assistant" | "system" | "user" | undefined;
    content?: string;
    type: "base64_image" | "blob" | "image_url" | "json_object" | "mixed" | "other" | "text" | "tool_result" | undefined;
    displayOrder?: number;
    systemOrder?: number;
    createdAt: Date;
    metadata?: Record<string, unknown>;
}
