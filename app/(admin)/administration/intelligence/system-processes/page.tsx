// Intelligence › System processes: the durable queue behind platform AI work nobody sees.
"use client";

import { Suspense } from "react";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { SystemProcessesBoard } from "@/features/system-processes/SystemProcessesBoard";

export default function SystemProcessesPage() {
  return (
    <>
      <RecordPageHeader record={{ name: "System processes" }} />
      <div className="flex h-full min-h-0 flex-col p-3">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-md bg-muted/50" />}>
          <SystemProcessesBoard />
        </Suspense>
      </div>
    </>
  );
}
