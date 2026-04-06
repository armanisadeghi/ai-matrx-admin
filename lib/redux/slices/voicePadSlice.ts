import {
  createSelector,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";

export type VoicePadSize = "collapsed" | "expanded";

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface VoicePadState {
  size: VoicePadSize;
  entries: TranscriptEntry[];
  draftText: string;
}

const initialState: VoicePadState = {
  size: "expanded",
  entries: [],
  draftText: "",
};

const voicePadSlice = createSlice({
  name: "voicePad",
  initialState,
  reducers: {
    setVoicePadSize(state, action: PayloadAction<VoicePadSize>) {
      state.size = action.payload;
    },
    toggleVoicePadSize(state) {
      state.size = state.size === "collapsed" ? "expanded" : "collapsed";
    },
    addTranscriptEntry(state, action: PayloadAction<string>) {
      state.entries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text: action.payload,
        timestamp: Date.now(),
      });
    },
    removeTranscriptEntry(state, action: PayloadAction<string>) {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
    },
    clearAllEntries(state) {
      state.entries = [];
      state.draftText = "";
    },
    startNewSession(state) {
      state.entries = [];
      state.draftText = "";
    },
    setDraftText(state, action: PayloadAction<string>) {
      state.draftText = action.payload;
    },
  },
});

export const {
  setVoicePadSize,
  toggleVoicePadSize,
  addTranscriptEntry,
  removeTranscriptEntry,
  clearAllEntries,
  startNewSession,
  setDraftText,
} = voicePadSlice.actions;

type StateWithVoicePad = { voicePad: VoicePadState };

export const selectVoicePadSize = (state: StateWithVoicePad) =>
  state.voicePad.size;
export const selectVoicePadEntries = (state: StateWithVoicePad) =>
  state.voicePad.entries;
export const selectVoicePadDraftText = (state: StateWithVoicePad) =>
  state.voicePad.draftText;

/** Memoized — recalculates only when entries or draftText actually change. */
export const selectVoicePadAllText = createSelector(
  [
    (state: StateWithVoicePad) => state.voicePad.entries,
    (state: StateWithVoicePad) => state.voicePad.draftText,
  ],
  (entries, draft): string => {
    const entryText = entries.map((e) => e.text).join("\n\n");
    return draft || entryText;
  },
);

export default voicePadSlice.reducer;
