/**
 * PLACEMENT COMES FROM DATA, NEVER A HAND MAP (forcing test, PLAN §6.1).
 *
 * The pure model is fed a registry tree whose slugs exist nowhere in code
 * (random each run) and rows pointing at them. A job must land on the node its
 * row names, at any depth; a code job with no node lands in Unplaced; a soft
 * shortcut with no surface lands in Everywhere; other soft jobs land in their
 * owner lane; a fixture is flagged by data. Any snapshot, rule list or key
 * namespace lookup fails this, because the slugs and keys are unknowable.
 */
import {
  arrange,
  buildTree,
  commonAncestor,
  entriesWithin,
  entryKeys,
  groupOf,
  homeOf,
  isWithin,
  laneOf,
  pathOf,
  type PlacementRow,
  type TaxonomyNode,
} from "../placement-model";
import { storedMandateKey } from "@ai-matrx/agents/mandates";

const rand = () => Math.random().toString(36).slice(2, 8);
const slug = (name: string) => `${name}-${rand()}`;

const DOMAIN = slug("d");
const FEATURE = slug("f");
const SUB = slug("s");
const DEEPER = slug("x"); // a fourth level: no code decides depth
const OTHER = slug("o");

const nodes: TaxonomyNode[] = [
  { id: "1", slug: DOMAIN, name: "Domain One", parent_id: null, status: "active" },
  { id: "2", slug: FEATURE, name: "Feature Two", parent_id: "1", status: "active" },
  { id: "3", slug: SUB, name: "Sub Three", parent_id: "2", status: "active" },
  { id: "4", slug: DEEPER, name: "Deeper Four", parent_id: "3", status: "proposed" },
  { id: "5", slug: OTHER, name: "Other Five", parent_id: "1", status: "active" },
];
const tree = buildTree(nodes);
const VIEWER = "viewer-1";

let n = 0;
function row(over: Partial<PlacementRow>): PlacementRow {
  n += 1;
  return {
    mandateId: `m${n}`,
    mandateKey: storedMandateKey(`${rand()}.${rand()}`),
    nodeSlug: null,
    placedBy: "none",
    surfaceName: null,
    rollupAnchorId: null,
    origin: "code",
    organizationId: "org",
    createdBy: null,
    isFixture: false,
    isShortcut: false,
    ...over,
  };
}

describe("placement is read from the row, never from the key", () => {
  it("lands a job on the node its row names, at any depth", () => {
    const deep = row({ nodeSlug: DEEPER, placedBy: "mandate" });
    expect(homeOf(deep, VIEWER)).toBe(DEEPER);
    expect(pathOf(tree, DEEPER).map((node) => node.name)).toEqual([
      "Domain One",
      "Feature Two",
      "Sub Three",
      "Deeper Four",
    ]);
    expect(isWithin(tree, DEEPER, FEATURE)).toBe(true);
    expect(isWithin(tree, OTHER, FEATURE)).toBe(false);
  });

  it("two rows with the same key namespace land wherever their rows say", () => {
    const ns = rand();
    const a = row({ mandateKey: storedMandateKey(`${ns}.a`), nodeSlug: SUB, placedBy: "mandate" });
    const b = row({ mandateKey: storedMandateKey(`${ns}.b`), nodeSlug: OTHER, placedBy: "mandate" });
    expect([homeOf(a, VIEWER), homeOf(b, VIEWER)]).toEqual([SUB, OTHER]);
  });

  it("a job with no node falls to an honest lane decided by its own data", () => {
    expect(laneOf(row({ origin: "code" }), VIEWER)).toBe("unplaced");
    expect(laneOf(row({ origin: "user", isShortcut: true, surfaceName: null }), VIEWER)).toBe("everywhere");
    expect(laneOf(row({ origin: "user", isShortcut: true, surfaceName: "some/surface" }), VIEWER)).toBe("your-organization");
    expect(laneOf(row({ origin: "user", createdBy: VIEWER }), VIEWER)).toBe("yours");
    expect(laneOf(row({ origin: "user", createdBy: "someone-else" }), VIEWER)).toBe("your-organization");
    expect(laneOf(row({ origin: "user", isFixture: true, nodeSlug: SUB }), VIEWER)).toBe("fixtures");
    expect(laneOf(row({ origin: "code", nodeSlug: SUB, placedBy: "mandate" }), VIEWER)).toBeNull();
  });

  it("the deepest shared node of a code feature's jobs", () => {
    expect(commonAncestor(tree, [DEEPER, SUB])).toBe(SUB);
    expect(commonAncestor(tree, [DEEPER, OTHER])).toBe(DOMAIN);
    expect(commonAncestor(tree, [])).toBeNull();
  });
});

describe("roll-ups come from stored lineage", () => {
  const anchor = row({ origin: "user", nodeSlug: FEATURE, placedBy: "mandate", isShortcut: true });
  const v1 = row({ origin: "user", nodeSlug: FEATURE, placedBy: "mandate", rollupAnchorId: anchor.mandateId, surfaceName: "a/one" });
  const v2 = row({ origin: "user", nodeSlug: FEATURE, placedBy: "mandate", rollupAnchorId: anchor.mandateId, surfaceName: "b/two" });
  const v3 = row({ origin: "user", nodeSlug: SUB, placedBy: "surface", rollupAnchorId: anchor.mandateId, surfaceName: "c/three" });

  it("one roll-up row at the anchor's node holds every version", () => {
    const arranged = arrange([anchor, v1, v2, v3], VIEWER);
    const atFeature = arranged.get(FEATURE) ?? [];
    expect(atFeature).toHaveLength(1);
    expect(atFeature[0].kind).toBe("rollup");
    expect(entryKeys(atFeature[0])).toEqual([anchor.mandateKey, v1.mandateKey, v2.mandateKey, v3.mandateKey]);
  });

  it("a version whose surface carries a node also shows there as its own job", () => {
    const arranged = arrange([anchor, v1, v2, v3], VIEWER);
    expect(arranged.get(SUB)?.map((entry) => entry.kind)).toEqual(["job"]);
  });

  it("a viewer who cannot see the anchor still gets the roll-up at the group's node", () => {
    const arranged = arrange([v1, v2], VIEWER);
    const atFeature = arranged.get(FEATURE) ?? [];
    expect(atFeature).toHaveLength(1);
    expect(atFeature[0]).toMatchObject({ kind: "rollup", anchor: null });
  });

  it("a node page counts a roll-up once and includes everything below it", () => {
    const plain = row({ nodeSlug: DEEPER, placedBy: "mandate" });
    const arranged = arrange([anchor, v1, v2, plain], VIEWER);
    const group = groupOf(tree, arranged, FEATURE);
    expect(group.count).toBe(2);
    expect(group.own.map((entry) => entry.kind)).toEqual(["rollup"]);
    expect(group.children.map((child) => child.slug)).toEqual([SUB]);
    expect(group.children[0].children.map((child) => child.slug)).toEqual([DEEPER]);
    expect(entriesWithin(tree, arranged, DOMAIN).flatMap(entryKeys)).toContain(plain.mandateKey);
  });
});
