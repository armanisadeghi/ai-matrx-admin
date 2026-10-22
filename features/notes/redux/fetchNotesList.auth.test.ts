import { withClaims } from "@/test-utils/supabase-auth";
import { fetchNotesList } from "./thunks";
import { supabase } from "@/utils/supabase/client";
import { hydrateNoteContextLinks } from "../service/noteContextAssociations";

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    // The list read resolves identity through `getClaimsUser(supabase)` →
    // `auth.getClaims()`. `withClaims` derives those claims from the SAME
    // `getSession` this suite scripts, so one scripted session is one identity
    // at both doors and the call counts below still count the session polls.
    auth: withClaims({ getSession: jest.fn() }),
    schema: jest.fn(),
  },
}));

jest.mock("../service/noteContextAssociations", () => ({
  hydrateNoteContextLinks: jest.fn(async (rows: unknown[]) => rows),
  syncNoteContextLinks: jest.fn(),
}));

function notesQuery(result: { data: unknown[] | null; error: unknown }) {
  // The list reads through `readAllRows`: a counted, ordered, ranged page.
  const paged = { ...result, count: result.data?.length ?? 0 };
  const chain = {
    from: jest.fn(),
    select: jest.fn(),
    eq: jest.fn(),
    is: jest.fn(),
    or: jest.fn(),
    order: jest.fn(),
    range: jest.fn(async () => paged),
    // The list's one "Shown to" read (`platform.shown_to_context`) — no
    // per-organization defaults, so every row the viewer can open is listed.
    rpc: jest.fn(async () => ({ data: {}, error: null })),
  };
  chain.from.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

describe("fetchNotesList auth boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks keeps queued `mockResolvedValueOnce` answers; the identity read is cached, so a
    // test may leave one unused and it would be served to the next test.
    jest.mocked(supabase.auth.getSession).mockReset();
  });

  it("stops before association hydration when identity disappears in flight", async () => {
    jest
      .mocked(supabase.auth.getSession)
      .mockResolvedValueOnce({
        data: { session: { access_token: "token", user: { id: "user-1" } } },
        error: null,
      } as never)
      .mockResolvedValueOnce({ data: { session: null }, error: null } as never);
    jest
      .mocked(supabase.schema)
      .mockReturnValue(notesQuery({ data: [{ id: "note-1" }], error: null }) as never);

    const dispatch = jest.fn((action) => action);
    const result = await fetchNotesList()(dispatch, () => ({
      userAuth: { id: "user-1" },
    }) as never, undefined);

    expect(result.type).toBe("notes/fetchNotesList/rejected");
    expect(fetchNotesList.rejected.match(result)).toBe(true);
    if (!fetchNotesList.rejected.match(result)) throw new Error("expected rejection");
    expect(result.error.name).toBe("SessionUnavailableError");
    expect(hydrateNoteContextLinks).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: "error", type: "notes/setListStatus" }),
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "notes/setListError",
        payload: expect.stringContaining("sign-in is still loading"),
      }),
    );
  });

  // THE EMPTY SIDEBAR (2026-09-14). On a fresh sign-in Redux names the user
  // before supabase-js has restored the session; the one-shot check used to
  // throw, the list went back to `idle`, the mount guard believed it had
  // fetched, and /notes showed nothing — no folders, no notes, no loading
  // state — until an unrelated dispatch happened to fetch again.
  it("waits for the session to settle on the first read instead of giving up at once", async () => {
    jest.useFakeTimers();
    try {
      // The identity read is cached ~2s (module-level, shared with the earlier test): age it out so
      // this test's scripted session sequence is what the read actually sees.
      jest.advanceTimersByTime(2_500);
      jest
        .mocked(supabase.auth.getSession)
        .mockResolvedValueOnce({ data: { session: null }, error: null } as never)
        .mockResolvedValueOnce({ data: { session: null }, error: null } as never)
        .mockResolvedValue({
          data: { session: { access_token: "token", user: { id: "user-1" } } },
          error: null,
        } as never);
      jest
        .mocked(supabase.schema)
        .mockReturnValue(notesQuery({ data: [{ id: "note-1", organization_id: "org-1" }], error: null }) as never);

      const dispatch = jest.fn((action) => action);
      const pending = fetchNotesList()(dispatch, () => ({
        userAuth: { id: "user-1" },
      }) as never, undefined);
      // The identity read is cached for a short window (createClaimsCache), so the empty answer
      // is re-asked only once that window passes: step the clock until the read settles.
      let settled = false;
      void pending.finally(() => { settled = true; });
      for (let step = 0; step < 40 && !settled; step++) await jest.advanceTimersByTimeAsync(250);
      const result = await pending;
      expect(fetchNotesList.fulfilled.match(result)).toBe(true);
      // Empty polls first, then the settled session — never giving up at once.
      expect(jest.mocked(supabase.auth.getSession).mock.calls.length).toBeGreaterThanOrEqual(3);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: "loaded", type: "notes/setListStatus" }),
      );
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ payload: "idle", type: "notes/setListStatus" }),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("reports the failure on screen when the session never settles", async () => {
    jest.useFakeTimers();
    try {
      jest
        .mocked(supabase.auth.getSession)
        .mockResolvedValue({ data: { session: null }, error: null } as never);
      const dispatch = jest.fn((action) => action);
      const pending = fetchNotesList()(dispatch, () => ({
        userAuth: { id: "user-1" },
      }) as never, undefined);
      await jest.advanceTimersByTimeAsync(7_000);
      const result = await pending;
      expect(fetchNotesList.rejected.match(result)).toBe(true);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: "error", type: "notes/setListStatus" }),
      );
    } finally {
      jest.useRealTimers();
    }
  });
});
