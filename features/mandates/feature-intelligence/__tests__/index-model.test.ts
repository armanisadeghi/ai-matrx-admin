import { buildDomains, matchFeature, matchStrength, summarize } from "../index-model";
import { arrange, buildTree, type PlacementRow, type TaxonomyNode } from "../placement-model";
import { storedMandateKey } from "@ai-matrx/agents/mandates";

// A registry read from data: names and slugs are the test's own.
const nodes: TaxonomyNode[] = [
  { id: "1", slug: "dom-learning", name: "Learning", parent_id: null, status: "active" },
  { id: "2", slug: "feat-cards", name: "Cards", parent_id: "1", status: "active" },
  { id: "3", slug: "sub-drills", name: "Drills", parent_id: "2", status: "active" },
  { id: "4", slug: "dom-writing", name: "Writing", parent_id: null, status: "active" },
  { id: "5", slug: "feat-notes", name: "Notes", parent_id: "4", status: "active" },
];
const tree = buildTree(nodes);

let n = 0;
const row = (key: string, over: Partial<PlacementRow>): PlacementRow => ({
  mandateId: `m${++n}`,
  mandateKey: storedMandateKey(key),
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
});

const rows = [
  row("cards.generate", { nodeSlug: "feat-cards", placedBy: "mandate" }),
  row("cards.grade", { nodeSlug: "sub-drills", placedBy: "mandate" }),
  row("notes.organize", { nodeSlug: "feat-notes", placedBy: "mandate" }),
  row("learning.page_guide", { nodeSlug: "dom-learning", placedBy: "mandate" }),
  row("spaces.build", {}),
  row("shortcut.summarize", { origin: "user", isShortcut: true }),
];

const defs = [
  { mandate_key: "cards.generate", label: "Cards — Generate Cards", description: "Writes study cards from a source", goal: null },
  { mandate_key: "cards.grade", label: "Cards — Grade Answer", description: null, goal: "Mark an answer right or wrong" },
  { mandate_key: "notes.organize", label: "Notes Organizer", description: "Files a note into folders", goal: null },
  { mandate_key: "learning.page_guide", label: "Learning — Page Guide", description: null, goal: null },
  { mandate_key: "spaces.build", label: "Build a Space", description: null, goal: null },
  { mandate_key: "shortcut.summarize", label: "Summarize", description: null, goal: null },
];

const holders = [
  { mandateKey: storedMandateKey("cards.generate"), holderName: "Card Smith", holderType: "agent", status: "active" as const },
  { mandateKey: storedMandateKey("cards.grade"), holderName: "Grader Flow", holderType: "workflow", status: "active" as const },
  { mandateKey: storedMandateKey("notes.organize"), holderName: "None", holderType: null, status: "draft" as const },
  { mandateKey: storedMandateKey("learning.page_guide"), holderName: "Guide", holderType: "agent", status: "active" as const },
  { mandateKey: storedMandateKey("spaces.build"), holderName: "Builder", holderType: "agent", status: "active" as const },
  { mandateKey: storedMandateKey("shortcut.summarize"), holderName: "Sum", holderType: "agent", status: "active" as const },
];

const placement = { tree, arranged: arrange(rows, "viewer") };
const domains = buildDomains(defs, placement, holders);
const card = (feature: string) =>
  domains.flatMap((d) => d.features).find((row) => row.feature === feature)!;

describe("intelligence directory from data", () => {
  it("a section per Domain, its own jobs first, then a card per Feature, then the lanes", () => {
    expect(domains.map((d) => d.label)).toEqual(["Learning", "Writing", "Everywhere", "Unplaced"]);
    expect(domains[0].features.map((f) => f.label)).toEqual(["Learning", "Cards"]);
  });

  it("a card holds every job at or below its node and lists child nodes at any depth", () => {
    expect(card("feat-cards").jobs.map((j) => j.name)).toEqual(["Generate Cards", "Grade Answer"]);
    expect(card("feat-cards").children).toEqual([
      { slug: "sub-drills", label: "Drills", count: 1, children: [] },
    ]);
  });

  it("counts agents and workflows equally", () => {
    expect(summarize(card("feat-cards"))).toEqual({ agents: 1, workflows: 1, notRunning: 0, known: true });
    expect(summarize(card("feat-notes"))).toMatchObject({ notRunning: 1, known: true });
  });

  it("knows nothing about holders until the member list answers", () => {
    const bare = buildDomains(defs, placement);
    expect(summarize(bare.flatMap((d) => d.features).find((f) => f.feature === "feat-cards")!).known).toBe(false);
  });

  it("finds a card by its name, its Domain, a node below it, a job, what it does and who runs it", () => {
    expect(matchFeature(card("feat-cards"), "learning", "Learning")).toEqual({ kind: "name" });
    expect(matchFeature(card("feat-cards"), "drills")).toMatchObject({ kind: "job" });
    expect(matchFeature(card("feat-cards"), "study cards")).toEqual({ kind: "job", text: "Generate Cards" });
    expect(matchFeature(card("feat-cards"), "grader flow")).toEqual({ kind: "holder", text: "Grader Flow" });
    expect(matchFeature(card("feat-notes"), "grader")).toBeNull();
  });

  it("ranks the name above one-thing matches above words spread across several", () => {
    const spread = matchFeature(card("feat-cards"), "study wrong")!;
    expect(matchStrength(spread)).toBe(0);
    expect(matchStrength({ kind: "name" })).toBe(2);
    expect(matchStrength({ kind: "job", text: "x" })).toBe(1);
  });
});

describe("the card never promises more than the page shows", () => {
  it("drops definitions the member list does not return from this seat, once it answers", () => {
    const seated = buildDomains(defs, placement, holders.filter((h) => h.mandateKey !== "cards.grade"));
    expect(seated.flatMap((d) => d.features).find((f) => f.feature === "feat-cards")?.jobs).toHaveLength(1);
  });
});
