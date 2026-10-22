// The live create page (/podcast/studio/create → GeneratorForm) reads no source
// in the browser: its tiles are what a person types, plus the one Source input
// whose picks go as a `source_set` the server resolves. A tile that resolves a
// web page / YouTube / audio / file URL client-side must never come back here.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GENERATOR_SOURCE_OPTIONS, SOURCE_INPUT_OPTION } from "../constants";

const FORM = readFileSync(join(__dirname, "../components/GeneratorForm.tsx"), "utf8");

describe("the live podcast create page uses the one Source input", () => {
  it("offers only typed text and the Source input", () => {
    expect(GENERATOR_SOURCE_OPTIONS.map((o) => o.control)).toEqual(["text", "text", "text", "sources"]);
    expect(GENERATOR_SOURCE_OPTIONS.at(-1)).toBe(SOURCE_INPUT_OPTION);
  });

  it("renders the canonical SourceInput and sends a source_set", () => {
    expect(FORM).toContain("<SourceInput");
    expect(FORM).toContain("body.source_set = sourceSet.toSourceSet()");
  });

  it("lets typed words and picked Sources combine, with the editable text of the Sources", () => {
    expect(FORM).toContain("useResolvedSourceText(sourceSet");
    // An edit becomes its own Source (landed through /sources/land) and the request
    // points at it: Source text never rides in input_data.
    expect(FORM).toContain("landEditedSourceText(");
    expect(FORM).toContain("edited_from: saved.editedFrom");
    expect(FORM).not.toMatch(/source_text_supplied|input_data\s*=\s*[^;\n]*(?:sourcePreview|edited)/);
    expect(FORM).toContain("Text from your sources");
  });

  it("never resolves a source in the browser", () => {
    expect(FORM).not.toMatch(/SourceResolverPanel|useSourceResolvers|file_urls|\bSOURCE_OPTIONS\b/);
  });
});
