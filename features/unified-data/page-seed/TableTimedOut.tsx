"use client";

// features/unified-data/page-seed/TableTimedOut.tsx — lane AT-FIX-G4
//
// THE TABLE ROUTE'S FIRST FRAME, WHEN THE STORE TIMED OUT: the shared timeout sentence and Try again,
// drawn INSIDE the skeleton's own box. The skeleton stays mounted (still, not pulsing, hidden from
// assistive tech) so the page's footprint is exactly what it was while it waited, and the notice sits
// over it: nothing moves when the sentence lands, and nothing moves when Try again brings the skeleton back.

import type { ReactNode } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";

export function TableTimedOut({ skeleton, onRetry }: { skeleton: ReactNode; onRetry: () => void }) {
  return (
    <div className="relative h-full" data-table-timed-out="">
      <div aria-hidden="true" inert className="h-full [&_*]:animate-none!">
        {skeleton}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
        <div className="pointer-events-auto w-full max-w-md rounded-lg border bg-background shadow-sm">
          <ErrorNotice size="compact" error={{ code: "timed_out" }} onRetry={onRetry} operation="open table page" />
        </div>
      </div>
    </div>
  );
}
