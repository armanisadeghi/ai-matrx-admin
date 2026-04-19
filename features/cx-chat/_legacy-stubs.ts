// TEMPORARY STUB — delete when cx-chat/cx-conversation refactor lands.
// Replaces removed `@/features/agents/redux/legacy-shims/*` modules with
// typed no-op placeholders so TypeScript compiles. Dispatched actions are
// harmless (no reducer handles them); selectors return empty defaults.

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export type ApiMode = "agent" | "chat" | "prompt" | string;

export interface ChatModeConfig {
  systemPrompt?: string;
  model?: string;
  [key: string]: unknown;
}

export type MessageRole = "user" | "assistant" | "system" | "tool";
export type MessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error"
  | string;
export type SessionStatus = "idle" | "active" | "error" | string;

export interface ConversationResource {
  id: string;
  type?: string;
  name?: string;
  [key: string]: unknown;
}

export interface ConversationMessage {
  id: string;
  role?: MessageRole;
  content?: string;
  rawContent?: unknown;
  status?: MessageStatus;
  [key: string]: unknown;
}

export interface SessionUIState {
  showDebugInfo?: boolean;
  showSystemMessages?: boolean;
  showVariables?: boolean;
  expandedVariable?: string | null;
  [key: string]: unknown;
}

export interface ConversationSession {
  id: string;
  status?: SessionStatus;
  messages?: ConversationMessage[];
  resources?: ConversationResource[];
  ui?: SessionUIState;
  [key: string]: unknown;
}

export interface ChatConversationsState {
  sessions: Record<string, ConversationSession>;
}

// Payload placeholders — permissive shapes matching caller usage.
export interface StartSessionPayload {
  sessionId: string;
  [key: string]: unknown;
}
export interface AddMessagePayload {
  sessionId: string;
  message: ConversationMessage;
}
export interface UpdateMessagePayload {
  sessionId?: string;
  messageId: string;
  id?: string;
  updates?: Partial<ConversationMessage>;
  content?: unknown;
  [key: string]: unknown;
}
export interface AppendStreamChunkPayload {
  sessionId: string;
  messageId: string;
  chunk: string;
}
export interface PushStreamEventPayload {
  sessionId: string;
  event: unknown;
}
export interface SetConversationIdPayload {
  sessionId: string;
  conversationId: string;
}
export interface SetCurrentInputPayload {
  sessionId: string;
  input: string;
}
export interface UpdateVariablePayload {
  sessionId: string;
  name: string;
  value: unknown;
}
export interface SetExpandedVariablePayload {
  sessionId: string;
  name: string | null;
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
  updates: Partial<SessionUIState>;
}
export interface LoadConversationPayload {
  sessionId: string;
  conversationId: string;
}

export interface ActiveChatAgent {
  promptId?: string;
  name?: string;
  description?: string;
  configFetched?: boolean;
  variableDefaults?: unknown;
}

// ────────────────────────────────────────────────────────────────────────────
// Reducer (no-op)
// ────────────────────────────────────────────────────────────────────────────

export const chatConversationsReducer = (
  state: ChatConversationsState = { sessions: {} },
  _action: { type: string; payload?: unknown },
): ChatConversationsState => state;

// ────────────────────────────────────────────────────────────────────────────
// Action creators — return PayloadAction-shaped objects. No reducer handles
// them; dispatching is a harmless no-op.
// ────────────────────────────────────────────────────────────────────────────

const makeAction =
  <P>(type: string) =>
  (payload: P) =>
    ({ type: `cx/stub/${type}` as const, payload }) as const;

export const chatConversationsActions = {
  startSession: makeAction<StartSessionPayload>("startSession"),
  removeSession: makeAction<string>("removeSession"),
  clearMessages: makeAction<string>("clearMessages"),
  addMessage: makeAction<AddMessagePayload>("addMessage"),
  updateMessage: makeAction<UpdateMessagePayload>("updateMessage"),
  resetMessageContent: makeAction<{ sessionId?: string; messageId: string }>(
    "resetMessageContent",
  ),
  appendStreamChunk: makeAction<AppendStreamChunkPayload>("appendStreamChunk"),
  pushStreamEvent: makeAction<PushStreamEventPayload>("pushStreamEvent"),
  setConversationId: makeAction<SetConversationIdPayload>("setConversationId"),
  setCurrentInput: makeAction<SetCurrentInputPayload>("setCurrentInput"),
  updateVariable: makeAction<UpdateVariablePayload>("updateVariable"),
  setExpandedVariable: makeAction<SetExpandedVariablePayload>(
    "setExpandedVariable",
  ),
  addResource: makeAction<AddResourcePayload>("addResource"),
  removeResource: makeAction<RemoveResourcePayload>("removeResource"),
  clearResources: makeAction<string>("clearResources"),
  updateUIState: makeAction<UpdateUIStatePayload>("updateUIState"),
  loadConversation: makeAction<LoadConversationPayload>("loadConversation"),
};

export const activeChatActions = {
  setSelectedAgent: makeAction<ActiveChatAgent>("setSelectedAgent"),
  setModelOverride: makeAction<string>("setModelOverride"),
  setAgentDefaultSettings: makeAction<unknown>("setAgentDefaultSettings"),
};

// ────────────────────────────────────────────────────────────────────────────
// Thunks — async no-ops. Callers `await dispatch(thunk(args))`.
// ────────────────────────────────────────────────────────────────────────────

type Thunk<A, R = void> = (
  args: A,
) => (...rest: unknown[]) => Promise<R>;

const stubThunk =
  <A, R = void>(): Thunk<A, R> =>
  (_args: A) =>
  async () =>
    undefined as R;

export const sendMessage = stubThunk<{
  sessionId: string;
  input?: string;
  [key: string]: unknown;
}>();

export const loadConversationHistory = stubThunk<{
  sessionId: string;
  conversationId: string;
}>();

export const editMessage = stubThunk<{
  sessionId?: string;
  messageId: string;
  contentBlocks?: unknown;
  [key: string]: unknown;
}>();

// ────────────────────────────────────────────────────────────────────────────
// Selectors — empty defaults. State typed as `unknown` so callers pass the
// app RootState without conflict.
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
const EMPTY_UI: SessionUIState = Object.freeze({});
const EMPTY_SESSION: ConversationSession = Object.freeze({
  id: "",
  messages: [],
  resources: [],
  ui: {},
}) as ConversationSession;

export const selectSession = (
  _state: unknown,
  _sessionId?: string,
): ConversationSession => EMPTY_SESSION;

export const selectMessages = (
  _state: unknown,
  _sessionId?: string,
): ConversationMessage[] => EMPTY_ARRAY as unknown as ConversationMessage[];

export const selectGroupedMessages = (
  _state: unknown,
  _sessionId?: string,
): ConversationMessage[] => EMPTY_ARRAY as unknown as ConversationMessage[];

export const selectResources = (
  _state: unknown,
  _sessionId?: string,
): ConversationResource[] => EMPTY_ARRAY as unknown as ConversationResource[];

export const selectUIState = (
  _state: unknown,
  _sessionId?: string,
): SessionUIState => EMPTY_UI;

export const selectIsStreaming = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectIsExecuting = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectSessionStatus = (
  _state: unknown,
  _sessionId?: string,
): SessionStatus => "idle";

export const selectSessionError = (
  _state: unknown,
  _sessionId?: string,
): string | null => null;

export const selectConversationId = (
  _state: unknown,
  _sessionId?: string,
): string | null => null;

export const selectCurrentInput = (
  _state: unknown,
  _sessionId?: string,
): string => "";

export const selectVariableDefaults = (
  _state: unknown,
  _sessionId?: string,
): unknown[] => EMPTY_ARRAY as unknown as unknown[];

export const selectApiMode = (
  _state: unknown,
  _sessionId?: string,
): ApiMode => "agent";

export const selectExpandedVariable = (
  _state: unknown,
  _sessionId?: string,
): string | null => null;

export const selectShowVariables = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectShowDebugInfo = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectShowSystemMessages = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectSessionHasUnsavedChanges = (
  _state: unknown,
  _sessionId?: string,
): boolean => false;

export const selectDirtyMessages = (
  _state: unknown,
  _sessionId?: string,
): ConversationMessage[] => EMPTY_ARRAY as unknown as ConversationMessage[];

export const selectMessageHasUnsavedChanges = (
  _state: unknown,
  _sessionId?: string,
  _messageId?: string,
): boolean => false;

export const selectMessageHasHistory = (
  _state: unknown,
  _sessionId?: string,
  _messageId?: string,
): boolean => false;

export const selectMessageContentHistory = (
  _state: unknown,
  _sessionId?: string,
  _messageId?: string,
): unknown[] => EMPTY_ARRAY as unknown as unknown[];

export const selectActiveChatAgent = (_state: unknown): ActiveChatAgent => ({
  promptId: undefined,
  name: undefined,
  configFetched: false,
});

// Used by ChatConversationClient — replaces missing messages.selectors export.
export const selectTurnCount =
  (_conversationId: string) =>
  (_state: unknown): number =>
    0;
