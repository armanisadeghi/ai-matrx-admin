/**
 * Instance Conversation History Slice
 *
 * Stores the ordered message history for each execution instance.
 * This is the client-side display record — the server owns the authoritative
 * copy in its database for agent mode.
 *
 * Turn lifecycle:
 *   1. User submits → dispatch(addUserTurn) BEFORE the API call fires
 *      (message appears immediately in the UI)
 *   2. Stream starts → AgentStreamingMessage renders live via accumulatedText
 *   3. isEndEvent fires → dispatch(commitAssistantTurn) with completed text
 *      (streaming message is replaced by the permanent turn)
 *
 * Mode determines how history is used on subsequent sends:
 *   'agent' — server owns history; client only stores for display.
 *             Turn 1 POSTs /ai/agents/{id}; turn 2+ POSTs /ai/conversations/{id}.
 *   'chat'  — builder-only. Client owns history; turns[] is serialized into
 *             messages[] every call so the builder reads the LIVE unsaved
 *             agent definition.
 *
 * Mode is set once at instance creation and never mutated.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { destroyInstance } from "../conversations/conversations.slice";
import type { CompletionStats } from "@/features/agents/types/instance.types";
import type { ClientMetrics } from "@/features/agents/types/request.types";
import type { Json } from "@/types/database.types";
import type {
  MessagePart,
  RenderBlockPayload,
} from "@/types/python-generated/stream-events";
import type { CxContentBlock } from "@/features/public-chat/types/cx-tables";

// =============================================================================
// Types
// =============================================================================

export type ConversationMode = "agent" | "chat";

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

  /**
   * Raw message parts from the database (cx_message.content[]).
   * Stored as-is — selectors convert to ContentSegment[] for rendering.
   * Only present on DB-loaded turns; streaming turns use activeRequests.
   */
  messageParts?: MessagePart[];

  /**
   * DB-compatible content blocks in cx_message.content[] format.
   * Assembled from activeRequests at commitAssistantTurn time, or
   * copied verbatim from CxMessage.content on DB-loaded turns.
   * This is the authoritative format for edits, API requests, and persistence.
   * Use this (not renderBlocks) when calling cx_message_edit or assembling chat messages.
   */
  cxContentBlocks?: CxContentBlock[];

  /**
   * Streaming-path renderBlocks (Pre-processed, parsed items like Flashcards, Quiz, Timeline, etc.) attached during
   * addUserTurn or commitAssistantTurn. Used by AgentUserMessage for
   * inline attachment rendering. Separate from cxContentBlocks (DB path).
   */
  renderBlocks?: RenderBlockPayload[];

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
  conversationId: string;

  /**
   * The endpoint family — determines whether history is sent on next turn.
   * Set once at instance creation time and never mutated.
   */
  mode: ConversationMode;

  /** Ordered turn history (legacy display shape — see MessageRecord below). */
  turns: ConversationTurn[];

  /** True if turns were loaded from a previous session (Supabase fetch) */
  loadedFromHistory: boolean;

  /** Server-assigned conversation label (from conversation_labeled data event) */
  title: string | null;
  description: string | null;
  keywords: string[] | null;

  // =========================================================================
  // DB-faithful storage (Phase 1.3 addition)
  //
  // Canonical shape mirrors `cx_message.Row` so the CRUD identity test holds:
  // read → modify → write → re-read round-trips without schema drift. The
  // legacy `turns[]` field remains while consumers migrate, and is kept in
  // sync by stream-commit paths.
  //
  // Populated by:
  //   - `hydrateMessages` (from `loadConversation` / `get_cx_conversation_bundle`)
  //   - `reserveMessage` (on `record_reserved cx_message` stream event)
  //   - `updateMessageStatus` (on `record_update cx_message` stream event)
  //   - `commitAssistantTurn` (on stream `completion` — mirrors the turn into byId)
  // =========================================================================

  /**
   * Stable ordered message ids (server-assigned `cx_message.id`) — the spine
   * of the transcript. Use this for iteration order; don't rely on `turns[]`.
   */
  orderedIds?: string[];

  /** DB-faithful records keyed by server-assigned `cx_message.id`. */
  byId?: Record<string, MessageRecord>;
}

export interface InstanceConversationHistoryState {
  byConversationId: Record<string, InstanceConversationHistoryEntry>;
}

// =============================================================================
// DB-faithful MessageRecord — matches `public.cx_message.Row`
//
// This is the canonical message shape. Display transforms happen in selectors
// (see `selectDisplayMessages`) — not at the slice level — so round-tripping
// through the DB preserves identity.
// =============================================================================

export interface MessageRecord {
  // ── cx_message.Row mirror (keep alphabetical so diffs against the DB
  // regenerated types are easy to review)
  id: string;
  conversationId: string;
  agentId: string | null;
  role: "system" | "user" | "assistant";
  /** CxContentBlock[] — NOT a flat string. Render via `selectDisplayMessages`. */
  content: Json;
  contentHistory: Json | null;
  userContent: Json | null;
  position: number;
  source: string;
  /**
   * Server status on cx_message. Observed values: "reserved" (row just
   * reserved, no content yet), "streaming", "active", "edited", "deleted".
   */
  status: string;
  isVisibleToModel: boolean;
  isVisibleToUser: boolean;
  metadata: Json;
  createdAt: string;
  deletedAt: string | null;

  // ── Client-only fields (NOT serialized back to the server on CRUD writes)
  /** Client-side rollup status — maps to streaming/commit UI states. */
  _clientStatus?: "pending" | "streaming" | "complete" | "error";
  /** While a turn is live, points at `activeRequests.byRequestId[_streamRequestId]`. */
  _streamRequestId?: string;
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
  byConversationId: {},
};

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    /** Initialize the history entry for a new instance. */
    initInstanceHistory(
      state,
      action: PayloadAction<{
        conversationId: string;
        mode?: ConversationMode;
      }>,
    ) {
      const { conversationId, mode = "agent" } = action.payload;
      if (!state.byConversationId[conversationId]) {
        state.byConversationId[conversationId] = {
          conversationId,
          mode,
          turns: [],
          loadedFromHistory: false,
          title: null,
          description: null,
          keywords: null,
          orderedIds: [],
          byId: {},
        };
      }
    },

    // ── DB-faithful storage reducers (Phase 1.3) ─────────────────────────────

    /**
     * Reserve a placeholder for a server-assigned message id. Fired on the
     * `record_reserved cx_message` stream event BEFORE any content lands.
     * The record is created in status "reserved"; subsequent updates flow
     * through `updateMessageRecord` / `commitAssistantTurn`.
     */
    reserveMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        role?: MessageRecord["role"];
        agentId?: string | null;
        position?: number;
      }>,
    ) {
      const {
        conversationId,
        messageId,
        role = "assistant",
        agentId = null,
        position = 0,
      } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry) return;
      if (!entry.byId) entry.byId = {};
      if (!entry.orderedIds) entry.orderedIds = [];
      if (entry.byId[messageId]) return; // already reserved
      const now = new Date().toISOString();
      entry.byId[messageId] = {
        id: messageId,
        conversationId,
        agentId,
        role,
        content: [] as unknown as Json,
        contentHistory: null,
        userContent: null,
        position,
        source: "",
        status: "reserved",
        isVisibleToModel: true,
        isVisibleToUser: true,
        metadata: {} as Json,
        createdAt: now,
        deletedAt: null,
        _clientStatus: "pending",
      };
      entry.orderedIds.push(messageId);
    },

    /** Update one or more fields on a MessageRecord by id. */
    updateMessageRecord(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        patch: Partial<MessageRecord>;
      }>,
    ) {
      const { conversationId, messageId, patch } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry?.byId?.[messageId]) return;
      Object.assign(entry.byId[messageId], patch);
    },

    /**
     * Hydrate multiple MessageRecords from the DB. Called by
     * `loadConversation` after `get_cx_conversation_bundle` returns. Replaces
     * any existing `byId` + `orderedIds` for this conversation.
     */
    hydrateMessages(
      state,
      action: PayloadAction<{
        conversationId: string;
        messages: MessageRecord[];
      }>,
    ) {
      const { conversationId, messages } = action.payload;
      let entry = state.byConversationId[conversationId];
      if (!entry) {
        entry = {
          conversationId,
          mode: "agent",
          turns: [],
          loadedFromHistory: true,
          title: null,
          description: null,
          keywords: null,
          orderedIds: [],
          byId: {},
        };
        state.byConversationId[conversationId] = entry;
      }
      const sorted = [...messages].sort((a, b) => a.position - b.position);
      entry.byId = {};
      entry.orderedIds = [];
      for (const msg of sorted) {
        entry.byId[msg.id] = {
          ...msg,
          _clientStatus: "complete",
        };
        entry.orderedIds.push(msg.id);
      }
      entry.loadedFromHistory = true;
    },

    /**
     * Add the user's message immediately when they submit.
     * Called BEFORE the API call fires so the message appears instantly.
     */
    addUserTurn(
      state,
      action: PayloadAction<{
        conversationId: string;
        content: string;
        messageParts?: MessagePart[];
        cxContentBlocks?: CxContentBlock[];
        systemGenerated?: boolean;
      }>,
    ) {
      const {
        conversationId,
        content,
        messageParts,
        cxContentBlocks,
        systemGenerated,
      } = action.payload;

      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      entry.turns.push({
        turnId: newTurnId(),
        role: "user",
        content,
        ...(messageParts && { messageParts }),
        ...(cxContentBlocks &&
          cxContentBlocks.length > 0 && { cxContentBlocks }),
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
        conversationId: string;
        requestId: string;
        content: string;
        messageParts?: MessagePart[];
        cxContentBlocks?: CxContentBlock[];
        renderBlocks?: RenderBlockPayload[];
        tokenUsage?: TokenUsage;
        finishReason?: string;
        completionStats?: CompletionStats;
        errorMessage?: string;
      }>,
    ) {
      const {
        conversationId,
        requestId,
        content,
        messageParts,
        cxContentBlocks,
        renderBlocks,
        tokenUsage,
        finishReason,
        completionStats,
        errorMessage,
      } = action.payload;

      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      entry.turns.push({
        turnId: newTurnId(),
        role: "assistant",
        content,
        timestamp: new Date().toISOString(),
        requestId,
        conversationId,
        ...(messageParts && { messageParts }),
        ...(cxContentBlocks &&
          cxContentBlocks.length > 0 && { cxContentBlocks }),
        ...(renderBlocks && { renderBlocks }),
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
        conversationId: string;
        requestId: string;
        clientMetrics: ClientMetrics;
      }>,
    ) {
      const { conversationId, requestId, clientMetrics } = action.payload;
      const entry = state.byConversationId[conversationId];
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
        conversationId: string;
        turns: ConversationTurn[];
        mode?: ConversationMode;
      }>,
    ) {
      const { conversationId, turns, mode = "agent" } = action.payload;

      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      entry.turns = turns;
      entry.mode = mode;
      entry.loadedFromHistory = true;
    },

    /**
     * Store raw MessagePart[] on an existing turn by turnId.
     * Used for DB-loaded turns that need their full parts array attached.
     */
    setTurnMessageParts(
      state,
      action: PayloadAction<{
        conversationId: string;
        turnId: string;
        messageParts: MessagePart[];
      }>,
    ) {
      const { conversationId, turnId, messageParts } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      const turn = entry.turns.find((t) => t.turnId === turnId);
      if (turn) {
        turn.messageParts = messageParts;
      }
    },

    /**
     * Store DB-compatible CxContentBlock[] on an existing turn by turnId.
     * Used for DB-loaded turns and after cx_message_edit to keep the turn
     * in sync with the persisted state. This is the authoritative copy for
     * edits and API request assembly.
     */
    setTurnCxContentBlocks(
      state,
      action: PayloadAction<{
        conversationId: string;
        turnId: string;
        cxContentBlocks: CxContentBlock[];
      }>,
    ) {
      const { conversationId, turnId, cxContentBlocks } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      const turn = entry.turns.find((t) => t.turnId === turnId);
      if (turn) {
        turn.cxContentBlocks = cxContentBlocks;
      }
    },

    /** Set conversation label from server's conversation_labeled data event. */
    setConversationLabel(
      state,
      action: PayloadAction<{
        conversationId: string;
        title: string;
        description: string | null;
        keywords: string[] | null;
      }>,
    ) {
      const { conversationId, title, description, keywords } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry) {
        entry.title = title;
        entry.description = description;
        entry.keywords = keywords;
      }
    },

    /** Clear all turns (reset for a new run on the same instance). */
    clearHistory(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.turns = [];
        entry.loadedFromHistory = false;
        entry.mode = "agent";
        entry.title = null;
        entry.description = null;
        entry.keywords = null;
      }
    },

    removeInstanceHistory(state, action: PayloadAction<string>) {
      delete state.byConversationId[action.payload];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(destroyInstance, (state, action) => {
      delete state.byConversationId[action.payload];
    });
  },
});

export const {
  initInstanceHistory,
  addUserTurn,
  commitAssistantTurn,
  attachClientMetrics,
  loadConversationHistory,
  setTurnMessageParts,
  setTurnCxContentBlocks,
  setConversationLabel,
  clearHistory,
  removeInstanceHistory,
  // DB-faithful storage (Phase 1.3)
  reserveMessage,
  updateMessageRecord,
  hydrateMessages,
} = messagesSlice.actions;

export default messagesSlice.reducer;
