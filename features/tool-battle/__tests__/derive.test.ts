import { formatMs, laneName, marks, placeLanes, shownLanes } from "../derive";
import type { BattleView } from "../types";

describe("placeLanes", () => {
  it("ranks lower-is-better and shares a tied place", () => {
    const p = placeLanes({ a: 100, b: 100, c: 900 }, "lower");
    expect(p).toEqual({ a: 1, b: 1, c: 3 });
  });
  it("gives no places when every shown value is equal", () => {
    expect(placeLanes({ a: 1, b: 1 }, "higher")).toEqual({ a: null, b: null });
  });
  it("skips a lane with no value", () => {
    expect(placeLanes({ a: 5, b: null, c: 2 }, "lower")).toEqual({ a: 2, b: null, c: 1 });
  });
});

describe("marks", () => {
  it("colors first and last only", () => {
    expect(marks({ a: 1, b: 2, c: 3 })).toEqual({ a: "best", c: "worst" });
  });
});

describe("formatMs", () => {
  it("reads in ms below a second and seconds above", () => {
    expect(formatMs(820)).toBe("820 ms");
    expect(formatMs(12400)).toBe("12 s");
    expect(formatMs(2400)).toBe("2.4 s");
    expect(formatMs(null)).toBe("—");
  });
});

const battle = (blind: boolean): BattleView => ({
  id: "b", title: "t", jobKey: "j", toolId: null, status: "completed", blind,
  blindOrder: ["L2", "L1"], leaseSeconds: 90, summary: null, promotions: [], createdAt: "", startedAt: null, finishedAt: null,
  lanes: [
    { lane_id: "L1", endpoint_id: "e1", label: "Direct", provider_slug: null, via: "direct" },
    { lane_id: "L2", endpoint_id: "e2", label: "Broker", provider_slug: null, via: "treg" },
  ],
  subjects: [],
});

describe("blind", () => {
  it("hides names and shuffles until revealed", () => {
    const b = battle(true);
    expect(shownLanes(b, false).map((l) => l.lane_id)).toEqual(["L2", "L1"]);
    expect(laneName(b, b.lanes[1], false)).toBe("Source A");
    expect(laneName(b, b.lanes[0], false)).toBe("Source B");
    expect(laneName(b, b.lanes[0], true)).toBe("Direct");
    expect(shownLanes(b, true).map((l) => l.lane_id)).toEqual(["L1", "L2"]);
  });
  it("leaves a non-blind battle alone", () => {
    const b = battle(false);
    expect(laneName(b, b.lanes[0], false)).toBe("Direct");
  });
});
