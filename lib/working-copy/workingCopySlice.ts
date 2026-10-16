/**
 * lib/working-copy/workingCopySlice.ts — THE working copy of every record being
 * edited, in Redux, keyed by `${entity}:${id}` (`workingCopyKey`).
 *
 * THE LAW (owner, 2026-10-02): every screen survives hide/show/remount with no
 * lost work and no repeated side effects. A record's working state lives here;
 * every editor that shows it is a VIEW of this entry. One entry per record per
 * tab, whatever number of views (a board tile, the record's page, a side
 * panel, a canvas tab) show it.
 *
 * What lives here is the state of record — the text (`value`, for text
 * records: a note's body, a file's text), what it was loaded / saved as
 * (`base`, `baseVersion`), dirty, save status, the number of views. A record
 * whose body is held by a non-serializable editor engine (a Univer document)
 * keeps `value` undefined: the engine lives in the module registry keyed the
 * same way (`@ai-matrx/kit/working-copy`), and this entry carries its status.
 *
 * Writes go through `defineWorkingCopyKind` (one coalesced save path per
 * record, ref-counted views) — never dispatch `workingCopyApplied` by hand.
 *
 * THE HOST ADAPTER: the primitive lives in `@ai-matrx/kit/working-copy` and
 * holds no store. This slice is the app's side of its `WorkingCopyStorePort`
 * (see `./reduxPort.ts`): ONE reducer that runs the kit's state machine
 * (`applyWorkingCopyAction`) on `workingCopies`.
 */

import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  applyWorkingCopyAction,
  initialWorkingCopiesState,
  type KeptRichCaret,
  type KeptTextSelection,
  type WorkingCopiesState,
  type WorkingCopyAction,
  type WorkingCopyConflict,
  type WorkingCopyEntry,
  type WorkingCopyStatus,
} from "@ai-matrx/kit/working-copy";

export { workingCopyKey } from "@ai-matrx/kit/working-copy";
export type {
  KeptRichCaret,
  KeptTextSelection,
  WorkingCopiesState,
  WorkingCopyConflict,
  WorkingCopyEntry,
  WorkingCopySaveFailure,
  WorkingCopyStatus,
} from "@ai-matrx/kit/working-copy";

const workingCopySlice = createSlice({
  name: "workingCopies",
  initialState: initialWorkingCopiesState(),
  reducers: {
    /** Every change to a working copy, as the kit's action data (see `applyWorkingCopyAction`). */
    workingCopyApplied(state, action: PayloadAction<WorkingCopyAction>) {
      applyWorkingCopyAction(state, action.payload);
    },
  },
});

export const { workingCopyApplied } = workingCopySlice.actions;

/** A view of the record's text is going away: keep where its caret / selection was. */
export const workingCopySelectionKept = (payload: { key: string } & KeptTextSelection) =>
  workingCopyApplied({ type: "selectionKept", ...payload });

/** A rich editor of the record is going away: keep its caret / selection. */
export const workingCopyRichCaretKept = (payload: { key: string; caret: KeptRichCaret }) =>
  workingCopyApplied({ type: "richCaretKept", ...payload });

export default workingCopySlice.reducer;

export type WithWorkingCopies = { workingCopies?: WorkingCopiesState };

const selectByKey = (state: WithWorkingCopies) => state.workingCopies?.byKey;

/** Non-React read (thunks, middleware, draft rescue). */
export function getWorkingCopy(state: WithWorkingCopies, key: string): WorkingCopyEntry | undefined {
  return state.workingCopies?.byKey[key];
}

/** One record's entry (memoized per key). */
export const selectWorkingCopy = createSelector(
  [selectByKey, (_state: WithWorkingCopies, key: string) => key],
  (byKey, key): WorkingCopyEntry | undefined => byKey?.[key],
);

/** One record's working text, or undefined when no view holds newer text than the record. */
export const selectWorkingCopyValue = createSelector(
  [selectWorkingCopy],
  (entry): string | undefined => entry?.value,
);

/** The record's metadata as last read (see `WorkingCopyEntry.record`). */
export const selectWorkingCopyRecord = createSelector(
  [selectWorkingCopy],
  (entry): unknown => entry?.record,
);

/** The record's open conflict, or null. */
export const selectWorkingCopyConflict = createSelector(
  [selectWorkingCopy],
  (entry): WorkingCopyConflict | null => entry?.conflict ?? null,
);

export const selectWorkingCopyStatus = createSelector(
  [selectWorkingCopy],
  (entry): WorkingCopyStatus | undefined => entry?.status,
);

/** Where the caret / selection was in the record's text when a view of it last went away. */
export function getKeptTextSelection(state: WithWorkingCopies, key: string): KeptTextSelection | undefined {
  return state.workingCopies?.selections?.[key];
}

/** The rich editor's caret / selection when a view of the record last went away. */
export function getKeptRichCaret(state: WithWorkingCopies, key: string): KeptRichCaret | undefined {
  return state.workingCopies?.richCarets?.[key];
}
