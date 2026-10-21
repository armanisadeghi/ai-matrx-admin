/**
 * Review 4 F16: a note holding 2,696 characters of blocks read "20 words · 94 chars". The prose
 * count is right (blocks are not words), but the line must also say what it left out.
 */
import fs from "node:fs";
import path from "node:path";
import { measureText } from "@ai-matrx/rich-content/editor/core/text-metrics";

describe("the notes status bar counts the blocks it leaves out of the prose", () => {
  it("measureText reports the blocks beside the prose", () => {
    const m = measureText(["A short line.", "", "```chart", '{ "type": "pie", "data": [] }', "```", "", "| a | b |", "|---|---|", "| 1 | 2 |"].join("\n"));
    expect(m.words).toBeGreaterThan(0);
    expect(m.islands).toBeGreaterThanOrEqual(1);
  });

  it("the footer shows them", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../components/NoteStatsFooter.tsx"), "utf8");
    expect(src).toMatch(/metrics\.islands > 0/);
    expect(src).toMatch(/\{blocks && <> · \{blocks\}<\/>\}/);
  });
});
