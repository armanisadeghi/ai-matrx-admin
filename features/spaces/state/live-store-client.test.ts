/**
 * A SPACE PAGE INSIDE AN APPLET READS AS THE APPLET'S VISITOR (review LAYFIX finding 3, 2026-10-22): the
 * Applet host reads a signed-out visitor's records through the guest client, but the Space page it showed
 * read through the app's own client, so the visitor saw "This page is gone or not shared with you". The
 * store reads through the client its host hands it; with none, the app's own.
 */
const mainCalls: string[] = [];

function recordingClient(calls: string[]) {
  // Any query chain: every step returns the chain; awaiting it answers "no row".
  const chain: Record<string, unknown> = {};
  const step = () => chain;
  for (const k of ["select", "eq", "in", "is", "order", "limit", "range", "maybeSingle", "single", "neq", "or", "not", "filter", "match"]) chain[k] = step;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null, count: 0 });
  const from = (table: string) => {
    calls.push(table);
    return chain;
  };
  return { schema: () => ({ from }), from, rpc: () => chain } as never;
}

jest.mock("@/utils/supabase/client", () => ({ supabase: recordingClient(mainCalls) }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org-1" }));

import { createLiveSpacesStore } from "./live-store";

describe("which client a Space page reads through", () => {
  beforeEach(() => {
    mainCalls.length = 0;
  });

  it("the host's client when it hands one (the Applet's guest client), never the app's", async () => {
    const guestCalls: string[] = [];
    await createLiveSpacesStore(() => null, recordingClient(guestCalls)).get("space-1");
    expect(guestCalls.length).toBeGreaterThan(0);
    expect(mainCalls).toEqual([]);
  });

  it("the app's own client when the host hands none", async () => {
    await createLiveSpacesStore(() => null).get("space-1");
    expect(mainCalls.length).toBeGreaterThan(0);
  });
});
