/**
 * Terminal Sessions — VSCode-style multi-terminal model.
 *
 * Sits ALONGSIDE the existing `terminalSlice`. The old slice still owns the
 * bottom-panel's `open` flag, the active *tab* (terminal / problems / ports
 * / …), the shared agent-driven `lines` log, and command history. This slice
 * owns the *list of terminal sessions* rendered inside the "terminal" tab —
 * each one is a separately-rooted xterm or logs viewer with its own
 * scrollback.
 *
 * State model:
 *   - `sessions[id]` — one entry per session
 *   - `order[]`      — left-to-right order in the right-side session list
 *   - `activeId`     — the currently-visible session in the host
 *   - `lastAutoSpawnedSandboxId` — bookkeeping for the "auto-spawn shell +
 *     logs on sandbox connect" hook so we don't re-spawn on every render
 *
 * Sessions are scoped by `sandboxId`. When the active sandbox changes, the
 * old set is cleared (we can't talk to the previous container anymore) and
 * a fresh shell + logs viewer are spawned for the new one. Mock-mode
 * (sandboxId === null) gets a single fallback shell tied to the in-memory
 * MockProcessAdapter.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type TerminalSessionKind = "shell" | "logs";

export interface TerminalSession {
  id: string;
  kind: TerminalSessionKind;
  label: string;
  /** Sandbox the session is bound to. `null` means mock / local. */
  sandboxId: string | null;
  /** ISO timestamp at which the session was created. Used for sort tiebreaks. */
  createdAt: string;
}

export interface TerminalSessionsState {
  byId: Record<string, TerminalSession>;
  order: string[];
  activeId: string | null;
  /**
   * The sandboxId we last auto-spawned default sessions for. Lets the
   * auto-spawn hook fire exactly once per connect, not on every re-render.
   * `"__init__"` is a sentinel for "haven't seen any sandbox yet"; we use
   * a distinct sentinel from `null` so we can distinguish "never spawned"
   * from "currently in mock-mode (already spawned)".
   */
  lastAutoSpawnedSandboxId: string | null | "__init__";
}

const initialState: TerminalSessionsState = {
  byId: {},
  order: [],
  activeId: null,
  lastAutoSpawnedSandboxId: "__init__",
};

let sessionIdCounter = 0;
const generateSessionId = () =>
  `sess-${++sessionIdCounter}-${Math.random().toString(36).slice(2, 6)}`;

const slice = createSlice({
  name: "terminalSessions",
  initialState,
  reducers: {
    /**
     * Add a session to the list and make it active. The caller may supply
     * an `id`; otherwise we generate one. Returns nothing — read the active
     * id back from `selectActiveSessionId` if you need the new id.
     */
    addSession: {
      reducer(
        state,
        action: PayloadAction<{
          id: string;
          kind: TerminalSessionKind;
          label: string;
          sandboxId: string | null;
          createdAt: string;
          activate: boolean;
        }>,
      ) {
        const { id, kind, label, sandboxId, createdAt, activate } =
          action.payload;
        if (state.byId[id]) return; // idempotent
        state.byId[id] = { id, kind, label, sandboxId, createdAt };
        state.order.push(id);
        if (activate) state.activeId = id;
      },
      prepare(payload: {
        id?: string;
        kind: TerminalSessionKind;
        label: string;
        sandboxId: string | null;
        activate?: boolean;
      }) {
        return {
          payload: {
            id: payload.id ?? generateSessionId(),
            kind: payload.kind,
            label: payload.label,
            sandboxId: payload.sandboxId,
            createdAt: new Date().toISOString(),
            activate: payload.activate ?? true,
          },
        };
      },
    },

    removeSession(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (!state.byId[id]) return;
      delete state.byId[id];
      state.order = state.order.filter((x) => x !== id);
      if (state.activeId === id) {
        state.activeId = state.order[state.order.length - 1] ?? null;
      }
    },

    renameSession(
      state,
      action: PayloadAction<{ id: string; label: string }>,
    ) {
      const { id, label } = action.payload;
      const s = state.byId[id];
      if (s) s.label = label;
    },

    setActiveSession(state, action: PayloadAction<string | null>) {
      const id = action.payload;
      if (id === null || state.byId[id]) {
        state.activeId = id;
      }
    },

    /**
     * Drop every session bound to the given sandbox. Pass `null` to clear
     * mock-mode sessions; pass a sandbox id to clear that sandbox's
     * sessions. Pass `"*"` to clear ALL sessions (used at workspace
     * teardown).
     */
    clearSessionsForSandbox(
      state,
      action: PayloadAction<{ sandboxId: string | null | "*" }>,
    ) {
      const target = action.payload.sandboxId;
      const survivors: string[] = [];
      for (const id of state.order) {
        const sess = state.byId[id];
        if (!sess) continue;
        const shouldKeep = target === "*" ? false : sess.sandboxId !== target;
        if (shouldKeep) {
          survivors.push(id);
        } else {
          delete state.byId[id];
        }
      }
      state.order = survivors;
      if (state.activeId && !state.byId[state.activeId]) {
        state.activeId = survivors[survivors.length - 1] ?? null;
      }
    },

    setLastAutoSpawnedSandboxId(
      state,
      action: PayloadAction<string | null>,
    ) {
      state.lastAutoSpawnedSandboxId = action.payload;
    },
  },
});

export const {
  addSession,
  removeSession,
  renameSession,
  setActiveSession,
  clearSessionsForSandbox,
  setLastAutoSpawnedSandboxId,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

const EMPTY_SESSIONS: TerminalSession[] = [];

type WithTerminalSessions = { terminalSessions: TerminalSessionsState };

export const selectAllSessions = (
  state: WithTerminalSessions,
): TerminalSession[] => {
  const s = state.terminalSessions;
  if (!s || s.order.length === 0) return EMPTY_SESSIONS;
  const arr: TerminalSession[] = [];
  for (const id of s.order) {
    const sess = s.byId[id];
    if (sess) arr.push(sess);
  }
  return arr.length === 0 ? EMPTY_SESSIONS : arr;
};

export const selectSessionsForSandbox =
  (sandboxId: string | null) =>
  (state: WithTerminalSessions): TerminalSession[] => {
    const s = state.terminalSessions;
    if (!s || s.order.length === 0) return EMPTY_SESSIONS;
    const arr = s.order
      .map((id) => s.byId[id])
      .filter((sess): sess is TerminalSession => !!sess && sess.sandboxId === sandboxId);
    return arr.length === 0 ? EMPTY_SESSIONS : arr;
  };

export const selectActiveSessionId = (
  state: WithTerminalSessions,
): string | null => state.terminalSessions?.activeId ?? null;

export const selectActiveSession = (
  state: WithTerminalSessions,
): TerminalSession | null => {
  const id = state.terminalSessions?.activeId;
  return id ? state.terminalSessions.byId[id] ?? null : null;
};

export const selectLastAutoSpawnedSandboxId = (
  state: WithTerminalSessions,
): string | null | "__init__" =>
  state.terminalSessions?.lastAutoSpawnedSandboxId ?? "__init__";
