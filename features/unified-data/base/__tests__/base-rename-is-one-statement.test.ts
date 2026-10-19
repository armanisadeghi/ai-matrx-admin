// A BASE RENAME IS ONE SHORT STATEMENT (AT-SNAPJOB-2, 2026-10-19). Live measure: the base row update is 12-47 ms; the
// slow part a person met was what ran around it (a read of the base row first, then a full re-read of every table, page
// and automation of a big base, each able to hit the 8 s budget). With the base row's id in hand the save is the one
// update and the screen takes the saved row from its answer. RED on the prior bytes: saveBase always read first (2 calls).
const calls: string[] = [];
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({
      from: (t: string) => {
        const chain: any = {
          update: () => { calls.push(`update ${t}`); return chain; },
          insert: () => { calls.push(`insert ${t}`); return chain; },
          select: () => { calls.push(`select ${t}`); return chain; },
          eq: () => chain, is: () => chain, order: () => chain,
          limit: () => Promise.resolve({ data: [{ id: "b1", name: "Harbor" }], error: null }),
        };
        return chain;
      },
    }),
  }),
}));
jest.mock("@/lib/python-client", () => ({ putJson: jest.fn() }));

import { saveBase } from "../baseStore";

beforeEach(() => { calls.length = 0; });

it("with the base row id known, a rename is the one update and reads nothing first", async () => {
  await saveBase("org", "home", { name: "Harbor" }, "b1");
  expect(calls.filter((c) => c.endsWith(" base") && !c.startsWith("select"))).toEqual(["update base"]);
  expect(calls).toEqual(["update base", "select base"]);
});

it("the first naming (no row yet) still reads, then inserts", async () => {
  await saveBase("org", "home", { name: "Harbor" });
  expect(calls[0]).toBe("select base");
});
