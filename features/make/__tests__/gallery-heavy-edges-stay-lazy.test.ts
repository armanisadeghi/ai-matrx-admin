// GALLERY-PERF-2 (2026-10-19): the public template pages ship only what renders above the fold. Two static edges used
// to drag whole features into every gallery page's first load: TemplateUseAction -> TemplateGallery (the install
// door, ~3.7 MB of source, for guests who only get a link) and TemplateLivePreview -> BookingPicker / the records-ui
// loader (reached from every gallery card through TemplateCards -> TemplateShowcase). Both now load on demand through
// one import() each. This fails if either comes back as a static import.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const GALLERY = join(__dirname, "..", "gallery");

/** Specifiers of static `import … from "x"` statements (type-only imports are erased and allowed). */
function staticImports(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/^import\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gms)) if (!m[1]) out.push(m[2]!);
  return out;
}

const RULES: Array<{ file: string; banned: RegExp }> = [
  { file: "TemplateUseAction.tsx", banned: /TemplateGallery$/ },
  { file: "TemplateLivePreview.tsx", banned: /(BookingPicker|recordsUiLazy|records-ui|records\/memory|TemplateLivePreviewImpl)$/ },
];

describe("public gallery pages keep heavy screens behind their on-demand edge", () => {
  it.each(RULES)("$file has no static import of the heavy screen", ({ file, banned }) => {
    const hits = staticImports(readFileSync(join(GALLERY, file), "utf8")).filter((s) => banned.test(s));
    expect(hits).toEqual([]);
  });

  it("the check sees a planted static edge", () => {
    expect(staticImports(`import { TemplatePreview } from "./TemplateGallery";`).filter((s) => /TemplateGallery$/.test(s))).toHaveLength(1);
    expect(staticImports(`import type { X } from "./TemplateGallery";`)).toHaveLength(0);
  });
});
