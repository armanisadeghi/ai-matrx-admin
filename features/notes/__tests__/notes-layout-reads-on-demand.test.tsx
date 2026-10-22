/**
 * The /notes layout reads only what it shows (load law, 2026-10-18 census of
 * /notes/speed-test: 9 DB calls before settle, 25 after).
 *
 * Named breaks this suite catches:
 *  - the notes workspace (list, assists, realtime) mounting under a static
 *    /notes/<segment> page that is not the workspace (/notes/speed-test), or
 *    its code being statically imported by the layout's route body;
 *  - "Shared with me" read on route entry, or a refresh path (focus, realtime
 *    catch-up, Refresh) reading it before anyone opened the section;
 *  - the scope-tag read re-reading every visible note id
 *    (`workbench.notes ?select=id`, up to 1000 ids, ~930 ms) instead of the
 *    notes already in the store.
 */

import { withClaims } from "@/test-utils/supabase-auth";

const schema = jest.fn();
const rpc = jest.fn();
const getSession = jest.fn();
const listEntityScopeTags = jest.fn();
let mockPathname = "/notes";

jest.mock("@/utils/supabase/client", () => ({
  supabase: { schema, rpc, auth: withClaims({ getSession }) },
}));
jest.mock("@/utils/auth/getUserId", () => ({
  requireUserId: () => "user-1",
  getUserId: () => "user-1",
}));
jest.mock("@/features/scopes/service/scopesService", () => ({
  scopesService: {
    listEntityScopeTags: (...args: unknown[]) => listEntityScopeTags(...args),
  },
}));
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));
// The workspace is split at the route condition; the stub stands where the
// loaded NotesView would render.
jest.mock("next/dynamic", () => () => function NotesWorkspaceStub() {
  return <div data-testid="notes-workspace" />;
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { configureStore, type UnknownAction } from "@reduxjs/toolkit";
import { enableMapSet } from "immer";
import { createSlimRootReducer, type RootState } from "@/lib/redux/rootReducer";
import { upsertNoteFromServer } from "../redux/slice";
import { fetchAllNoteScopes, fetchSharedNotesList } from "../redux/thunks";
import { NotesRouteBody } from "../components/NotesRouteBody";
import type { Note } from "../types";

enableMapSet();

const NOTE_A = "22222222-2222-4222-8222-222222222222";
const NOTE_B = "33333333-3333-4333-8333-333333333333";

function note(id: string): Note {
  return {
    test_expires_at: null,
    test_run_id: null,
    id,
    content: "x",
    content_hash: null,
    created_at: "2026-10-18T00:00:00.000Z",
    created_by: "user-1",
    custom_fields: {},
    deleted_at: null,
    file_path: null,
    home_scope_id: null,
    label: "A note",
    last_device_id: null,
    metadata: {},
    organization_id: "11111111-1111-4111-8111-111111111111",
    position: 0,
    project_id: null,
    sync_version: 0,
    search_engine_indexed: null,
    shown_to: null,
    tags: [],
    task_id: null,
    updated_at: "2026-10-18T00:00:00.000Z",
    updated_by: null,
    version: 1,
    published_to_web: false,
  };
}

function store(seed: Note[] = []) {
  const slim = createSlimRootReducer();
  const configured = configureStore({
    reducer: (state: RootState | undefined, action: UnknownAction): RootState => {
      const next = slim(state, action);
      if (action.type === "test/seed-user") {
        return { ...next, userAuth: { ...next.userAuth, id: "user-1" } };
      }
      return next;
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });
  configured.dispatch({ type: "test/seed-user" });
  for (const row of seed) {
    configured.dispatch(upsertNoteFromServer({ note: row, fetchStatus: "list" }));
  }
  return configured;
}

beforeEach(() => {
  schema.mockReset();
  rpc.mockReset();
  listEntityScopeTags.mockReset();
  rpc.mockResolvedValue({ data: [], error: null });
});

describe("the notes layout mounts the workspace only on workspace routes", () => {
  it("renders the page itself, never the workspace, on /notes/speed-test", () => {
    mockPathname = "/notes/speed-test";
    const html = renderToStaticMarkup(<NotesRouteBody><p>empty page</p></NotesRouteBody>);
    expect(html).not.toContain("notes-workspace");
    expect(html).toContain("empty page");
  });

  it("never statically imports the workspace (its code loads only where it renders)", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "NotesRouteBody.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/^import[^;]*from "\.\/NotesView";/m);
    expect(source).toMatch(/import\("\.\/NotesView"\)/);
  });

  // 2026-10-22 live walk: /notes/history mounted the workspace with note id
  // "history", which threw "A Notes identity source requires a UUID note"
  // into the error boundary and fired a 400 read. A segment that is not a
  // note id is not a note: the page (and its not-found) renders instead.
  it("renders the page, never the workspace, when /notes/<segment> is not a note id", () => {
    for (const path of ["/notes/history", "/notes/all", "/notes/history/diff"]) {
      mockPathname = path;
      const html = renderToStaticMarkup(<NotesRouteBody><p>not found</p></NotesRouteBody>);
      expect(html).not.toContain("notes-workspace");
      expect(html).toContain("not found");
    }
  });

  it("still renders the workspace on /notes and /notes/<id>", () => {
    for (const path of ["/notes", `/notes/${NOTE_A}`]) {
      mockPathname = path;
      const html = renderToStaticMarkup(<NotesRouteBody><p>placeholder</p></NotesRouteBody>);
      expect(html).toContain("notes-workspace");
    }
  });
});

describe('"Shared with me" is read when asked for, never on entry', () => {
  it("a refresh path ({ ifLoaded }) reads nothing until the section was opened", async () => {
    const configured = store();
    await configured.dispatch(fetchSharedNotesList({ ifLoaded: true }));
    expect(rpc).not.toHaveBeenCalled();
  });

  it("opening the section ({ ifIdle }) reads once; refreshes re-read after that", async () => {
    const configured = store();
    await configured.dispatch(fetchSharedNotesList({ ifIdle: true }));
    await configured.dispatch(fetchSharedNotesList({ ifIdle: true }));
    expect(rpc).toHaveBeenCalledTimes(1);
    await configured.dispatch(fetchSharedNotesList({ ifLoaded: true }));
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("NotesView's route-entry effect does not start the shared read", () => {
    const source = readFileSync(
      join(__dirname, "..", "components", "NotesView.tsx"),
      "utf8",
    );
    // Every call passes a condition; a bare call is the route-entry read coming back.
    expect(source).not.toMatch(/fetchSharedNotesList\(\s*\)/);
  });
});

describe("scope tags are read for the notes already in the store", () => {
  it("never re-reads the visible note ids from workbench.notes", async () => {
    const configured = store([note(NOTE_A), note(NOTE_B)]);
    listEntityScopeTags.mockResolvedValue({ ok: true, data: { tags: [] } });

    await configured.dispatch(fetchAllNoteScopes());

    expect(schema).not.toHaveBeenCalled();
    expect(listEntityScopeTags).toHaveBeenCalledTimes(1);
    const [, ids] = listEntityScopeTags.mock.calls[0] as [string, string[]];
    expect([...ids].sort()).toEqual([NOTE_A, NOTE_B].sort());
  });
});
