// A SAVE OF A TAG SETTLES, AND WRITES ONCE (2026-10-14 live: the notes
// sidebar's bulk "Add tag" saved the tag, yet its spinner never stopped and
// every bar button stayed disabled until a reload).
//
// Root cause: `markSavedSnapshotClean` (redux/slice.ts) cleared a saved field
// only when `record[field] === savedSnapshot[field]`. Inside a reducer an
// array field (`tags`, `shown_to`) reads as an immer draft proxy, never `===`
// the snapshot — so the written tags stayed dirty, the note's write queue
// (`beginSaveQueue`, redux/noteRecordWrite.ts) looped "while dirty" writing
// them again and again, and `saveNote` never settled.
//
// The write stand-in refuses after a few calls so the old loop ends red here
// instead of exhausting memory.
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
import notesReducer, { upsertNoteFromServer } from "../redux/slice";
import { saveNoteField } from "../redux/thunks";
import { noteSaveRequestMiddleware } from "../redux/noteSaveRequests";
import workingCopiesReducer from "@/lib/working-copy/workingCopySlice";
import { noteWorkingCopy } from "../utils/noteLiveContent";
import type { NoteSaveReceipt } from "../service/noteSaveErrors";
import type { Note } from "../types";

enableMapSet();

const NOTE_ID = "6c1e9b2a-3f4d-4e5a-8b7c-2d1e0f9a8b71";
const ORG = "11111111-1111-4111-8111-111111111111";
const ACTOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORED = "Harbor Dental intake\n- confirm insurance\n- x-rays\n- consent form";

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

const WRITE_CAP = 4;
beforeEach(() => {
  jest.useFakeTimers();
  let writes = 0;
  let stored = row();
  persistNoteUpdate.mockReset();
  persistNoteUpdate.mockImplementation(async (_id: string, updates: Partial<Note>) => {
    writes += 1;
    if (writes > WRITE_CAP) throw new Error(`write #${writes}: the same save is being repeated`);
    const receipt = storedReceipt(updates, stored);
    stored = receipt.note;
    return receipt;
  });
});

afterEach(async () => {
  await jest.runOnlyPendingTimersAsync();
  jest.useRealTimers();
});

/** "fulfilled" | "rejected" | "pending" after `ms` of (fake) time. */
async function settledWithin(promise: Promise<unknown>, ms: number): Promise<string> {
  let state = "pending";
  promise.then(() => { state = "fulfilled"; }, () => { state = "rejected"; });
  await jest.advanceTimersByTimeAsync(ms);
  return state;
}

it.each([
  ["no editor open", false],
  ["the note open in an editor", true],
])("adding a tag (%s) settles with one write and leaves the note saved", async (_label, withEditor) => {
  const { store } = makeStore();
  const release = withEditor ? noteWorkingCopy.attach(NOTE_ID, store) : () => {};
  if (withEditor) noteWorkingCopy.load(NOTE_ID, STORED);

  const saved = store.dispatch(saveNoteField({ noteId: NOTE_ID, field: "tags", value: ["harbor"] })).unwrap();

  expect(await settledWithin(saved, 2_000)).toBe("fulfilled");
  expect(persistNoteUpdate).toHaveBeenCalledTimes(1);
  expect(persistNoteUpdate.mock.calls[0][1]).toMatchObject({ tags: ["harbor"] });
  expect(record(store).tags).toEqual(["harbor"]);
  expect(record(store)._dirty).toBe(false);
  release();
});

it("a second tag added after the first saves once more and settles", async () => {
  const { store } = makeStore();
  const first = store.dispatch(saveNoteField({ noteId: NOTE_ID, field: "tags", value: ["harbor"] })).unwrap();
  expect(await settledWithin(first, 2_000)).toBe("fulfilled");
  const second = store.dispatch(saveNoteField({ noteId: NOTE_ID, field: "tags", value: ["harbor", "x-rays"] })).unwrap();
  expect(await settledWithin(second, 2_000)).toBe("fulfilled");
  expect(persistNoteUpdate).toHaveBeenCalledTimes(2);
  expect(record(store)._dirty).toBe(false);
});
