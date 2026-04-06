/**
 * Instance Conversation History Slice
 *
 * Stores the ordered message history for each execution instance.
 * This is the client-side display record — the server owns the authoritative
 * copy in its database for agent/conversation modes.
 *
 * Turn lifecycle:
 *   1. User submits → dispatch(addUserTurn) BEFORE the API call fires
 *      (message appears immediately in the UI)
 *   2. Stream starts → AgentStreamingMessage renders live via accumulatedText
 *   3. isEndEvent fires → dispatch(commitAssistantTurn) with completed text
 *      (streaming message is replaced by the permanent turn)
 *
 * Mode determines how history is used on subsequent sends:
 *   'agent'        — server owns history; client only stores for display
 *   'conversation' — server owns history; client only stores for display
 *   'chat'         — client owns history; turns[] is serialized into messages[]
 *
 * For 'agent' and 'conversation' modes we never send history back.
 * For 'chat' mode, assembleRequest reads turns[] to build the messages[] array.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { destroyInstance } from "../execution-instances/execution-instances.slice";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type { Json } from "@/types/database.types";

// =============================================================================
// Types
// =============================================================================

export type ConversationMode = "agent" | "conversation" | "chat";

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface ConversationTurn {
  /** Client-generated UUID for this turn */
  turnId: string;

  /** Role — determines bubble style in the UI */
  role: "user" | "assistant" | "system";

  /** The text content of this turn */
  content: string;

  /** Optional multimodal content blocks (images, files, etc.) */
  contentBlocks?: Array<Record<string, unknown>>;

  /** ISO timestamp when this turn was added/committed */
  timestamp: string;

  /** Links to activeRequests for extended metadata (assistant turns only) */
  requestId: string | null;

  /** Which server conversation this message belongs to */
  conversationId: string | null;

  /** Token usage for this turn (from completion event) */
  tokenUsage?: TokenUsage;

  /** Why the model stopped generating */
  finishReason?: string;

  /** Full completion stats from the server (usage, timing, tools) — assistant turns only */
  completionStats?: CompletionStats;

  /** Client-side performance metrics (timing, data volume) — assistant turns only */
  clientMetrics?: ClientMetrics;

  /**
   * True for turns fabricated from the agent definition (priming messages,
   * auto-generated user messages with variable interpolation).
   * Used by SmartAgentMessageList to hide these when showDefinitionMessages is false.
   */
  systemGenerated?: boolean;

  /** Error message when the stream failed (fatal errors) — assistant turns only */
  errorMessage?: string | null;

  /** Editing / forking support (future) */
  isEdited?: boolean;
  originalContent?: string;
  isFork?: boolean;
  parentTurnId?: string | null;

  /**
   * Fields below mirror `public.cx_message` when a turn is loaded from Supabase
   * or once the stream/API provides row ids and flags. Omitted for purely
   * client-optimistic turns.
   */
  cxMessageId?: string;
  agentId?: string | null;
  position?: number;
  contentHistory?: Json | null;
  deletedAt?: string | null;
  isVisibleToModel?: boolean;
  isVisibleToUser?: boolean;
  /** cx_message.metadata */
  messageMetadata?: Record<string, unknown>;
  /** cx_message.source */
  source?: string;
  /** cx_message.status */
  messageStatus?: string;
  userContent?: Json | null;
}

export interface InstanceConversationHistoryEntry {
  instanceId: string;

  /**
   * The endpoint mode — determines whether history is sent on next turn.
   * Set at instance creation time and updated if the mode switches.
   */
  mode: ConversationMode;

  /** The server-assigned conversation ID (set after first response) */
  conversationId: string | null;

  /** Ordered turn history */
  turns: ConversationTurn[];

  /** True if turns were loaded from a previous session (Supabase fetch) */
  loadedFromHistory: boolean;

  /** Server-assigned conversation label (from conversation_labeled data event) */
  title: string | null;
  description: string | null;
  keywords: string[] | null;
}

export interface InstanceConversationHistoryState {
  byInstanceId: Record<string, InstanceConversationHistoryEntry>;
}

// =============================================================================
// Helpers
// =============================================================================

function newTurnId(): string {
  return uuidv4();
}

// =============================================================================
// Slice
// =============================================================================

const initialState: InstanceConversationHistoryState = {
  byInstanceId: {},
};

const instanceConversationHistorySlice = createSlice({
  name: "instanceConversationHistory",
  initialState,
  reducers: {
    /** Initialize the history entry for a new instance. */
    initInstanceHistory(
      state,
      action: PayloadAction<{
        instanceId: string;
        mode?: ConversationMode;
      }>,
    ) {
      const { instanceId, mode = "agent" } = action.payload;
      if (!state.byInstanceId[instanceId]) {
        state.byInstanceId[instanceId] = {
          instanceId,
          mode,
          conversationId: null,
          turns: [],
          loadedFromHistory: false,
          title: null,
          description: null,
          keywords: null,
        };
      }
    },

    /**
     * Add the user's message immediately when they submit.
     * Called BEFORE the API call fires so the message appears instantly.
     */
    addUserTurn(
      state,
      action: PayloadAction<{
        instanceId: string;
        content: string;
        contentBlocks?: Array<Record<string, unknown>>;
        conversationId?: string | null;
        systemGenerated?: boolean;
      }>,
    ) {
      const {
        instanceId,
        content,
        contentBlocks,
        conversationId = null,
        systemGenerated,
      } = action.payload;

      const entry = state.byInstanceId[instanceId];
      if (!entry) return;

      entry.turns.push({
        turnId: newTurnId(),
        role: "user",
        content,
        ...(contentBlocks && { contentBlocks }),
        timestamp: new Date().toISOString(),
        requestId: null,
        conversationId,
        ...(systemGenerated && { systemGenerated }),
      });
    },

    /**
     * Commit the completed assistant response after the stream ends.
     * Replaces what AgentStreamingMessage was showing.
     */
    commitAssistantTurn(
      state,
      action: PayloadAction<{
        instanceId: string;
        requestId: string;
        content: string;
        conversationId: string | null;
        tokenUsage?: TokenUsage;
        finishReason?: string;
        completionStats?: CompletionStats;
        errorMessage?: string;
      }>,
    ) {
      const {
        instanceId,
        requestId,
        content,
        conversationId,
        tokenUsage,
        finishReason,
        completionStats,
        errorMessage,
      } = action.payload;

      const entry = state.byInstanceId[instanceId];
      if (!entry) return;

      // Update the stored conversationId for subsequent turns
      if (conversationId && !entry.conversationId) {
        entry.conversationId = conversationId;
        // Switch mode to 'conversation' for all subsequent turns
        if (entry.mode === "agent") {
          entry.mode = "conversation";
        }
      }

      entry.turns.push({
        turnId: newTurnId(),
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
        requestId,
        conversationId,
        ...(tokenUsage && { tokenUsage }),
        ...(finishReason && { finishReason }),
        ...(completionStats && { completionStats }),
        ...(errorMessage && { errorMessage }),
      });
    },

    /**
     * Attach client-side performance metrics to the most recent assistant turn.
     * Dispatched once after finalizeClientMetrics — fire-and-forget.
     * Keyed by requestId so it always lands on the correct turn even if
     * multiple concurrent requests are in flight.
     */
    attachClientMetrics(
      state,
      action: PayloadAction<{
        instanceId: string;
        requestId: string;
        clientMetrics: ClientMetrics;
      }>,
    ) {
      const { instanceId, requestId, clientMetrics } = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (!entry) return;

      const turn = entry.turns
        .slice()
        .reverse()
        .find((t) => t.role === "assistant" && t.requestId === requestId);
      if (turn) {
        turn.clientMetrics = clientMetrics;
      }
    },

    /**
     * Load history from a previous session (Supabase fetch).
     * Replaces existing turns.
     */
    loadConversationHistory(
      state,
      action: PayloadAction<{
        instanceId: string;
        turns: ConversationTurn[];
        conversationId: string;
        mode?: ConversationMode;
      }>,
    ) {
      const {
        instanceId,
        turns,
        conversationId,
        mode = "conversation",
      } = action.payload;

      const entry = state.byInstanceId[instanceId];
      if (!entry) return;

      entry.turns = turns;
      entry.conversationId = conversationId;
      entry.mode = mode;
      entry.loadedFromHistory = true;
    },

    /** Set conversation label from server's conversation_labeled data event. */
    setConversationLabel(
      state,
      action: PayloadAction<{
        instanceId: string;
        title: string;
        description: string | null;
        keywords: string[] | null;
      }>,
    ) {
      const { instanceId, title, description, keywords } = action.payload;
      const entry = state.byInstanceId[instanceId];
      if (entry) {
        entry.title = title;
        entry.description = description;
        entry.keywords = keywords;
      }
    },

    /** Clear all turns (reset for a new run on the same instance). */
    clearHistory(state, action: PayloadAction<string>) {
      const entry = state.byInstanceId[action.payload];
      if (entry) {
        entry.turns = [];
        entry.conversationId = null;
        entry.loadedFromHistory = false;
        entry.mode = "agent";
        entry.title = null;
        entry.description = null;
        entry.keywords = null;
      }
    },

    removeInstanceHistory(state, action: PayloadAction<string>) {
      delete state.byInstanceId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byInstanceId[action.payload];
    });
  },
});

export const {
  initInstanceHistory,
  addUserTurn,
  commitAssistantTurn,
  attachClientMetrics,
  loadConversationHistory,
  setConversationLabel,
  clearHistory,
  removeInstanceHistory,
} = instanceConversationHistorySlice.actions;

export default instanceConversationHistorySlice.reducer;
