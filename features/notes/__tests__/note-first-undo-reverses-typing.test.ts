// THE FIRST UNDO IN A NEW NOTE REVERSES WHAT WAS TYPED (live defect, 2026-10-17).
//
// The first words of a new note commit two record steps: the content, then the
// title the app derives from it. One Undo used to pop only the title ("New
// Note" came back) and the editor kept the text; only a second Undo cleared
// it. The generated title is now linked to the content step: one Undo / Redo
// carries both, and a title the person typed is still its own step.
jest.mock("@/lib/toast", () => {
  const fn = () => jest.fn();
  const toast = { warning: jest.fn(), error: jest.fn(), success: jest.fn(), info: jest.fn(), dismiss: jest.fn(), message: jest.fn() };
  return { toast: new Proxy(toast, { get: (target, key: string) => (target as Record<string, unknown>)[key] ?? fn() }) };
});
jest.mock("@/utils/supabase/client", () => (require("@/tests/helpers/emptySupabaseClient") as typeof import("@/tests/helpers/emptySupabaseClient")).emptySupabaseClientModule());
jest.mock("@ai-matrx/auth", () => ({ ...jest.requireActual("@ai-matrx/auth"), ...(() => ({
  getClaimsUser: async () => ({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } }, error: null }),
}))() }));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: jest.fn() }));
const persistNoteUpdate = jest.fn();
jest.mock("../service/notesService", () => ({
  ...jest.requireActual("../service/notesService"),
  persistNoteUpdate: (...args: unknown[]) => persistNoteUpdate(...args),
}));

import { configureStore, type Middleware, type UnknownAction } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import { toast } from "@/lib/toast";
import notesReducer, { upsertNoteFromServer, undoNoteEdit, redoNoteEdit, updateNoteLabel } from "../redux/slice";
import { saveNote } from "../redux/thunks";
import { noteSaveRequestMiddleware } from "../redux/noteSaveRequests";
import workingCopiesReducer, { getWorkingCopy } from "@/lib/working-copy/workingCopySlice";
import { mergedConflictText } from "@ai-matrx/kit/working-copy";
import { noteWorkingCopy } from "../utils/noteLiveContent";
import { NoteUpdateConflictError, type NoteSaveReceipt } from "../service/noteSaveErrors";
import type { Note } from "../types";

enableMapSet();

const NOTE_ID = "6c1e9b2a-3f4d-4e5a-8b7c-2d1e0f9a8b71";
const ORG = "11111111-1111-4111-8111-111111111111";
const ACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORED = "";
const TYPED = "Q5 phone undo test";

const row = (overrides: Partial<Note> = {}): Note => ({
  id: NOTE_ID, organization_id: ORG, version: 3, content: STORED, label: "Intake checklist",tags: [], metadata: {}, published_to_web: false, position: 0,
  project_id: null, task_id: null, created_at: "2026-10-01T09:00:00.000Z", created_by: ACTOR,
  updated_at: "2026-10-01T09:00:00.000Z", updated_by: ACTOR,
  deleted_at: null, content_hash: null, file_path: null, last_device_id: null, custom_fields: {},
  sync_version: 0, search_engine_indexed: null, shown_to: null,
  ...overrides,
});

/** The server stores what was sent, one version up. */
function storedReceipt(sent: Partial<Note>, from: Note): NoteSaveReceipt {
  return {
    note: { ...from, ...sent, version: from.version + 1, updated_at: new Date(Date.parse(from.updated_at ?? "") + 60_000).toISOString() },
    databaseWrite: "saved",
    succeededFields: [],
    failedFields: [],
    safeCauses: {},
  };
}

function makeStore(initial: Note = row()) {
  const seen: UnknownAction[] = [];
  const recorder: Middleware = () => (next) => (action) => {
    seen.push(action as UnknownAction);
    return next(action);
  };
  const store = configureStore({
    reducer: {
      notes: notesReducer,
      workingCopies: workingCopiesReducer,
      userAuth: (state = { id: ACTOR, authReady: true }) => state,
    },
    middleware: (gdm) =>
      gdm({ serializableCheck: false, immutableCheck: false }).concat(recorder, noteSaveRequestMiddleware),
  });
  store.dispatch(upsertNoteFromServer({ note: initial, fetchStatus: "full" }));
  return { store, seen };
}

const record = (store: ReturnType<typeof makeStore>["store"]) => store.getState().notes.notes[NOTE_ID];

beforeEach(() => {
  jest.useFakeTimers();
  persistNoteUpdate.mockReset();
});

afterEach(async () => {
  await jest.advanceTimersByTimeAsync(60_000);
  jest.useRealTimers();
});

async function typeFirstWords() {
  const { store } = makeStore(row({ label: "New Note", content: STORED }));
  persistNoteUpdate.mockImplementation(async (_id: string, updates: Partial<Note>) => storedReceipt(updates, { ...row({ label: "New Note", content: STORED }), ...record(store), version: record(store).version }));
  const release = noteWorkingCopy.attach(NOTE_ID, store);
  noteWorkingCopy.load(NOTE_ID, STORED);
  noteWorkingCopy.edit(NOTE_ID, TYPED);
  await jest.advanceTimersByTimeAsync(10_000);
  return { store, release };
}

it("one Undo after the first words empties the note AND takes the generated title back", async () => {
  const { store, release } = await typeFirstWords();
  expect(record(store)).toMatchObject({ content: TYPED, label: "Q5 phone undo test" });

  store.dispatch(undoNoteEdit({ id: NOTE_ID }));
  expect(record(store)).toMatchObject({ content: "", label: "New Note" });
  await jest.advanceTimersByTimeAsync(10_000);
  // The note's working copy follows the record: every editor shows an empty body.
  expect(noteWorkingCopy.entry(NOTE_ID)?.value).toBe("");

  store.dispatch(redoNoteEdit({ id: NOTE_ID }));
  expect(record(store)).toMatchObject({ content: TYPED, label: "Q5 phone undo test" });
  expect(record(store)._undoFuture).toHaveLength(0);
  release();
});

it("a title the person typed is its own step", async () => {
  const { store, release } = await typeFirstWords();
  store.dispatch(updateNoteLabel({ id: NOTE_ID, label: "My own name" }));
  store.dispatch(undoNoteEdit({ id: NOTE_ID }));
  expect(record(store)).toMatchObject({ content: TYPED, label: "Q5 phone undo test" });
  release();
});
