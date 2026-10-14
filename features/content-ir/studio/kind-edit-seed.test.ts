import {
  buildShapeReadiness,
  type ShapeDefinitionSnapshot,
} from "@/features/content-ir/studio/convert-to-shape";
import { composeKindEditSeed } from "@/features/content-ir/studio/kind-edit-seed";
import type { KindExampleListItem } from "@/features/content-ir/admin/kind-detail-types";
import type { KindComponentProjection } from "@/features/content-ir/registry/schema-source-kind-components";

jest.mock("@/lib/toast", () => ({ toast: { message: jest.fn() } }));
jest.mock("@/features/content-ir/studio/shape-readiness-service", () => ({}));
jest.mock("@/features/content-ir/studio/kind-examples", () => ({}));

const DEFINITION: ShapeDefinitionSnapshot = {
  id: "def-id",
  kind: "brand_basics_fact",
  label: "Brand Basics Facts Item",
  isActive: true,
  version: 3,
  publishedToWeb: true,
  emittedJsonSchema: { type: "object", properties: { fact: { type: "string" } } },
  metadata: { disposition: "record" },
  authoringOwner: "db",
  isContractArtifact: false,
};

const COMPONENT: KindComponentProjection = {
  kind: "brand_basics_fact",
  platform: "web",
  role: "output",
  componentKey: "db_kind_component",
  source: "db",
  isActive: true,
  config: {},
  componentSource: "export default function Tile() { return null; }",
  propsTransform: null,
  pinnedKindVersion: null,
  updatedAt: "2026-10-01T00:00:00Z",
  createdAt: "2026-10-01T00:00:00Z",
  id: "component-id",
  createdBy: "user-id",
};

function example(n: number, canonical = false): KindExampleListItem {
  return {
    id: `ex-${n}`,
    label: `Example ${n}`,
    description: null,
    isCanonical: canonical,
    source: "manual",
    validationStatus: "valid",
    kindVersion: 3,
    data: { __kind: "brand_basics_fact", fact: `fact ${n}` },
    updatedAt: "2026-10-01T00:00:00Z",
  };
}

describe("composeKindEditSeed", () => {
  const readiness = buildShapeReadiness({
    rootKind: "brand_basics_fact",
    definition: DEFINITION,
    components: [COMPONENT],
  });

  it("fills every variable the live Shape has a value for", () => {
    const seed = composeKindEditSeed({
      kind: "brand_basics_fact",
      label: "Brand Basics Facts Item",
      part: "edit",
      readiness,
      examples: [example(1, true), example(2), example(3), example(4)],
      extraKindContext: { skills: [{ id: "s1" }] },
    });
    const v = seed.variables;

    expect(v.task_brief).toContain("brand_basics_fact");
    expect(v.kind_schema).toContain('"fact"');
    expect(v.existing_kind_context).toContain("def-id");
    expect(v.existing_kind_context).toContain('"skills"');
    expect(v.existing_component_context).toContain("db_kind_component");
    expect(v.existing_component_source).toContain("function Tile");
    expect(v.shape_name).toBe("Brand Basics Facts Item");
    expect(v.shape_disposition).toBe("record");
    expect(v.shape_visibility).toBe("published_to_web");

    // Up to three saved examples, canonical first, the fourth dropped.
    expect(v.user_data_sample).toContain("Saved example 1 of 3");
    expect(v.user_data_sample).toContain("(canonical");
    expect(v.user_data_sample).toContain("fact 3");
    expect(v.user_data_sample).not.toContain("fact 4");
    // `__kind` is part of the data and is never stripped.
    expect(v.user_data_sample).toContain('"__kind": "brand_basics_fact"');
  });

  it("leaves blanks, never guesses, when the Shape has no record", () => {
    const seed = composeKindEditSeed({
      kind: "ghost_kind",
      label: "Ghost",
      part: "edit",
      readiness: buildShapeReadiness({ rootKind: "ghost_kind" }),
      examples: [],
    });
    const v = seed.variables;
    expect(v.user_data_sample).toBe("");
    expect(v.existing_kind_context).toBe("");
    expect(v.shape_disposition).toBe("");
    expect(v.shape_visibility).toBe("");
    expect(v.shape_name).toBe("Ghost");
    expect(v).not.toHaveProperty("shape_cardinality");
    expect(v).not.toHaveProperty("shape_render_style");
  });
});
