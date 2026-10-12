"use client";

// features/research/components/reader/ResearchRecordContent.tsx
//
// A saved research record's text rendered in place (an analysis card, a
// keyword synthesis, a tag consolidation, an older version) WITH the reading
// set: RichDocument names the record, so highlight / comment / suggest / link
// work right here and the Notes & comments dock opens beside it. The full
// reader (outline + panel) is ResearchRecordReader; this is the inline twin.

import { RichDocument } from "@ai-matrx/rich-content/rich-document/RichDocument";
import type { RichDocumentActionsProp } from "@ai-matrx/rich-content/rich-document/types";
import { useRegisterInlineResearchRecord } from "../../agent-context/readingRecord";

export type ResearchRecordToken = "research_synthesis" | "research_analysis" | "research_document";

export function ResearchRecordContent({
  token,
  id,
  title,
  body,
  href,
  actions,
}: {
  token: ResearchRecordToken;
  id: string;
  title: string;
  body: string;
  /** Where the record opens (used in @-mention notices). */
  href?: string;
  actions?: RichDocumentActionsProp;
}) {
  useRegisterInlineResearchRecord({ type: token, id, title });
  return (
    <RichDocument
      imagePolicy="ai"
      content={body}
      source={{ type: "raw", title }}
      annotationRecord={{ token, id, title, href }}
      actions={actions}
      actionsVariant="icon-only"
      actionsPosition="top-right"
      actionsBehavior="hover-only"
    />
  );
}
