"use client";

/** The body of a `document-history` canvas tab: one document's versions, only while that document is open. */

import type { CanvasKindProps } from "@ai-matrx/canvas/react";
import { DocumentHistoryViewer } from "@/features/documents/components/DocumentHistoryViewer";
import { DOCUMENT_HISTORY_KIND, readHistoryTab } from "@ai-matrx/office/univer/history";
import { HistorySubjectGate } from "@/features/canvas/host/HistorySubjectGate";

export default function DocumentHistoryCanvasView(props: CanvasKindProps) {
  const tab = readHistoryTab(props.data);
  if (!tab) return null;
  return (
    <HistorySubjectGate kind={DOCUMENT_HISTORY_KIND} noun="document" subjectId={tab.id} props={props}>
      {({ name, canRestore }) => (
        <DocumentHistoryViewer documentId={tab.id} editable={tab.editable} subjectName={name} canRestore={canRestore} />
      )}
    </HistorySubjectGate>
  );
}
