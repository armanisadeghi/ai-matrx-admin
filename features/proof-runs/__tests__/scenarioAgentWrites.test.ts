import { emptyScenario, type ProofMandateOption } from "../types";
import {
  parseCreateScenarios,
  parseUpdateScenarios,
  parseDeleteScenarios,
  parseScenarioDraft,
  mergeScenarioDraft,
  parseViewText,
} from "../scenarioAgentWrites";
const mandates: ProofMandateOption[] = [
  {
    mandate_key: "example.test",
    label: "Example",
    description: "",
    output_kind: null,
    required_output_keys: [],
    accepts_user_input: true,
    provision: null,
    offered_values: [],
  },
];
const row = {
  ...emptyScenario(),
  slug: "original_test",
  label: "Original",
  mandate_key: "example.test",
  description: "Keep this",
  max_cost_usd: 0.4,
  live_every_seconds: 900,
  check_slug: "scenario:original_test",
};
describe("proof scenario agent commands", () => {
  it("creates two complete canonical editor inputs without running a proof", () => {
    const created = parseCreateScenarios(
      [
        {
          slug: "first_test",
          label: "First",
          mandate_key: "example.test",
          variables: { fact: "{{marker:FACT}}" },
          expectations: [
            { id: "read_fact", rule: "contains_marker", marker: "FACT" },
          ],
        },
        { slug: "second_test", label: "Second", mandate_key: "example.test" },
      ],
      [],
      mandates,
    );
    expect(created).toHaveLength(2);
    expect(created[0]).toMatchObject({
      slug: "first_test",
      user_input: null,
      is_active: true,
      live_every_seconds: 21600,
      max_cost_usd: 0.75,
      allowed_routes: [],
    });
    expect(created[0].expectations).toEqual([
      { id: "read_fact", rule: "contains_marker", marker: "FACT" },
    ]);
  });
  it("merges sent fields and preserves all omitted fields and operator knobs", () => {
    const [updated] = parseUpdateScenarios(
      [{ id: row.slug, label: "Renamed", is_active: false }],
      [row],
      mandates,
    );
    expect(updated.scenario).toMatchObject({
      label: "Renamed",
      is_active: false,
      description: "Keep this",
      max_cost_usd: 0.4,
      live_every_seconds: 900,
      slug: row.slug,
      check_slug: row.check_slug,
    });
    expect(updated.changed).toEqual(["label", "is_active"]);
  });
  it("reports every bad field, item and duplicate before approval", () => {
    expect(() =>
      parseCreateScenarios(
        [
          {
            slug: "same_test",
            label: "",
            mandate_key: "missing",
            expectations: [{ id: "rule", rule: "bogus" }],
          },
          { slug: "same_test", label: "Second", mandate_key: "example.test" },
        ],
        [],
        mandates,
      ),
    ).toThrow(/Nothing was changed/);
    try {
      parseCreateScenarios(
        [
          { slug: "bad!", label: "", mandate_key: "example.test" },
          { slug: "bad!", label: "", mandate_key: "example.test" },
        ],
        [],
        mandates,
      );
    } catch (error) {
      expect(String(error)).toContain("create_scenarios[0].slug");
      expect(String(error)).toContain("create_scenarios[0].label");
      expect(String(error)).toContain("create_scenarios[1].slug");
      expect(String(error)).toContain("create_scenarios[1].label");
    }
  });
  it("refuses duplicate creates, repeated updates, unknown ids and unknown mandates", () => {
    expect(() =>
      parseCreateScenarios(
        [{ slug: row.slug, label: "Duplicate", mandate_key: "example.test" }],
        [row],
        mandates,
      ),
    ).toThrow(/already exists/);
    expect(() =>
      parseCreateScenarios(
        [{ slug: "new_test", label: "New", mandate_key: "missing" }],
        [],
        mandates,
      ),
    ).toThrow(/mandate_catalog/);
    expect(() =>
      parseUpdateScenarios(
        [
          { id: row.slug, label: "A" },
          { id: row.slug, label: "B" },
        ],
        [row],
        mandates,
      ),
    ).toThrow(/more than once/);
    expect(() =>
      parseUpdateScenarios(
        [{ id: "unknown_test", label: "A" }],
        [row],
        mandates,
      ),
    ).toThrow(/not a loaded/);
    expect(() => parseDeleteScenarios(["unknown_test"], [row])).toThrow(
      /not a loaded/,
    );
  });
  it("refuses unknown fields, immutable identity, spend/cadence changes and malformed rules", () => {
    for (const patch of [
      { id: row.slug, slug: "renamed_test" },
      { id: row.slug, max_cost_usd: 100 },
      { id: row.slug, live_every_seconds: 300 },
      { id: row.slug, expectations: [{ id: "", rule: "judge" }] },
    ])
      expect(() => parseUpdateScenarios([patch], [row], mandates)).toThrow();
    expect(() =>
      parseCreateScenarios(
        Array.from({ length: 26 }, (_, i) => ({
          slug: `test_${i}`,
          label: `Test ${i}`,
          mandate_key: "example.test",
        })),
        [],
        mandates,
      ),
    ).toThrow(/at most 25/);
    expect(() => parseCreateScenarios([], [], mandates)).toThrow(
      /at least one/,
    );
  });
  it("stages a partial draft without mutating or saving the original", () => {
    const draft = parseScenarioDraft(
      {
        __kind: "json",
        description: "Proposed",
        variables: { __kind: "json", fact: "draft" },
      },
      mandates,
    );
    expect(mergeScenarioDraft(row, draft)).toMatchObject({
      slug: row.slug,
      description: "Proposed",
      variables: { __kind: "json", fact: "draft" },
      max_cost_usd: 0.4,
    });
    expect(row.description).toBe("Keep this");
    expect(() => parseScenarioDraft({ __kind: "json" }, mandates)).toThrow(
      /at least one/,
    );
  });
  it("resolves canonical soft-delete identities and rejects repeats", () => {
    expect(parseDeleteScenarios([{ id: row.slug }], [row])).toEqual([row]);
    expect(() =>
      parseDeleteScenarios([row.slug, { id: row.slug }], [row]),
    ).toThrow(/more than once/);
  });
  it("validates primitive view controls without coercing objects", () => {
    expect(parseViewText("replay", "run_mode")).toBe("replay");
    expect(() => parseViewText({}, "run_mode")).toThrow(/plain text/);
  });
  it("rejects an invalid current JSON draft BEFORE approval, permitting a corrected variables proposal", () => {
    expect(() =>
      parseScenarioDraft({ __kind: "json", description: "Change" }, mandates, {
        variablesError: "invalid JSON",
      }),
    ).toThrow(/Include corrected variables/);
    expect(() =>
      parseScenarioDraft({ __kind: "json", label: "Draft" }, mandates, {
        catalogReady: false,
      }),
    ).toThrow(/successful current mandate catalog/);
    expect(
      parseScenarioDraft(
        { __kind: "json", variables: { corrected: true } },
        mandates,
        { variablesError: "invalid JSON" },
      ),
    ).toMatchObject({ variables: { corrected: true } });
    expect(() =>
      parseScenarioDraft({ __kind: "json", slug: "renamed_case" }, mandates, {
        immutableSlug: row.slug,
        saving: true,
      }),
    ).toThrow(/slug cannot change/);
  });
});
