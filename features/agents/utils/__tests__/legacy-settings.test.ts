import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeLegacySettings } from "../legacy-settings";

describe("a Builder save converts legacy settings keys and says so (L46)", () => {
  it("image_size becomes resolution", () => {
    const r = normalizeLegacySettings({ image_size: "1k", temperature: 0.2 }, null);
    expect(r.settings).toEqual({ resolution: "1k", temperature: 0.2 });
    expect(r.notes.join(" ")).toMatch(/image_size/);
  });

  it("ai_model_id becomes model_id", () => {
    expect(normalizeLegacySettings({ ai_model_id: "m1" }, null).settings).toEqual({ model_id: "m1" });
  });

  it("json_schema and output_schema in settings fill an empty output schema column, never overwrite", () => {
    const schema = { type: "object", properties: {} };
    const filled = normalizeLegacySettings({ json_schema: { name: "x", schema } }, null);
    expect(filled.settings).toEqual({});
    expect(filled.outputSchema).toEqual(schema);
    const kept = normalizeLegacySettings({ output_schema: schema }, { type: "object" });
    expect(kept.outputSchema).toBeNull();
    expect(kept.settings).toEqual({});
    expect(kept.notes.join(" ")).toMatch(/wins/);
  });

  it("response_mime_type json becomes json_object unless an output schema exists", () => {
    expect(
      normalizeLegacySettings({ response_mime_type: "application/json" }, null).settings,
    ).toEqual({ response_format: { type: "json_object" } });
    expect(
      normalizeLegacySettings({ response_mime_type: "application/json" }, { type: "object" }).settings,
    ).toEqual({});
  });

  it("clean settings pass through untouched with no notes", () => {
    const r = normalizeLegacySettings({ temperature: 1 }, null);
    expect(r.settings).toEqual({ temperature: 1 });
    expect(r.notes).toEqual([]);
  });
});

describe("every Builder write of settings goes through the normalizer", () => {
  const src = readFileSync(
    join(__dirname, "../../redux/builder-write.thunks.ts"),
    "utf8",
  );
  it("saveAgent and saveAgentField both prepare settings before the write and announce the notes", () => {
    expect(src.match(/prepareSettingsWrite\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/announceSettingsNotes\(/);
  });
});
