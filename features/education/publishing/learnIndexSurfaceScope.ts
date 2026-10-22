// features/education/publishing/learnIndexSurfaceScope.ts
//
// Builds the `matrx-user/education-learn` scope for the PUBLIC index
// (/education/learn) from the published guides the server already rendered.
// Pure and fetch-free: the Surface Context window polls getScope.

import { xmlElement, xmlList, xmlText } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  createEducationLearnIndexScope,
  type LearnGuideLibraryRow,
} from "@/features/surfaces/manifests/education-learn.manifest";

/** First 25 cards and 220-char summaries keep the bundle inside ~4,000. */
const LIBRARY_MAX_ROWS = 25;
const SUMMARY_MAX = 220;

export function buildGuideLibraryXml(rows: LearnGuideLibraryRow[]): string {
  return xmlList(
    "study_guides",
    rows,
    (row) =>
      xmlElement(
        "guide",
        { href: row.href, subject: row.subject, updated: row.updated },
        [row.title, xmlText("summary", row.summary, { max: SUMMARY_MAX })],
      ),
    { maxRows: LIBRARY_MAX_ROWS, attrs: { total: rows.length } },
  );
}

export function buildLearnIndexScope(rows: LearnGuideLibraryRow[]): SurfaceScopePayload {
  return createEducationLearnIndexScope({
    view: "index",
    guide_count: rows.length,
    guide_library_xml: buildGuideLibraryXml(rows),
    guide_library: rows,
  });
}
