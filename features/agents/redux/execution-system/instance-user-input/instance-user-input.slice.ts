/**
 * Instance User Input Slice
 *
 * Manages the message the user is composing for each instance.
 * Can be plain text or mixed content blocks (text + inline images, etc.).
 *
 * Includes a lightweight undo/redo stack that snapshots { text, userValues }
 * together so both are restored atomically on Cmd+Z / Ctrl+Z.
 *
 * Undo behaviour:
 *   - Each setUserInputText push is coalesced if the previous entry was < 800ms ago
 *   - Variable value changes (pushed via pushInputSnapshot) are always committed
 *   - Stack is capped at 100 entries
 *   - Clear-on-send wipes the future stack but preserves past so the user can
 *     undo back to what they were typing before they sent
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InstanceUserInputState } from "@/features/agents/types";
import type { MessagePart } from "@/types/python-generated/stream-events";
import { destroyInstance } from "../execution-instances/execution-instances.slice";

// =============================================================================
// Undo types
// =============================================================================

const UNDO_MAX = 100;
const COALESCE_MS = 800;

export interface InputSnapshot {
  text: string;
  userValues: Record<string, unknown>;
  timestamp: number;
}

// =============================================================================
// State
// =============================================================================

export interface InstanceUserInputEntryWithUndo extends InstanceUserInputState {
  _undoPast: InputSnapshot[];
  _undoFuture: InputSnapshot[];
}

export interface InstanceUserInputSliceState {
  byConversationId: Record<string, InstanceUserInputEntryWithUndo>;
}

const initialState: InstanceUserInputSliceState = {
  byConversationId: {},
};

// =============================================================================
// Helpers
// =============================================================================

function captureSnapshot(
  entry: InstanceUserInputEntryWithUndo,
  userValues: Record<string, unknown>,
): InputSnapshot {
  return {
    text: entry.text,
    userValues: { ...userValues },
    timestamp: Date.now(),
  };
}

function pushSnapshot(
  entry: InstanceUserInputEntryWithUndo,
  snapshot: InputSnapshot,
  forceCommit = false,
): void {
  const top = entry._undoPast[entry._undoPast.length - 1];

  if (!forceCommit && top && snapshot.timestamp - top.timestamp < COALESCE_MS) {
    // Coalesce: update timestamp but don't push a new entry
    top.timestamp = snapshot.timestamp;
    return;
  }

  entry._undoPast.push(snapshot);
  entry._undoFuture = [];

  if (entry._undoPast.length > UNDO_MAX) {
    entry._undoPast.shift();
  }
}

// =============================================================================
// Slice
// =============================================================================

const instanceUserInputSlice = createSlice({
  name: "instanceUserInput",
  initialState,
  reducers: {
    initInstanceUserInput(
      state,
      action: PayloadAction<{ conversationId: string; text?: string }>,
    ) {
      const { conversationId, text = "" } = action.payload;
      state.byConversationId[conversationId] = {
        conversationId,
        text,
        messageParts: null,
        _undoPast: [],
        _undoFuture: [],
      };
    },

    setUserInputText(
      state,
      action: PayloadAction<{
        conversationId: string;
        text: string;
        /** Current userValues — required so undo snapshots both fields together */
        userValues?: Record<string, unknown>;
      }>,
    ) {
      const { conversationId, text, userValues = {} } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      const snapshot = captureSnapshot(entry, userValues);
      pushSnapshot(entry, snapshot);

      entry.text = text;
    },

    setUserInputMessageParts(
      state,
      action: PayloadAction<{
        conversationId: string;
        parts: MessagePart[];
      }>,
    ) {
      const { conversationId, parts } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (entry) {
        entry.messageParts = parts;
      }
    },

    /**
     * Push an explicit snapshot — call this from the variable value thunk
     * so that variable edits are also undoable alongside text.
     */
    pushInputSnapshot(
      state,
      action: PayloadAction<{
        conversationId: string;
        text: string;
        userValues: Record<string, unknown>;
      }>,
    ) {
      const { conversationId, text, userValues } = action.payload;
      const entry = state.byConversationId[conversationId];
      if (!entry) return;

      const snapshot: InputSnapshot = {
        text,
        userValues: { ...userValues },
        timestamp: Date.now(),
      };
      pushSnapshot(entry, snapshot, true); // always commit variable changes
    },

    undoInputEdit(
      state,
      action: PayloadAction<{
        conversationId: string;
        /** Callback receives the restored values — caller must also update variable slice */
        _apply?: never;
      }>,
    ) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (!entry || entry._undoPast.length === 0) return;

      const current: InputSnapshot = {
        text: entry.text,
        userValues: {}, // variables are applied by the hook via a separate dispatch
        timestamp: Date.now(),
      };
      entry._undoFuture.push(current);

      const prev = entry._undoPast.pop()!;
      entry.text = prev.text;
      // userValues are stored on the snapshot but applied to the variable slice
      // by the hook (see useInstanceInputUndoRedo)
    },

    redoInputEdit(state, action: PayloadAction<{ conversationId: string }>) {
      const entry = state.byConversationId[action.payload.conversationId];
      if (!entry || entry._undoFuture.length === 0) return;

      const current: InputSnapshot = {
        text: entry.text,
        userValues: {},
        timestamp: Date.now(),
      };
      entry._undoPast.push(current);

      const next = entry._undoFuture.pop()!;
      entry.text = next.text;
    },

    clearUserInput(state, action: PayloadAction<string>) {
      const entry = state.byConversationId[action.payload];
      if (entry) {
        entry.text = "";
        entry.messageParts = null;
        // Clear future on send but preserve past so user can undo back
        entry._undoFuture = [];
      }
    },

    removeInstanceUserInput(state, action: PayloadAction<string>) {
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
  initInstanceUserInput,
  setUserInputText,
  setUserInputMessageParts,
  pushInputSnapshot,
  undoInputEdit,
  redoInputEdit,
  clearUserInput,
  removeInstanceUserInput,
} = instanceUserInputSlice.actions;

export default instanceUserInputSlice.reducer;
