import { proofRunsOverview } from "../surfaceContext";
it("describes initial wait without claiming zero observed checks", () => {
  const xml = proofRunsOverview({
    loading: true,
    loaded: false,
    error: null,
    organizationRequired: false,
    selected: "",
    mode: "auto",
    running: null,
    checks: [],
    scenarios: [],
    runs: [],
    draft: null,
  });
  expect(xml).toContain('data_loaded="false"');
  expect(xml).not.toContain("<checks");
});
it("exposes the run mode, selected check and failure without raw JSON", () => {
  const xml = proofRunsOverview({
    loading: false,
    loaded: false,
    error: "API <unavailable>",
    organizationRequired: true,
    selected: "demo",
    mode: "replay",
    running: null,
    checks: [],
    scenarios: [],
    runs: [],
    draft: { slug: "draft_test", label: "Draft", mandate_key: "example.test" },
  });
  expect(xml).toContain('run_mode="replay"');
  expect(xml).toContain('selected_check="demo"');
  expect(xml).toContain("API &lt;unavailable&gt;");
  expect(xml).toContain("<open_draft");
});
