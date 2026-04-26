import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { EditorFile } from "../types";
import type { RootState } from "@/lib/redux/store";

export interface CodeTabsState {
  /** Map of tabId → file. */
  byId: Record<string, EditorFile>;
  /** Ordered list of open tab ids (left-to-right in the strip). */
  order: string[];
  /** Active tab id. */
  activeId: string | null;
}

const initialState: CodeTabsState = {
  byId: {},
  order: [],
  activeId: null,
};

const slice = createSlice({
  name: "codeTabs",
  initialState,
  reducers: {
    openTab(state, action: PayloadAction<EditorFile>) {
      const file = action.payload;
      if (!state.byId[file.id]) {
        state.byId[file.id] = { ...file, dirty: false };
        state.order.push(file.id);
      }
      state.activeId = file.id;
    },
    closeTab(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (!state.byId[id]) return;
      delete state.byId[id];
      const idx = state.order.indexOf(id);
      if (idx !== -1) state.order.splice(idx, 1);
      if (state.activeId === id) {
        const next = state.order[idx] ?? state.order[idx - 1] ?? null;
        state.activeId = next;
      }
    },
    setActiveTab(state, action: PayloadAction<string>) {
      if (state.byId[action.payload]) {
        state.activeId = action.payload;
      }
    },
    updateTabContent(
      state,
      action: PayloadAction<{ id: string; content: string }>,
    ) {
      const tab = state.byId[action.payload.id];
      if (!tab) return;
      tab.content = action.payload.content;
      tab.dirty = tab.content !== tab.pristineContent;
    },
    markTabSaved(state, action: PayloadAction<string>) {
      const tab = state.byId[action.payload];
      if (!tab) return;
      tab.pristineContent = tab.content;
      tab.dirty = false;
      tab.lastSavedAt = new Date().toISOString();
    },
    /** Refresh the `remoteUpdatedAt` stored alongside a tab — used by
     *  the source adapter save path to keep the optimistic guard in
     *  sync with the row after a successful write. */
    setTabRemoteUpdatedAt(
      state,
      action: PayloadAction<{ id: string; remoteUpdatedAt: string }>,
    ) {
      const tab = state.byId[action.payload.id];
      if (!tab) return;
      tab.remoteUpdatedAt = action.payload.remoteUpdatedAt;
    },
    /** Replace a tab's buffer wholesale — used when the user elects to
     *  "Reload from remote" after a conflict, or when an external
     *  source (e.g. the save-and-open helper) wants to refresh a tab
     *  whose row has moved on. */
    replaceTabContent(
      state,
      action: PayloadAction<{
        id: string;
        content: string;
        remoteUpdatedAt?: string;
      }>,
    ) {
      const tab = state.byId[action.payload.id];
      if (!tab) return;
      tab.content = action.payload.content;
      tab.pristineContent = action.payload.content;
      tab.dirty = false;
      if (action.payload.remoteUpdatedAt !== undefined) {
        tab.remoteUpdatedAt = action.payload.remoteUpdatedAt;
      }
    },
    moveTab(state, action: PayloadAction<{ id: string; toIndex: number }>) {
      const { id, toIndex } = action.payload;
      const from = state.order.indexOf(id);
      if (from === -1) return;
      state.order.splice(from, 1);
      state.order.splice(
        Math.max(0, Math.min(toIndex, state.order.length)),
        0,
        id,
      );
    },
    closeAllTabs(state) {
      state.byId = {};
      state.order = [];
      state.activeId = null;
    },
  },
});

export const {
  openTab,
  closeTab,
  setActiveTab,
  updateTabContent,
  markTabSaved,
  setTabRemoteUpdatedAt,
  replaceTabContent,
  moveTab,
  closeAllTabs,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

const emptyOrder: string[] = [];

export const selectCodeTabs = (state: RootState) =>
  state.codeTabs ?? initialState;
export const selectTabOrder = (state: RootState) =>
  selectCodeTabs(state).order ?? emptyOrder;
export const selectTabById = (id: string) => (state: RootState) =>
  selectCodeTabs(state).byId[id];
export const selectActiveTabId = (state: RootState) =>
  selectCodeTabs(state).activeId;
export const selectActiveTab = (state: RootState) => {
  const tabs = selectCodeTabs(state);
  return tabs.activeId ? tabs.byId[tabs.activeId] : null;
};
