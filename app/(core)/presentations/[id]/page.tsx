"use client";

import { use } from "react";
import { PresentationEditor } from "@/features/presentations/components/PresentationEditor";
import { useRecordOpened } from "@/features/file-actions/home/useRecordsOpened";

/** `/presentations/[id]` — the editor takes the whole top (Google Slides' header); see PresentationEditor. */
export default function PresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // "Last opened by me" on the Presentations home.
  useRecordOpened("presentation", id);
  return <PresentationEditor presentationId={id} />;
}
