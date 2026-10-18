/**
 * FX-D2 — review-walk titles tell pairs apart and survive a reload through the `?panels=` link.
 * Ported onto the package link door + the definition's link.hydrate.
 */
import { configureStore } from "@reduxjs/toolkit";

import { overlaysReducer, selectOpenInstances } from "@ai-matrx/summon";
import { linkHydrator, parsePanels, registerAppLinks, serializePanels } from "@/features/overlays/definitions/__tests__/linkKit";
import * as address from "@/features/review-walk/address";
import { walkTitle } from "@/features/review-walk/walkTitle";
import { pairWalkLabel } from "@/features/mandates/candidates/words";

const UNIT_A = "11111111-1111-4111-8111-111111111111";
const UNIT_B = "22222222-2222-4222-8222-222222222222";
const AGENT = "Page Summary Analyst";

function makeStore() {
  return configureStore({
    reducer: { overlays: overlaysReducer },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
}

async function reload(panelsValue: string) {
  const qs = new URLSearchParams();
  qs.set("panels", panelsValue);
  const readBack = new URLSearchParams(qs.toString()).get("panels")!;
  const store = makeStore();
  for (const panel of parsePanels(readBack)) {
    await linkHydrator(panel.typeKey)!(store.dispatch, panel.instanceId, panel.args ?? {});
  }
  return selectOpenInstances(store.getState(), "reviewWalkWindow").map((inst) => {
    const d = inst.data as Record<string, string | null>;
    return walkTitle({ unitKind: d.unitKind as string, agentName: d.agentName, roleLabel: d.roleLabel, detailLabel: d.detailLabel });
  });
}

describe("FX-D2 — walk titles tell pairs apart and survive a reload", () => {
  beforeAll(() => registerAppLinks());

  it("two Live walks from different pairs get different titles, inside the budget", () => {
    const one = walkTitle({ unitKind: "agent_request", agentName: AGENT, roleLabel: "Live", detailLabel: "Pair 1" });
    const two = walkTitle({ unitKind: "agent_request", agentName: AGENT, roleLabel: "Live", detailLabel: "Pair 2" });
    expect(one).not.toBe(two);
    expect(one).toMatch(/^Live · Pair 1 · Page Summary/);
    for (const t of [one, two]) expect(t.length).toBeLessThanOrEqual(40);
  });

  it("Pair 1 of two different candidates still differ (the time), and stay inside the budget", () => {
    const a = pairWalkLabel({ number: 1, created_at: "2026-10-03T22:22:29Z" });
    const b = pairWalkLabel({ number: 1, created_at: "2026-10-03T22:23:49Z" });
    expect(a).not.toBe(b);
    const titles = [a, b].map((detailLabel) => walkTitle({ unitKind: "agent_request", agentName: AGENT, roleLabel: "Candidate", detailLabel }));
    expect(titles[0]).not.toBe(titles[1]);
    for (const t of titles) expect(t.length).toBeLessThanOrEqual(40);
    expect(titles[0]).toMatch(/^Candidate · Pair 1 · \d\d:\d\d · P/);
  });

  it("a reloaded address restores both titles", async () => {
    const token = (unitId: string, pair: string) =>
      `review_walk:agent_request.${unitId}:r-Live_d-${encodeURIComponent(pair)}_n-${encodeURIComponent(AGENT)}`;
    const titles = await reload(`${token(UNIT_A, "Pair 1")},${token(UNIT_B, "Pair 2")}`);
    expect(titles).toEqual([
      walkTitle({ unitKind: "agent_request", agentName: AGENT, roleLabel: "Live", detailLabel: "Pair 1" }),
      walkTitle({ unitKind: "agent_request", agentName: AGENT, roleLabel: "Live", detailLabel: "Pair 2" }),
    ]);
    expect(titles[0]).not.toBe(titles[1]);
    expect(titles[0]).not.toMatch(/Diagnose/);
  });

  it("the window writes labels the address can carry, even with separators in them", async () => {
    const tricky = "Ops_bot-v2: a,b · ünï";
    const args = address.reviewWalkUrlArgs({ agentName: tricky, roleLabel: "Live", detailLabel: "Pair 7" });
    const value = serializePanels([
      { typeKey: "review_walk", instanceId: address.reviewWalkUrlId({ unitKind: "assistant_message", unitId: UNIT_A }), args },
    ]);
    expect(await reload(value)).toEqual([
      walkTitle({ unitKind: "assistant_message", agentName: tricky, roleLabel: "Live", detailLabel: "Pair 7" }),
    ]);
  });

  it("a bare link still opens, titled by the fallback", async () => {
    expect(await reload(`review_walk:agent_request.${UNIT_A}`)).toEqual(["Diagnose — agent request"]);
  });
});
