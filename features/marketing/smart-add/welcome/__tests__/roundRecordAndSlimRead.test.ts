/**
 * Live failure 2026-10-21 (persona "Johanna Klomann"): a narrowed round the door started found her, yet the account's
 * `found_search_round` stayed 0 and the background check read only round 0; and that check read each round's whole
 * stored output (1.19 MB for a name-only round) to decide one notice.
 */
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
jest.mock("@/lib/redux/store-singleton", () => ({ getStoreSingleton: () => null }));
jest.mock("@/lib/python-client", () => ({ getJson: jest.fn() }));

import { welcomeRoundPatch } from "../welcomeRoundStart";
import { sessionRounds } from "../foundSearchBackground";
import { roundSubject, welcomeSubject } from "../welcomeSession";
import { FINISHED_ROUND_KEYS, FINISHED_ROUND_STEPS, finishedRoundPath } from "../../roundOutput";
import type { FoundSearchState } from "../foundSearchState";

const state = (over: Partial<FoundSearchState> = {}): FoundSearchState => ({
  startedAt: "2026-10-21T22:10:06Z",
  round: 0,
  basis: [],
  checkedAt: "2026-10-21T22:12:18Z",
  shownAt: null,
  skip: false,
  ...over,
});

describe("a later welcome round is the found search's latest round", () => {
  it("round 1 after a checked round 0: recorded and unchecked, so the background check reads it", () => {
    expect(welcomeRoundPatch(state(), 1)).toEqual({ round: 1, checkedAt: null });
  });
  it("never lowers the round, never reopens a search they were told about, never a skipped persona", () => {
    expect(welcomeRoundPatch(state({ round: 2 }), 1)).toBeNull();
    expect(welcomeRoundPatch(state({ shownAt: "2026-10-21T22:20:00Z" }), 1)).toBeNull();
    expect(welcomeRoundPatch(state({ skip: true }), 1)).toBeNull();
  });
});

describe("the background check reads every round of the session", () => {
  it("rounds 0 and 1 both count; the first gap ends the session", async () => {
    const subjects = [roundSubject(welcomeSubject("u1"), 0), roundSubject(welcomeSubject("u1"), 1)];
    const runs = await sessionRounds(async (s) => {
      const n = subjects.indexOf(s);
      return n === -1 ? null : { runId: `r${n}`, status: "completed" };
    }, "u1");
    expect(runs.map((r) => r.runId)).toEqual(["r0", "r1"]);
  });
});

describe("the slim slice", () => {
  it("asks for only the steps and keys finishedRound reads", () => {
    const url = new URL(`https://x${finishedRoundPath("0cc61658-ff42-4860-b299-ff74f30e8cb6")}`);
    expect(url.pathname).toBe("/runs/0cc61658-ff42-4860-b299-ff74f30e8cb6");
    expect(url.searchParams.get("steps")?.split(",")).toEqual([...FINISHED_ROUND_STEPS]);
    expect(url.searchParams.get("keys")?.split(",")).toEqual([...FINISHED_ROUND_KEYS]);
    expect(FINISHED_ROUND_STEPS).toEqual(expect.arrayContaining(["person_anchor_extract", "email", "web", "we_think"]));
    expect(FINISHED_ROUND_STEPS).not.toContain("backlinks");
    expect(FINISHED_ROUND_KEYS).not.toContain("results");
  });
});
