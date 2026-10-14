/**
 * SHAPES-BUGS 2.1: the per-kind admin page reads ONE kind's neighbourhood, not
 * the whole catalog. That is only honest if the doctor row it computes is the
 * SAME row the whole-catalog doctor computes — this proves it for every kind of
 * a fixture that exercises every cross-kind input (embedding parents, a self
 * edge, skills attributed by body and by id, a skill teaching two kinds, prompt
 * blocks, examples, components and surfaces spread across kinds).
 */
import { runShapeDoctor, type ShapeDoctorInput } from "../registry/shape-doctor";
import { scopeDoctorInputsToKind } from "../registry/shape-doctor-kind-scope";

const T0 = "2026-07-01T00:00:00Z";
const SCHEMA = {
  type: "object",
  properties: { title: { type: "string" } },
  required: ["title"],
};

const kind = (id: string, slug: string, extra: Record<string, unknown> = {}) => ({
  id,
  kind: slug,
  label: slug,
  isActive: true,
  emittedJsonSchema: SCHEMA,
  sampleData: null,
  updatedAt: T0,
  metadata: null,
  ...extra,
});

const FULL: ShapeDoctorInput = {
  kinds: [
    kind("k-root", "trip_plan"),
    kind("k-child", "trip_leg"),
    kind("k-self", "decision_node"),
    kind("k-lonely", "lonely_card", { isActive: false }),
    kind("k-xml", "xml_taught"),
    kind("k-data", "io_contract", { metadata: { family: "agent_io" } }),
  ],
  examples: [
    { id: "e1", kindDefinitionId: "k-root", isCanonical: true, data: { __kind: "trip_plan", title: "x" }, updatedAt: T0 },
    { id: "e2", kindDefinitionId: "k-child", isCanonical: true, data: { __kind: "trip_leg", title: "y" }, updatedAt: T0 },
    { id: "e3", kindDefinitionId: "k-self", isCanonical: false, data: { title: 1 }, updatedAt: T0 },
  ],
  components: [
    { id: "c1", kindDefinitionId: "k-root", platform: "web", role: "output", componentKey: "trip_plan", source: "db", isActive: true },
    { id: "c2", kindDefinitionId: "k-self", platform: "web", role: "output", componentKey: "decision_node", source: "bundled", isActive: true },
  ],
  surfaces: [
    { id: "s1", kindDefinitionId: "k-root", surfaceType: "json", token: "trip_plan", isActive: true },
  ],
  edges: [
    { parentDefinitionId: "k-root", childDefinitionId: "k-child", fieldName: "legs" },
    { parentDefinitionId: "k-self", childDefinitionId: "k-self", fieldName: "yes" },
  ],
  renderBlockSkills: [
    { skillId: "trip-skill", label: "Trips", body: '{"__kind": "trip_plan"} and {"__kind": "trip_leg"}' },
    { skillId: "kind-xml-taught-xml", label: "XML", body: null },
    { skillId: "kind_decision_node", label: "Decision", body: "" },
    { skillId: "kind_decision_node_dup", label: "Decision again", body: '{"__kind": "decision_node"}' },
  ],
  contentBlocks: [
    { id: "b1", template: 'Return {"__kind": "trip_plan", "title": "…"}' },
    { id: "b2", template: "nothing here" },
  ],
  detectorTokens: [],
  codeRenderPaths: { compiledKinds: ["decision_node"], artifactKinds: [] },
};

describe("one kind's doctor row from its neighbourhood equals the whole-catalog row", () => {
  const full = runShapeDoctor(FULL);
  for (const k of FULL.kinds) {
    it(k.kind, () => {
      const scoped = scopeDoctorInputsToKind(FULL, k.kind);
      expect(scoped).not.toBeNull();
      const row = runShapeDoctor({ ...FULL, ...scoped! }).rows.find((r) => r.kind === k.kind);
      expect(row).toEqual(full.rows.find((r) => r.kind === k.kind));
    });
  }

  it("is null for a kind that is not there", () => {
    expect(scopeDoctorInputsToKind(FULL, "nope")).toBeNull();
  });

  it("reads only the neighbourhood (not the catalog)", () => {
    const scoped = scopeDoctorInputsToKind(FULL, "trip_leg")!;
    expect(scoped.kinds.map((k) => k.kind).sort()).toEqual(["trip_leg", "trip_plan"]);
    expect(scoped.contentBlocks).toEqual([]);
    expect(scoped.renderBlockSkills.map((s) => s.skillId)).toEqual(["trip-skill"]);
  });
});
