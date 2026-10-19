// record-view: none — a full-viewport spreadsheet editor; the editor fills the screen
"use client";

import { use } from "react";
import { useRecordOpened } from "@/features/file-actions/home/useRecordsOpened";
import { WorkbookRecord } from "@/features/workbooks/components/WorkbookRecord";

/** `/workbooks/[id]` — the whole workbook is `WorkbookRecord` (also the Board's Workbook tile). */
export default function WorkbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // "Last opened by me" on the Workbooks home.
  useRecordOpened("workbook", id);
  return <WorkbookRecord id={id} />;
}
