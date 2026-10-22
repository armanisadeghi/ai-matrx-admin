// features/pdf-extractor/intelligence-places.ts
//
// WHERE EACH PDF JOB RUNS — drawn on /intelligence/pdf.
// Proved against the files named below by
// features/mandates/feature-intelligence/__tests__/declared-places.test.ts.
// Every clean (upload, auto-clean, "Run AI clean") runs the per-page cleaner.

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import type { FeaturePlaces } from "@/features/mandates/feature-intelligence/types";

const K = MANDATE_KEYS;

export const PDF_PLACES: FeaturePlaces = {
  feature: "pdf",
  label: "PDF tools",
  roots: ["features/pdf-extractor", "features/pdf", "features/source-studio"],
  // The per-page cleaner is keyed under the rag family.
  extraPrefixes: ["rag"],
  places: [
    {
      id: "pdf-studio",
      label: "PDF studio",
      trigger: "Document actions: AI clean",
      // A document opens on the Source screen; the PDF tools (AI clean,
      // crop, templates) are the studio at `/tools/pdf-extractor?doc=<id>`.
      urlPattern: "/tools/pdf-extractor",
      mandateKeys: [K.rag__pdf_page_cleaner],
      sources: ["features/pdf-extractor/studio/PdfStudioHeaderControls.tsx"],
    },
  ],
};
