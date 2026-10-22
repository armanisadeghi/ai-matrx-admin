/**
 * The notes sidebar's filter row fits a 244px column (the new app frame's sidebar, 2026-10-22).
 * The shared org filter collapses to its icon with `@max-3xl/list:` — a container query that
 * matches only inside an element declared `@container/list`. Without one it never fires and the
 * label + chevron pushed the row past the column. Proven red before the row declared it.
 */
import fs from "fs";
import path from "path";

const src = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

it("the org filter's `list` container query has its container: the notes filter row", () => {
  expect(src("lib/entity-list/components/EntityOrgFilter.tsx")).toContain("@max-3xl/list:");
  const sidebar = src("features/notes/components/NoteSidebar.tsx");
  const filter = sidebar.indexOf("<EntityOrgFilter");
  expect(filter).toBeGreaterThan(0);
  // The nearest row opened before the filter is the `list` container.
  const rowOpen = sidebar.lastIndexOf('<div className="@container/list ', filter);
  expect(rowOpen).toBeGreaterThan(0);
  const between = sidebar.slice(rowOpen, filter);
  const opens = (between.match(/<div\b/g) ?? []).length;
  const closes = (between.match(/<\/div>/g) ?? []).length;
  expect(opens - closes).toBeGreaterThanOrEqual(1);
});
