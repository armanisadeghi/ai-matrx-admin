/**
 * Legacy type shims for chat-feature imports.
 *
 * Replaces `@/features/agents/redux/old/OLD-cx-message-actions/types`. Types
 * are widened to `unknown` / `Record<string, unknown>` where the precise
 * legacy shape no longer matters; consumers are in chat-feature code that is
 * being rewritten.
 */

export type MessageRole = "system" | "user" | "assistant";

export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error";

export interface ConversationResource {
  id: string;
  [key: string]: unknown;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: string;
  [key: string]: unknown;
}

export type SessionStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "executing"
  | "streaming"
  | "completed"
  | "error";

export type ApiMode = "agent" | "conversation" | "chat";

export interface ChatModeConfig {
  aiModelId: string;
  [key: string]: unknown;
}

export interface SessionUIState {
  [key: string]: unknown;
}

export interface ConversationSession {
  sessionId: string;
  conversationId: string | null;
  agentId: string;
  apiMode: ApiMode;
  status: SessionStatus;
  messages: ConversationMessage[];
  [key: string]: unknown;
}

export interface ChatConversationsState {
  sessions: Record<string, ConversationSession>;
  currentInputs: Record<string, string>;
  resources: Record<string, ConversationResource[]>;
  uiState: Record<string, SessionUIState>;
}

// ── Payload shims (legacy action payloads) ───────────────────────────────────

export interface StartSessionPayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface AddMessagePayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface UpdateMessagePayload {
  sessionId: string;
  messageId: string;
  [key: string]: unknown;
}
export interface AppendStreamChunkPayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface PushStreamEventPayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface SetConversationIdPayload {
  sessionId: string;
  conversationId: string | null;
}
export interface SetCurrentInputPayload {
  sessionId: string;
  input: string;
}
export interface UpdateVariablePayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface SetExpandedVariablePayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface AddResourcePayload {
  sessionId: string;
  resource: ConversationResource;
}
export interface RemoveResourcePayload {
  sessionId: string;
  resourceId: string;
}
export interface UpdateUIStatePayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface LoadConversationPayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface ApplyMessageHistoryPayload {
  sessionId: string;
  [key: string]: unknown;
}
