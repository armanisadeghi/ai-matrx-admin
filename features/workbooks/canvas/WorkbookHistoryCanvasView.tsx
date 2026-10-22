"use client";

/** The body of a `workbook-history` canvas tab: one workbook's versions, only while that workbook is open. */

import type { CanvasKindProps } from "@ai-matrx/canvas/react";
import { WorkbookHistoryViewer } from "@/features/workbooks/components/WorkbookHistoryViewer";
import { WORKBOOK_HISTORY_KIND, readHistoryTab } from "@ai-matrx/office/univer/history";
import { HistorySubjectGate } from "@/features/canvas/host/HistorySubjectGate";

export default function WorkbookHistoryCanvasView(props: CanvasKindProps) {
  const tab = readHistoryTab(props.data);
  if (!tab) return null;
  return (
    <HistorySubjectGate kind={WORKBOOK_HISTORY_KIND} noun="workbook" subjectId={tab.id} props={props}>
      {({ name, canRestore }) => (
        <WorkbookHistoryViewer workbookId={tab.id} editable={tab.editable} subjectName={name} canRestore={canRestore} />
      )}
    </HistorySubjectGate>
  );
}
