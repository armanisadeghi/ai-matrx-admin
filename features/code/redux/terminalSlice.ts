import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { BottomTabId } from "../types";
import type { RootState } from "@/lib/redux/store";

export interface TerminalLine {
  id: string;
  type: "command" | "stdout" | "stderr" | "info";
  text: string;
  exitCode?: number;
  cwd?: string;
  tab: BottomTabId;
}

export interface CodeTerminalState {
  open: boolean;
  activeTab: BottomTabId;
  /** Shared append-only log for all bottom-panel tabs. */
  lines: TerminalLine[];
  /** Recent commands for ArrowUp / ArrowDown recall, newest last. */
  history: string[];
  executing: boolean;
}

const initialState: CodeTerminalState = {
  open: false,
  activeTab: "terminal",
  lines: [],
  history: [],
  executing: false,
};

let lineIdCounter = 0;
const nextLineId = () => `line-${++lineIdCounter}`;

const slice = createSlice({
  name: "codeTerminal",
  initialState,
  reducers: {
    setOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload;
    },
    toggleOpen(state) {
      state.open = !state.open;
    },
    setActiveTab(state, action: PayloadAction<BottomTabId>) {
      state.activeTab = action.payload;
      state.open = true;
    },
    appendLine(state, action: PayloadAction<Omit<TerminalLine, "id">>) {
      state.lines.push({ id: nextLineId(), ...action.payload });
    },
    appendLines(state, action: PayloadAction<Omit<TerminalLine, "id">[]>) {
      for (const l of action.payload)
        state.lines.push({ id: nextLineId(), ...l });
    },
    clearLines(state, action: PayloadAction<BottomTabId | undefined>) {
      const tab = action.payload;
      state.lines = tab ? state.lines.filter((l) => l.tab !== tab) : [];
    },
    pushHistory(state, action: PayloadAction<string>) {
      if (!action.payload.trim()) return;
      if (state.history[state.history.length - 1] === action.payload) return;
      state.history.push(action.payload);
      if (state.history.length > 200) state.history.shift();
    },
    setExecuting(state, action: PayloadAction<boolean>) {
      state.executing = action.payload;
    },
  },
});

export const {
  setOpen,
  toggleOpen,
  setActiveTab,
  appendLine,
  appendLines,
  clearLines,
  pushHistory,
  setExecuting,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

const emptyLines: TerminalLine[] = [];
const emptyHistory: string[] = [];

export const selectCodeTerminal = (state: RootState) =>
  state.codeTerminal ?? initialState;
export const selectTerminalOpen = (state: RootState) =>
  selectCodeTerminal(state).open;
export const selectTerminalActiveTab = (state: RootState) =>
  selectCodeTerminal(state).activeTab;
export const selectTerminalLines = (state: RootState) =>
  selectCodeTerminal(state).lines ?? emptyLines;
export const selectTerminalHistory = (state: RootState) =>
  selectCodeTerminal(state).history ?? emptyHistory;
export const selectTerminalExecuting = (state: RootState) =>
  selectCodeTerminal(state).executing;
