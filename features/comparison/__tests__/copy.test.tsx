import { act } from "react";
import { createRoot } from "react-dom/client";

import { parseResult, type ComparisonResult } from "../contract";
import { comparisonCopyProps } from "../copy";
import { verdictOf } from "../verdict";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The menu is the Alchemy one; here it only records what each mount hands it.
const mounts: Array<{ label: string; human: () => string; json: () => unknown; agent: () => { data: unknown } }> = [];
jest.mock("@/components/agent-copy/CopyButtons", () => ({
  CopyButtons: (props: (typeof mounts)[number]) => { mounts.push(props); return null; },
}));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

import { ComparisonView } from "../components/ComparisonView";

const F = (key: string, type: string, is_primary = false) => ({ key, label: key === "rating" ? "Rating" : "Reviews", type, direction: "higher_better", is_primary, help: "" });
const V = (value: unknown, display: string, is_best = false) => ({ value, display, is_best, basis: "on the page" });
const item = (id: string, name: string, rank: number, rating: number, best: boolean, reviews: number) => ({
  item_id: id, name, rank, values: { rating: V(rating, String(rating), best), reviews: V(reviews, String(reviews), reviews > 100) },
});

const base = {
  kind: "local_business", kind_label: "Medspa", primary_field: "rating",
  fields: [F("rating", "rating", true), F("reviews", "int")],
};

const result = parseResult({
  ...base,
  items: [item("a", "Alpha Medspa", 1, 4.9, true, 300), item("b", "Beta Clinic", 2, 4.5, false, 40), item("c", "Gamma Spa", 3, 4.2, false, 20)],
}) as ComparisonResult;

describe("copy through the Alchemy menu: one contender, or the whole comparison", () => {
  it("a contender's copy holds only that contender", () => {
    const p = comparisonCopyProps(result, "b");
    const text = p.human();
    expect(p.label).toBe("Beta Clinic");
    expect(text).toContain("Beta Clinic");
    expect(text).not.toContain("Alpha Medspa");
    expect(text).not.toContain("Gamma Spa");
    const data = p.json() as { contenders: { name: string }[] };
    expect(data.contenders.map((c) => c.name)).toEqual(["Beta Clinic"]);
    expect(JSON.stringify(p.agent().data)).not.toContain("Alpha Medspa");
  });

  it("the whole copy holds every contender and every field", () => {
    const p = comparisonCopyProps(result);
    const text = p.human();
    for (const n of ["Alpha Medspa", "Beta Clinic", "Gamma Spa", "Rating", "Reviews"]) expect(text).toContain(n);
    const data = p.json() as { contenders: { name: string; values: object }[]; fields: unknown[] };
    expect(data.contenders.map((c) => c.name)).toEqual(["Alpha Medspa", "Beta Clinic", "Gamma Spa"]);
    expect(data.fields).toHaveLength(2);
    expect(Object.keys(data.contenders[0].values)).toEqual(["rating", "reviews"]);
  });

  it("the view mounts one whole-comparison menu in the header and one per card, each scoped to its own", async () => {
    mounts.length = 0;
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => { createRoot(host).render(<ComparisonView result={result} />); });
    const labels = mounts.map((m) => m.label);
    expect(labels).toEqual(["Medspa comparison", "Alpha Medspa", "Beta Clinic", "Gamma Spa"]);
    const [whole, ...cards] = mounts;
    const wholeNames = (whole.json() as { contenders: { name: string }[] }).contenders.length;
    expect(wholeNames).toBe(3);
    for (const c of cards) expect((c.json() as { contenders: unknown[] }).contenders).toHaveLength(1);
  });
});

describe("a tie is not a lead", () => {
  it("two contenders both at 4.9 lead on nothing", () => {
    const tied = parseResult({
      ...base,
      items: [item("a", "Alpha Medspa", 1, 4.9, true, 50), item("b", "Beta Clinic", 2, 4.9, true, 50)],
    }) as ComparisonResult;
    const v = verdictOf(tied);
    expect(v.tied).toContain("rating");
    expect(v.leads).toBe(0);
  });
});
