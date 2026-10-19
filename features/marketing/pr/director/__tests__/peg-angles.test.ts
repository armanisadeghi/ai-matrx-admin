/**
 * THE DIRECTOR'S PEG REACHES THE ANGLE WRITER IN PEG MODE (2026-10-19).
 *
 * `news.angles` has offered a "peg" mode since 2026-09-27 (BRIEFS-STRATEGY-AND-ORG-CHART decision 6) and no
 * caller sent it. The menu's `pr_peg_check` is now read into the view, and "Find angles" runs the mandate with
 * `mode: "peg"` and `story = {peg_kind, text, proof[], standing}`.
 */

const runHeadlessAgentJson = jest.fn();

jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/run-headless-agent-json", () => ({
  runHeadlessAgentJson: (...args: unknown[]) => runHeadlessAgentJson(...args),
  mandateOutputUnusableSentence: () => null,
}));

import { prPlayMenuServerDataFromEnvelope, readPrPeg } from "@/features/content-ir/kinds/pr-play-menu";
import { findPegAngles, pegStanding, pegStory, readPegAngles } from "../peg-angles";

const peg = { text: "Our founder ran the 2024 census count", passesNew: true, passesTimely: false, passesOthersCare: true };
const brand = { brandId: "brand-1", brandName: "Acme", organizationId: "org-1" };

test("the menu's peg is read into the view, and absent when it has no text", () => {
  expect(
    readPrPeg({ __kind: "pr_peg_check", text: " A hook ", passes_new: true, passes_timely: true, passes_others_care: true }),
  ).toEqual({ text: "A hook", passesNew: true, passesTimely: true, passesOthersCare: true });
  expect(readPrPeg({ text: "" })).toBeNull();
  expect(readPrPeg(undefined)).toBeNull();
});

test("standing follows the Director's three tests", () => {
  expect(pegStanding({ ...peg, passesTimely: true })).toBe("strong");
  expect(pegStanding(peg)).toBe("partial");
  expect(pegStanding({ ...peg, passesNew: false, passesOthersCare: false })).toBe("none");
  expect(pegStory(peg)).toEqual({ peg_kind: "director_peg", text: peg.text, proof: [], standing: "partial" });
});

test("Find angles runs news.angles in peg mode with the peg as the story", async () => {
  runHeadlessAgentJson.mockResolvedValueOnce({
    success: true,
    data: { angles: [{ headline: "Census insider", why_now: "Count opens", tentative: false }], next_step: "" },
  });
  const done = await findPegAngles({ peg, brand })(jest.fn() as never, jest.fn() as never);
  const options = runHeadlessAgentJson.mock.calls[0][2];
  expect(options.mandateKey).toBe("news.angles");
  expect(options.variables.mode).toBe("peg");
  expect(options.variables.story).toEqual(pegStory(peg));
  expect(options.variables.client_context).toMatchObject({ __kind: "news_client_context", brand_id: "brand-1" });
  expect(options.variables.run_generated_at).toBe(options.variables.client_context.run_generated_at);
  expect(done).toEqual({ ok: true, result: { angles: [{ headline: "Census insider", whyNow: "Count opens", tentative: false }], nextStep: "" } });
});

test("zero angles is an answer, and a failed run says why", async () => {
  expect(readPegAngles({ angles: [], next_step: "Standing none." })).toEqual({ angles: [], nextStep: "Standing none." });
  runHeadlessAgentJson.mockResolvedValueOnce({ success: false, error: "timed out" });
  const done = await findPegAngles({ peg, brand })(jest.fn() as never, jest.fn() as never);
  expect(done).toEqual({ ok: false, error: "timed out" });
});

test("the bridge carries the peg to the block", () => {
  const data = prPlayMenuServerDataFromEnvelope({
    __kind: "pr_play_menu",
    plays: [],
    peg: { __kind: "pr_peg_check", text: "A hook", passes_new: true, passes_timely: true, passes_others_care: false },
    next_move: "",
  } as never);
  expect(data?.peg).toEqual({ text: "A hook", passesNew: true, passesTimely: true, passesOthersCare: false });
});
