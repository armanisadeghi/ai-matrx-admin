/**
 * A JSON Schema document shown as source declares `__kind` (property name,
 * `required` entry) - that is not a kind leaking. A real payload still is.
 */
import { screenTextHoldsKind, screenTextShowsJsonKind, withoutJsonSchemaKindDeclarations } from "../surfaces/kind-leak-scan";

const SCHEMA = `{
  "type": "object",
  "$defs": {
    "brand_basics_fact": {
      "type": "object",
      "properties": { "__kind": { "const": "brand_basics_fact" }, "label": { "type": "string" } },
      "required": ["__kind", "label"]
    }
  }
}`;

describe("kind leak scan vs JSON Schema documents", () => {
  it("does not fire on a schema that declares __kind", () => {
    expect(screenTextHoldsKind(SCHEMA)).toBe(false);
    expect(screenTextShowsJsonKind(SCHEMA)).toBe(false);
  });
  it("does not fire on a capped excerpt cut inside the required list", () => {
    expect(screenTextHoldsKind(SCHEMA.slice(0, SCHEMA.indexOf('"label"]') - 3))).toBe(false);
  });
  it("still fires on a real payload", () => {
    const payload = '{"__kind":"brand_basics_fact","label":"x"}';
    expect(screenTextHoldsKind(payload)).toBe(true);
    expect(screenTextShowsJsonKind(payload)).toBe(true);
  });
  it("still fires on a payload hiding inside a schema's examples", () => {
    const withExample = SCHEMA.replace(/\}$/, ', "examples": [{"__kind": "brand_basics_fact", "label": "x"}] }');
    expect(screenTextHoldsKind(withExample)).toBe(true);
  });
  it("an unterminated required list never hides a leak after it", () => {
    const cut = '{"properties": {"a": {"type": "string"}}, "required": ["__kind", "a" {"__kind": "brand_basics_fact", "label": "x"}';
    expect(screenTextHoldsKind(cut)).toBe(true);
    expect(screenTextShowsJsonKind(cut)).toBe(true);
  });
  it("an object-valued __kind in a payload beside a properties key still fires", () => {
    const payload = '{"properties": {"a": 1}, "__kind": {"slug": "brand_basics_fact"}}';
    expect(screenTextHoldsKind(payload)).toBe(true);
  });
  it("leaves non-schema text untouched", () => {
    const t = '{"__kind": {"x":1}}';
    expect(withoutJsonSchemaKindDeclarations(t)).toBe(t);
  });
});
