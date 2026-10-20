// ADV6-VERIFY #2: searching "design system" showed 12 cards while the rail still read "All templates 183" and no count
// appeared. RED on the prior bytes: the gallery never called templateResultCount and had no result-count line.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "../TemplateGallery.tsx"), "utf8");

it("the rail's All count and the heading count come from the search the cards come from", () => {
  expect(src).toContain("templateResultCount(needle, matching.length");
  expect(src).toContain("data-template-result-count");
  expect(src).toMatch(/count=\{allCount\}/);
  expect(src).not.toMatch(/label="All templates"\s+count=\{cards\?\.length\}/);
});
