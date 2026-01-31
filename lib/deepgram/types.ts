// @ts-ignore - Message type not exported from 'ai', using UIMessage or local type instead
import type { UIMessage } from "ai";
type Message = UIMessage; // Fallback type alias

export interface MessageMetadata extends Partial<Message> {
  start?: number;
  response?: number;
  end?: number;
  ttsModel?: string;
}
