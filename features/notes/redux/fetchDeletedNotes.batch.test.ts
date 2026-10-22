// Audit N-22 — the trash hydration used to dispatch one `upsertNoteFromServer`
// per deleted row, re-notifying every store subscriber and re-running every
// sorted list selector once per row (the O(N²·log N) freeze shape the owner
// list was fixed for). It must be ONE batch, whatever the row count.
//
// It also used to stamp every trashed row's `created_by` with the VIEWER,
// which under organization scope claimed colleagues' deleted notes as theirs.

import { fetchDeletedNotes, TRASH_PAGE_SIZE } from "./thunks";
import { supabase } from "@/utils/supabase/client";

jest.mock("@/utils/supabase/client", () => ({
  supabase: { auth: { getSession: jest.fn() }, schema: jest.fn() },
}));

jest.mock("../service/noteContextAssociations", () => ({
  hydrateNoteContextLinks: jest.fn(async (rows: unknown[]) => rows),
  syncNoteContextLinks: jest.fn(),
}));

jest.mock("@/lib/list-scope", () => ({
  defaultListFilter: jest.fn(async () => ({ ownerOnly: false, apply: (q: unknown) => q })),
}));

function trashQuery(rows: unknown[], count: number | null = rows.length) {
  const chain = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    range: jest.fn(async () => ({ data: rows, error: null, count })),
  };
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe("fetchDeletedNotes hydration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hydrates the whole bin in ONE batched dispatch", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: `note-${i}`,
      created_by: i % 2 === 0 ? "user-1" : "colleague-9",
      label: `Note ${i}`,
      deleted_at: "2026-09-14T00:00:00Z",
    }));
    jest.mocked(supabase.schema).mockReturnValue(trashQuery(rows) as never);

    const dispatch = jest.fn((action) => action);
    await fetchDeletedNotes()(
      dispatch,
      () => ({ userAuth: { id: "user-1" } }) as never,
      undefined,
    );

    const upsertActions = dispatch.mock.calls
      .map(([action]) => action as { type?: string })
      .filter((action) => typeof action?.type === "string" && action.type.startsWith("notes/upsertNote"));

    expect(upsertActions).toHaveLength(1);
    expect(upsertActions[0]).toEqual(
      expect.objectContaining({ type: "notes/upsertNotesFromServer" }),
    );
    const payload = (upsertActions[0] as { payload: { upserts: { note: { id: string; created_by: string }; fetchStatus: string }[] } }).payload;
    expect(payload.upserts).toHaveLength(25);
    // Trash rows carry the preview, not the body (audit N-24): a "list" read,
    // so opening one from the bin reads its body like any other note.
    expect(payload.upserts.every((u) => u.fetchStatus === "list")).toBe(true);
    // The ROW's owner, never the viewer's id.
    expect(payload.upserts[1].note.created_by).toBe("colleague-9");
  });

  // 2026-10-21: admin@admin.com held 726 trashed notes and the bin was one unpaged
  // read — past 1,000 the list and its count would both have been silently short.
  it("reads a PAGE with the server's exact total, and the next page starts after what the store holds", async () => {
    const page = Array.from({ length: 200 }, (_, i) => ({ id: `n-${i}`, created_by: "user-1", deleted_at: "2026-09-14T00:00:00Z" }));
    const chain = trashQuery(page, 1450);
    jest.mocked(supabase.schema).mockReturnValue(chain as never);
    const dispatch = jest.fn((action) => action);

    const first = await fetchDeletedNotes()(dispatch, () => ({ userAuth: { id: "user-1" } }) as never, undefined);
    expect(chain.select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    expect(chain.range).toHaveBeenLastCalledWith(0, TRASH_PAGE_SIZE - 1);
    expect(first.payload).toEqual({ total: 1450, received: 200 });

    const held = Object.fromEntries(page.map((n) => [n.id, n]));
    await fetchDeletedNotes({ more: true })(
      dispatch,
      () => ({ userAuth: { id: "user-1" }, notes: { notes: held } }) as never,
      undefined,
    );
    expect(chain.range).toHaveBeenLastCalledWith(200, 200 + TRASH_PAGE_SIZE - 1);
  });

  it("refuses a page that came back without a total rather than counting its rows", async () => {
    jest.mocked(supabase.schema).mockReturnValue(trashQuery([{ id: "a", deleted_at: "x" }], null) as never);
    const result = await fetchDeletedNotes()(jest.fn((a) => a), () => ({ userAuth: { id: "user-1" } }) as never, undefined);
    expect(result.type).toBe("notes/fetchDeletedNotes/rejected");
  });
});
