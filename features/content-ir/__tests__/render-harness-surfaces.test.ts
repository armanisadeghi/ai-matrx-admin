/**
 * Every Shape harness surface renders inside `KindRenderHarness`, so a generic
 * frame there never files a reader sighting — and ONLY those subtrees do (the
 * context is scoped; the package test `generic-floor-harness-scope` proves a
 * block outside the harness on the same page still files). Reviewer finding
 * 2026-10-14: the Studio's Test / Instances tabs were not covered.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HARNESS_SURFACES = [
  "features/content-ir/render-paths/KindRenderPaths.tsx",
  "features/content-ir/admin/KindDetailClient.tsx",
  "app/(core)/shapes/(workspace)/layout.tsx",
];

it.each(HARNESS_SURFACES)("%s renders inside <KindRenderHarness>", (rel) => {
  const src = readFileSync(join(process.cwd(), rel), "utf8");
  expect(src).toMatch(/from "@ai-matrx\/rich-content\/kinds\/react\/render-harness"/);
  expect(src).toMatch(/<KindRenderHarness>/);
});

it("the incident host carries no page-wide harness switch", () => {
  const src = readFileSync(
    join(process.cwd(), "features/content-ir/react/db-component/kindComponentIncident.ts"),
    "utf8",
  );
  expect(src).not.toMatch(/harnessDepth|enterKindRenderHarness/);
});
