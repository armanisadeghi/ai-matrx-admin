// Intelligence › System processes: the durable queue behind platform AI work nobody sees.
"use client";

import { Suspense } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { SystemProcessesBoard } from "@/features/system-processes/SystemProcessesBoard";

export default function SystemProcessesPage() {
  return (
    <>
      <RecordPageHeader level={{ name: "System processes" }} />
      <div className="flex h-full min-h-0 flex-col p-3">
        <Suspense fallback={<RegionSkeleton shape="rows" count={8} aria-label="Reading system processes" />}>
          <SystemProcessesBoard />
        </Suspense>
      </div>
    </>
  );
}
