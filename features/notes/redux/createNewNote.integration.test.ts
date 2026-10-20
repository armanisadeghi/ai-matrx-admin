import { withClaims } from "@/test-utils/supabase-auth";

const schema = jest.fn();
const getSession = jest.fn();
const getUserId = jest.fn();
const listForSources = jest.fn();
const setTargets = jest.fn();
const invalidate = jest.fn();

// The create path verifies the actor with `getClaimsUser(supabase)` →
// `auth.getClaims()`; `withClaims` derives it from the SAME scripted session,
// so "the session changed" below stays a REAL identity change and not a
// missing method on the fake.
jest.mock("@/utils/supabase/client", () => ({ supabase: { schema, auth: withClaims({ getSession }) } }));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: getUserId }));
jest.mock("@/features/scopes/service/associationsService", () => ({
  associationsService: { listForSources, setTargets },
}));
jest.mock("@/features/scopes/host/associationsStore", () => ({
  // `services` is read at import time by commentsService (via thunks → scopesService → taskService).
  getAssociationsStore: () => ({ invalidate, services: { comments: {} } }),
}));

import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "./slice";
import { createNewNote } from "./thunks";
import { createNote } from "../service/notesService";
import { NoteContextPartialSaveError } from "../service/noteSaveErrors";

const organizationId = "11111111-1111-4111-8111-111111111111";
const noteId = "33333333-3333-4333-8333-333333333333";
const projectId = "44444444-4444-4444-8444-444444444444";
const taskId = "55555555-5555-4555-8555-555555555555";

function query(result: unknown) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    single: jest.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.single.mockResolvedValue(result);
  chain.order.mockResolvedValue(result);
  chain.maybeSingle.mockResolvedValue(result);
  return chain;
}

describe("createNewNote integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getUserId.mockReturnValue("user-1");
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
    setTargets.mockResolvedValue({ ok: true });
    invalidate.mockReset();
  });

  it("surfaces a partial create receipt instead of hydrating it as a full success", async () => {
    const inserted = query({ data: {
      id: noteId, label: "Created", content: "body",
      organization_id: organizationId, version: 1, updated_at: "2026-09-12T00:00:00.000Z",
    }, error: null });
    schema.mockReturnValue({ from: jest.fn().mockReturnValueOnce(inserted) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    setTargets
      .mockResolvedValueOnce({ ok: true, data: null })
      .mockResolvedValueOnce({ ok: false, error: { message: "task denied" } });

    const store = configureStore({
      reducer: { notes: notesReducer, userAuth: () => ({ id: "user-1" }) },
    });
    const action = await store.dispatch(createNewNote({
      organization_id: organizationId, label: "Created", content: "body",
      project_id: projectId, task_id: taskId,
    }));
    expect(createNewNote.rejected.match(action)).toBe(true);
    expect(action.payload).toMatchObject({ code: "context_partial", receipt: { note: { id: noteId }, failedFields: ["task_id"] } });
    expect(store.getState().notes.notes[noteId]).toMatchObject({ id: noteId, project_id: projectId, task_id: taskId, _dirty: true });
    expect(store.getState().notes.notes[noteId]._dirtyFields).toEqual(new Set(["task_id"]));
    expect(store.getState().notes.openTabs).toContain(noteId);
    expect(inserted.insert).toHaveBeenCalledTimes(1);
  });

  it("does not hydrate a durable full create after the authoritative session changes", async () => {
    const inserted = query({ data: {
      id: noteId, label: "Created", content: "body",
      organization_id: organizationId, version: 1, updated_at: "2026-09-12T00:00:00.000Z",
    }, error: null });
    schema.mockReturnValue({ from: jest.fn().mockReturnValueOnce(inserted) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-2" } } }, error: null });
    const store = configureStore({ reducer: { notes: notesReducer, userAuth: () => ({ id: "user-1" }) } });

    const action = await store.dispatch(createNewNote({
      organization_id: organizationId, label: "Created", content: "body",
    }));

    expect(createNewNote.rejected.match(action)).toBe(true);
    expect(store.getState().notes.notes[noteId]).toBeUndefined();
    expect(store.getState().notes.openTabs).not.toContain(noteId);
    expect(inserted.insert).toHaveBeenCalledTimes(1);
  });

  it("does not hydrate a durable partial create after the authoritative session changes", async () => {
    const inserted = query({ data: {
      id: noteId, label: "Created", content: "body",
      organization_id: organizationId, version: 1, updated_at: "2026-09-12T00:00:00.000Z",
    }, error: null });
    schema.mockReturnValue({ from: jest.fn().mockReturnValueOnce(inserted) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    setTargets.mockResolvedValueOnce({ ok: false, error: { message: "task denied" } });
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-2" } } }, error: null });
    const store = configureStore({ reducer: { notes: notesReducer, userAuth: () => ({ id: "user-1" }) } });

    const action = await store.dispatch(createNewNote({
      organization_id: organizationId, label: "Created", content: "body", task_id: taskId,
    }));

    expect(createNewNote.rejected.match(action)).toBe(true);
    expect(action.payload).toBeUndefined();
    expect(store.getState().notes.notes[noteId]).toBeUndefined();
    expect(store.getState().notes.openTabs).not.toContain(noteId);
    expect(inserted.insert).toHaveBeenCalledTimes(1);
  });

  it("does not hydrate a durable create when Redux changes users while the session remains stale", async () => {
    const inserted = query({ data: {
      id: noteId, label: "Created", content: "body",
      organization_id: organizationId, version: 1, updated_at: "2026-09-12T00:00:00.000Z",
    }, error: null });
    schema.mockReturnValue({ from: jest.fn().mockReturnValueOnce(inserted) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    const userAuth = (state = { id: "user-1" }, action: { type: string }) =>
      action.type === "test/switch-user" ? { id: "user-2" } : state;
    const store = configureStore({ reducer: { notes: notesReducer, userAuth } });
    getSession.mockImplementationOnce(async () => {
      store.dispatch({ type: "test/switch-user" });
      return { data: { session: { user: { id: "user-1" } } }, error: null };
    });

    const action = await store.dispatch(createNewNote({
      organization_id: organizationId, label: "Created", content: "body",
    }));

    expect(createNewNote.rejected.match(action)).toBe(true);
    expect(store.getState().notes.notes[noteId]).toBeUndefined();
    expect(store.getState().notes.openTabs).not.toContain(noteId);
    expect(inserted.insert).toHaveBeenCalledTimes(1);
  });

  it("returns a created note when cache recovery follows durable context settlement", async () => {
    const inserted = query({ data: {
      id: noteId, label: "Created", content: "body",
      organization_id: organizationId, version: 1, updated_at: "2026-09-12T00:00:00.000Z",
    }, error: null });
    schema.mockReturnValue({ from: jest.fn().mockReturnValueOnce(inserted) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });
    invalidate.mockImplementation(() => { throw new Error("cache offline"); });

    await expect(createNote({
      organization_id: organizationId, label: "Created", content: "body", project_id: projectId,
    })).resolves.toMatchObject({ id: noteId, project_id: projectId });
  });

  it("an empty create inserts a NEW row and never returns an existing empty note", async () => {
    const existingEmpty = { id: noteId, label: "New Note", content: "", organization_id: organizationId, deleted_at: null };
    const newId = "66666666-6666-4666-8666-666666666666";
    // One chain: a lookup read (`order`) would return the old empty note; the insert (`single`) returns the new row.
    const chain = query({ data: { ...existingEmpty, id: newId, version: 1, updated_at: "2026-09-12T00:00:00.000Z" }, error: null });
    chain.order.mockResolvedValue({ data: [existingEmpty], error: null });
    const inserted = chain;
    schema.mockReturnValue({ from: jest.fn().mockReturnValue(chain) });
    listForSources.mockResolvedValue({ ok: true, data: { edges: [] } });

    const note = await createNote({ organization_id: organizationId });

    expect(inserted.insert).toHaveBeenCalledTimes(1);
    expect(note.id).toBe(newId);
    expect(note.id).not.toBe(noteId);
  });
});
