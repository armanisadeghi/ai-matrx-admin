// AN UNDO IS NEVER RECORDED AS A NEW FORWARD EDIT (review 3 2026-10-20 R3).
//
// Chart Controls: Pie → Bar → Line, then ⌘Z inside Controls (the editor's own history: Bar), then
// Plain → Write (the editor remounts with an empty history), then toolbar Undo — which falls to the
// note's record history (@ai-matrx/rich-content withHostHistory). Expected Pie; it gave Line: the
// record had logged the editor's ⌘Z as a new edit (…Bar, Line pushed, content Bar), so its Undo
// re-applied the change just undone. The note's history must move WITH the editor's.
// Break it names: drop the previous/next-value match in applyFieldEdit → every case red.
import { configureStore } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import notesReducer, { upsertNoteFromServer, undoNoteEdit, redoNoteEdit, updateNoteContent } from "../redux/slice";
import { NOTE_UNDO_COALESCE_MS } from "../redux/notes.types";
import type { Note } from "../types";

jest.mock("@/utils/supabase/client", () => (require("@/tests/helpers/emptySupabaseClient") as typeof import("@/tests/helpers/emptySupabaseClient")).emptySupabaseClientModule());

enableMapSet();

const ACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "7d2f0c1b-4e5a-4f6b-9c8d-3e2f1a0b9c82";
const chart = (type: string) => `# Visits\n\n\`\`\`chart\n{"type": "${type}", "title": "Visits", "data": [{"name": "Web", "value": 62}]}\n\`\`\`\n`;
const PIE = chart("pie");
const BAR = chart("bar");
const LINE = chart("line");

let now = 1_760_000_000_000;
beforeEach(() => {
  jest.spyOn(Date, "now").mockImplementation(() => now);
});
afterEach(() => jest.restoreAllMocks());
/** A person's pace: each Controls pick lands well after the last (no coalescing). */
const later = () => void (now += NOTE_UNDO_COALESCE_MS * 4);

function makeStore() {
  const store = configureStore({
    reducer: { notes: notesReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(
    upsertNoteFromServer({
      note: {
        id: ID, organization_id: "11111111-1111-4111-8111-111111111111", version: 1, content: PIE, label: "RV3 chart", tags: [], metadata: {},
        published_to_web: false, position: 0, project_id: null, task_id: null, created_at: "2026-10-20T09:00:00.000Z", created_by: ACTOR,
        updated_at: "2026-10-20T09:00:00.000Z", updated_by: ACTOR, deleted_at: null, content_hash: null, file_path: null, last_device_id: null,
        custom_fields: {}, sync_version: 0, search_engine_indexed: null, shown_to: null, test_expires_at: null, test_run_id: null,
      } as Note,
      fetchStatus: "full",
    }),
  );
  const content = () => store.getState().notes.notes[ID]!.content;
  /** The editor (Write, or Controls inside it) reports its value — a pick, an undo, a redo alike. */
  const editorReports = (value: string) => {
    later();
    store.dispatch(updateNoteContent({ id: ID, content: value }));
  };
  return { store, content, editorReports };
}

it("Pie → Bar → Line, ⌘Z in Controls, Plain → Write, toolbar Undo gives Pie", () => {
  const { store, content, editorReports } = makeStore();
  editorReports(BAR); // Controls: Bar
  editorReports(LINE); // Controls: Line
  editorReports(BAR); // ⌘Z inside Controls: the editor's own history undoes Line
  expect(content()).toBe(BAR);
  // Plain → Write: nothing reaches the record; the editor's history is gone. Toolbar Undo → the record.
  store.dispatch(undoNoteEdit({ id: ID }));
  expect(content()).toBe(PIE);
});

it("and Redo walks forward again: Bar, then Line, then nothing", () => {
  const { store, content, editorReports } = makeStore();
  editorReports(BAR);
  editorReports(LINE);
  editorReports(BAR);
  store.dispatch(undoNoteEdit({ id: ID }));
  store.dispatch(redoNoteEdit({ id: ID }));
  expect(content()).toBe(BAR);
  store.dispatch(redoNoteEdit({ id: ID }));
  expect(content()).toBe(LINE);
  store.dispatch(redoNoteEdit({ id: ID }));
  expect(content()).toBe(LINE);
});

it("the editor's own redo (⌘⇧Z in Controls) moves the record forward too, never as a third step", () => {
  const { store, content, editorReports } = makeStore();
  editorReports(BAR);
  editorReports(LINE);
  editorReports(BAR); // ⌘Z
  editorReports(LINE); // ⌘⇧Z
  store.dispatch(undoNoteEdit({ id: ID }));
  expect(content()).toBe(BAR);
  store.dispatch(undoNoteEdit({ id: ID }));
  expect(content()).toBe(PIE);
  expect(store.getState().notes.notes[ID]!._undoPast).toHaveLength(0);
});

it("a new pick after an undo is a forward edit (the redo branch is dropped)", () => {
  const { store, content, editorReports } = makeStore();
  editorReports(BAR);
  editorReports(LINE);
  editorReports(BAR); // ⌘Z
  editorReports(chart("area")); // a new pick
  store.dispatch(undoNoteEdit({ id: ID }));
  expect(content()).toBe(BAR);
  store.dispatch(undoNoteEdit({ id: ID }));
  expect(content()).toBe(PIE);
  expect(store.getState().notes.notes[ID]!._undoFuture.map((e) => e.value)).not.toContain(LINE);
});
