/**
 * features/notes/redux/noteLifecycleThunks.test.ts
 *
 * The seven thunks the 2026-09-14 audit found with NO coverage at all, tested
 * where they actually live: through the REAL thunk, the REAL notes reducer and
 * a mocked Supabase client — so each test asserts both the resulting store
 * state and the exact query the thunk emitted.
 *
 * What is mocked and why: the Supabase client (network), and the two
 * notesService functions the trash thunks delegate to (their own transport is
 * a different SUT with its own boundary). Nothing the thunks own — folder
 * admission, the optimistic field writes, the stale-result guard, the trash
 * sweep, which rows leave the store — is stubbed.
 *
 * Named breaks this suite catches:
 *  - (moves: covered by homes/__tests__ — moveNoteToHome)
 *  - `restoreNote` clearing the wrong column, or not putting the restored row
 *    back in the store.
 *  - `restoreNote` leaving a note that went to Trash with its folder
 *    outside any live folder (the folder must come back with it).
 *  - a hard-delete door (`permanentlyDeleteNoteThunk` / `emptyTrashThunk`)
 *    coming back: delete means archive (Arman, 2026-09-27).
 *  - `fetchSharedNotesList` letting a SLOW earlier fetch overwrite a newer
 *    one, or dropping a sharee's dirty buffer when a share is revoked.
 *  - `saveNoteField` writing the field without persisting it.
 */

import { withClaims } from "@/test-utils/supabase-auth";

const schema = jest.fn();
const rpc = jest.fn();
const getSession = jest.fn();
const persistNoteUpdate = jest.fn();
const createFolder = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  // The thunks verify the actor with `getClaimsUser(supabase)` →
  // `auth.getClaims()`; `withClaims` derives it from this same `getSession`.
  supabase: { schema, rpc, auth: withClaims({ getSession }) },
}));
jest.mock("@/utils/auth/getUserId", () => ({
  requireUserId: () => "user-1",
  getUserId: () => "user-1",
}));
jest.mock("../service/notesService", () => {
  const actual =
    jest.requireActual<typeof import("../service/notesService")>(
      "../service/notesService",
    );
  return {
    ...actual,
    persistNoteUpdate: (...args: unknown[]) => persistNoteUpdate(...args),
    createFolder: (...args: unknown[]) => createFolder(...args),
  };
});
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: {
    listForSources: jest.fn(async () => ({ ok: true, data: { edges: [] } })),
    setTargets: jest.fn(async () => ({ ok: true, data: null })),
  },
}));

import { configureStore, type UnknownAction } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import { createSlimRootReducer, type RootState } from "@/lib/redux/rootReducer";
import type { Note } from "../types";
import { upsertNoteFromServer } from "./slice";
import {
  fetchSharedNotesList,
  restoreNote,
  saveNoteField,
} from "./thunks";
import * as thunks from "./thunks";
import * as notesService from "../service/notesService";

enableMapSet();

const ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "99999999-9999-4999-8999-999999999999";
const NOTE_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_NOTE_ID = "77777777-7777-4777-8777-777777777777";
const FOLDER_ID = "33333333-3333-4333-8333-333333333333";

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: NOTE_ID,
    content: "before",
    content_hash: null,
    created_at: "2026-09-12T00:00:00.000Z",
    created_by: "user-1",
    custom_fields: {},
    deleted_at: null,
    file_path: null,
    folder_id: null,
    folder_name: "Draft",
    label: "Original",
    last_device_id: null,
    metadata: {},
    organization_id: ORG,
    position: 0,
    project_id: null,
    sync_version: 0, search_engine_indexed: null, shown_to: null,
    tags: [],
    task_id: null,
    updated_at: "2026-09-12T00:00:00.000Z",
    updated_by: null,
    version: 7,
    published_to_web: false,
    ...overrides,
  };
}

/** A write chain awaited as a whole (`writeOneRow`) resolves to the rows it wrote. */
function writtenRows<C extends object>(chain: C, rows: unknown[]): C {
  return Object.assign(chain, {
    then: (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null }),
  });
}

/** A PostgREST chain that records every call, so a test can assert the query. */
function query(result: unknown) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    not: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
    order: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
  };
  for (const key of [
    "select",
    "eq",
    "is",
    "not",
    "update",
    "delete",
    "insert",
    "order",
  ] as const) {
    chain[key].mockReturnValue(chain);
  }
  chain.single.mockResolvedValue(result);
  chain.maybeSingle.mockResolvedValue(result);
  return chain;
}

/** The real slim root reducer, plus the one seam a suite needs: a signed-in
 *  identity. `getUserId` reads `state.userAuth.id` and a save refuses without
 *  it, so an unseeded store would prove nothing but the session guard. */
function testRootReducer() {
  const slim = createSlimRootReducer();
  return (state: RootState | undefined, action: UnknownAction): RootState => {
    const next = slim(state, action);
    if (action.type === "test/seed-user") {
      return { ...next, userAuth: { ...next.userAuth, id: "user-1" } };
    }
    return next;
  };
}

function store(seed: Note[] = [note()]) {
  const configured = configureStore({
    reducer: testRootReducer(),
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });
  configured.dispatch({ type: "test/seed-user" });
  for (const row of seed) {
    configured.dispatch(upsertNoteFromServer({ note: row, fetchStatus: "full" }));
  }
  return configured;
}

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
    error: null,
  });
  // A faithful stand-in for the write: the row that comes back is the row
  // that was sent, with the version bumped — exactly what the CAS does. A
  // receipt that echoed the OLD row would make the reducer settle the note
  // back to its pre-move values, which is a different (real) behaviour and
  // not the one these tests are about.
  persistNoteUpdate.mockImplementation(
    async (id: string, updates: Record<string, unknown>) => ({
      note: note({
        id,
        ...updates,
        version: 8,
        updated_at: "2026-09-12T00:05:00.000Z",
      }),
      databaseWrite: "saved" as const,
      succeededFields: [],
      failedFields: [],
      safeCauses: {},
    }),
  );
});

describe("saveNoteField", () => {
  it("writes the field into the store and persists that same value", async () => {
    const configured = store();

    const result = await configured.dispatch(
      saveNoteField({ noteId: NOTE_ID, field: "label", value: "Renamed" }),
    );

    expect(saveNoteField.fulfilled.match(result)).toBe(true);
    expect(configured.getState().notes.notes[NOTE_ID].label).toBe("Renamed");
    expect(persistNoteUpdate).toHaveBeenCalledWith(
      NOTE_ID,
      { label: "Renamed" },
      expect.objectContaining({ expectedVersion: 7 }),
    );
    // Persisted means no longer dirty — a rename that stayed dirty would be
    // re-sent forever by the autosave middleware.
    expect(configured.getState().notes.notes[NOTE_ID]._dirty).toBe(false);
  });
});

describe("restoreNote", () => {
  it("clears deleted_at on that row and puts the restored note back in the store", async () => {
    const configured = store([]);
    const restored = note({ deleted_at: null, label: "Back" });
    // The restore is a single-row write (`writeOneRow`): it awaits the
    // builder itself and reads the returned rows, never `.single()`.
    const chain = writtenRows(query({ data: restored, error: null }), [restored]);
    const from = jest.fn().mockReturnValue(chain);
    schema.mockReturnValue({ from });

    const result = await configured.dispatch(restoreNote(NOTE_ID));

    expect(restoreNote.fulfilled.match(result)).toBe(true);
    expect(schema).toHaveBeenCalledWith("workbench");
    expect(from).toHaveBeenCalledWith("notes");
    expect(chain.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(chain.eq).toHaveBeenCalledWith("id", NOTE_ID);
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(configured.getState().notes.notes[NOTE_ID]).toMatchObject({
      id: NOTE_ID,
      label: "Back",
      deleted_at: null,
    });
  });

  it("rejects and stores nothing when the restore is refused", async () => {
    const configured = store([]);
    const chain = query({ data: null, error: { message: "row level security" } });
    schema.mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

    const result = await configured.dispatch(restoreNote(NOTE_ID));

    expect(restoreNote.rejected.match(result)).toBe(true);
    expect(configured.getState().notes.notes[NOTE_ID]).toBeUndefined();
  });
});

describe("restoreNote with its folder", () => {
  it("revives the folder that went to Trash with the note", async () => {
    const configured = store([]);
    const restored = note({ deleted_at: null, folder_id: FOLDER_ID });
    const noteChain = writtenRows(query({ data: restored, error: null }), [restored]);
    const folderRead = query({
      data: {
        id: FOLDER_ID,
        name: "Draft",
        organization_id: ORG,
        created_by: "user-1",
        deleted_at: "2026-09-27T00:00:00.000Z",
      },
      error: null,
    });
    // The revive reports the folder row it brought back; zero rows means the
    // folder stayed in Trash and the restore says so.
    const revive = writtenRows(query({ error: null }), [{ id: FOLDER_ID }]);
    const from = jest
      .fn()
      .mockReturnValueOnce(noteChain)
      .mockReturnValueOnce(folderRead)
      .mockReturnValueOnce(revive);
    schema.mockReturnValue({ from });

    const result = await configured.dispatch(restoreNote(NOTE_ID));

    expect(restoreNote.fulfilled.match(result)).toBe(true);
    expect(from).toHaveBeenNthCalledWith(2, "note_folders");
    expect(from).toHaveBeenNthCalledWith(3, "note_folders");
    expect(revive.update).toHaveBeenCalledWith({ deleted_at: null });
    expect(revive.eq).toHaveBeenCalledWith("id", FOLDER_ID);
    expect(configured.getState().notes.notes[NOTE_ID]).toMatchObject({
      folder_id: FOLDER_ID,
      deleted_at: null,
    });
  });
});

describe("no hard-delete door", () => {
  it("offers no permanent delete or empty-trash path for notes", () => {
    const exported = [...Object.keys(thunks), ...Object.keys(notesService)];
    expect(exported.filter((name) => /permanent|emptyTrash|purge/i.test(name))).toEqual([]);
  });
});

describe("fetchSharedNotesList", () => {
  const sharedRow = (overrides: Record<string, unknown> = {}) => ({
    id: OTHER_NOTE_ID,
    label: "Shared plan",
    folder_name: "Shared",
    tags: [],
    created_at: "2026-09-12T00:00:00.000Z",
    updated_at: "2026-09-12T00:00:00.000Z",
    organization_id: ORG,
    project_id: null,
    task_id: null,
    published_to_web: false,
    version: 3,
    created_by: "user-2",
    permission_level: "editor",
    owner_email: "owner@example.com",
    ...overrides,
  });

  it("lands each shared row with the owner and permission the RPC reported", async () => {
    const configured = store([]);
    rpc.mockResolvedValue({ data: [sharedRow()], error: null });

    const result = await configured.dispatch(fetchSharedNotesList());

    expect(fetchSharedNotesList.fulfilled.match(result)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("get_notes_shared_with_me");
    expect(configured.getState().notes.notes[OTHER_NOTE_ID]).toMatchObject({
      _sharedWithMe: true,
      _sharedMeta: {
        permissionLevel: "editor",
        ownerEmail: "owner@example.com",
      },
    });
  });

  it("drops a slow earlier result so it cannot overwrite a newer fetch", async () => {
    const configured = store([]);
    let releaseFirst: ((value: unknown) => void) | undefined;
    rpc.mockImplementationOnce(
      () => new Promise((resolve) => { releaseFirst = resolve; }),
    );
    rpc.mockImplementationOnce(async () => ({
      data: [sharedRow({ label: "Newer answer" })],
      error: null,
    }));

    const first = configured.dispatch(fetchSharedNotesList());
    await configured.dispatch(fetchSharedNotesList());
    releaseFirst?.({
      data: [sharedRow({ label: "Stale answer" })],
      error: null,
    });
    await first;

    // The second fetch's answer is the one on screen. Without the seq guard the
    // late first result lands last and the list silently goes backwards.
    expect(configured.getState().notes.notes[OTHER_NOTE_ID].label).toBe(
      "Newer answer",
    );
  });

  it("removes a revoked share but keeps one with unsaved edits", async () => {
    const configured = store([]);
    rpc.mockResolvedValue({ data: [sharedRow()], error: null });
    await configured.dispatch(fetchSharedNotesList());

    // A second sharee's note, revoked while the user was typing in it.
    const dirtyId = "88888888-8888-4888-8888-888888888888";
    configured.dispatch(
      upsertNoteFromServer({
        note: note({ id: dirtyId, created_by: "user-2" }),
        fetchStatus: "full",
        sharedMeta: { permissionLevel: "editor", ownerEmail: "o@example.com" },
      }),
    );
    configured.dispatch({
      type: "notes/setNoteField",
      payload: { id: dirtyId, field: "content", value: "half-typed" },
    });
    expect(configured.getState().notes.notes[dirtyId]._dirty).toBe(true);

    rpc.mockResolvedValue({ data: [], error: null });
    await configured.dispatch(fetchSharedNotesList());

    expect(configured.getState().notes.notes[OTHER_NOTE_ID]).toBeUndefined();
    expect(configured.getState().notes.notes[dirtyId]).toMatchObject({
      content: "half-typed",
    });
  });
});
