// components/official/org-chart/__tests__/forest.test.ts
//
// The two properties HR's chart is judged on, proved on the shared primitive
// (they were HR's own layout tests before the two charts converged):
//   • a reporting cycle never loops the build, and nobody is dropped;
//   • sibling order is a function of the rows, so a person who persists across
//     an as-of change keeps their position.
// Unit tests, not a browser check: a real cycle, an orphaned top row or a person
// present on one date and not another are invisible to a test account under RLS.

import { buildParentForest } from "../forest";
import {
  DEFAULT_ORG_CHART_LAYOUT,
  layoutOrgForest,
  type OrgChartTreeNode,
} from "../layout";

type Row = { id: string; managerId: string | null; name: string };
const row = (id: string, managerId: string | null, name = id): Row => ({ id, managerId, name });

const build = (rows: Row[]) =>
  buildParentForest(rows, {
    id: (r) => r.id,
    parentId: (r) => r.managerId,
    sortKey: (r) => r.name,
    edgeKind: "manager",
  });

const keys = (roots: OrgChartTreeNode<Row>[]): string[] => {
  const out: string[] = [];
  const walk = (n: OrgChartTreeNode<Row>) => {
    out.push(n.key);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return out;
};

const layout = (rows: Row[]) =>
  layoutOrgForest(build(rows).roots, {
    ...DEFAULT_ORG_CHART_LAYOUT,
    collapsed: new Set(),
    stackThreshold: Infinity,
  });
const xOf = (l: ReturnType<typeof layout>, id: string) => l.nodes.find((n) => n.key === id)?.x;

describe("buildParentForest — the cycle guard", () => {
  it("terminates on a two-row cycle and keeps both people, once each", () => {
    const f = build([row("a", "b"), row("b", "a")]);
    expect(keys(f.roots).sort()).toEqual(["a", "b"]);
    expect(f.cycleLinks).toHaveLength(1);
  });

  it("terminates on a longer cycle", () => {
    const f = build([row("a", "c"), row("b", "a"), row("c", "b")]);
    expect(keys(f.roots).sort()).toEqual(["a", "b", "c"]);
  });

  it("keeps a person whose manager is inside a cycle", () => {
    const f = build([row("a", "b"), row("b", "a"), row("c", "a")]);
    expect(keys(f.roots).sort()).toEqual(["a", "b", "c"]);
  });

  it("does not treat a self-managing row as a parent", () => {
    const f = build([row("a", "a")]);
    expect(f.roots.map((r) => r.key)).toEqual(["a"]);
    expect(f.roots[0].children).toHaveLength(0);
    expect(f.roots[0].edgeKind).toBeNull();
  });
});

describe("buildParentForest — nobody is silently dropped", () => {
  it("places every row it is given", () => {
    const rows = [
      row("ceo", null),
      row("vp1", "ceo"),
      row("vp2", "ceo"),
      row("ic1", "vp1"),
      row("ic2", "vp1"),
      row("orphan", "someone-who-left"),
    ];
    expect(keys(build(rows).roots).sort()).toEqual(rows.map((r) => r.id).sort());
  });

  it("treats a manager who is not in the set as no manager", () => {
    const f = build([row("ic", "gone")]);
    expect(f.roots.map((r) => r.key)).toEqual(["ic"]);
  });

  it("marks child links with the edge kind and roots with none", () => {
    const f = build([row("p", null), row("c", "p")]);
    expect(f.roots[0].edgeKind).toBeNull();
    expect(f.roots[0].children[0].edgeKind).toBe("manager");
  });
});

describe("buildParentForest — stable across an as-of change", () => {
  it("sorts siblings by name, then id", () => {
    const f = build([row("p", null), row("z", "p", "Casey"), row("y", "p", "Blake"), row("x", "p", "Blake")]);
    expect(f.roots[0].children.map((c) => c.key)).toEqual(["x", "y", "z"]);
  });

  it("gives a persisting person the same position on both dates", () => {
    const january = layout([row("ceo", null, "Ada"), row("a", "ceo", "Blake"), row("b", "ceo", "Casey")]);
    // June: a new report joined after them alphabetically.
    const june = layout([
      row("ceo", null, "Ada"),
      row("a", "ceo", "Blake"),
      row("b", "ceo", "Casey"),
      row("c", "ceo", "Devon"),
    ]);
    expect(xOf(june, "a")).toBe(xOf(january, "a"));
    expect(xOf(june, "b")).toBe(xOf(january, "b"));
  });

  it("is order-independent — the input array's order changes nothing", () => {
    const forwards = layout([row("ceo", null, "Ada"), row("a", "ceo", "Blake"), row("b", "ceo", "Casey")]);
    const backwards = layout([row("b", "ceo", "Casey"), row("a", "ceo", "Blake"), row("ceo", null, "Ada")]);
    const positions = (l: typeof forwards) => Object.fromEntries(l.nodes.map((n) => [n.key, [n.x, n.y]]));
    expect(positions(backwards)).toEqual(positions(forwards));
  });

  it("keeps input order when no sortKey is given", () => {
    const f = buildParentForest([row("b", null), row("a", null)], { id: (r) => r.id, parentId: (r) => r.managerId });
    expect(f.roots.map((r) => r.key)).toEqual(["b", "a"]);
  });
});
