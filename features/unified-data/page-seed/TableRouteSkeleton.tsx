// features/unified-data/page-seed/TableRouteSkeleton.tsx — lane SSR-ROWS-3
//
// THE TABLE ROUTE'S FIRST FRAME (lane STABLE-TABLES): the padding the table page sits in
// (`UnifiedDataTablePage`) and the package's page skeleton, given the table's id so a return visit
// paints the rows that table showed last time. One component, drawn by the route's `loading.tsx`
// AND by the table page while it waits for its first reads, so the two frames are the same box.

import { RecordsSkeleton, TablePageSkeleton } from "@ai-matrx/records-ui/skeleton";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";

import RouteHeader from "@/features/shell/components/header/RouteHeader";

/**
 * THE TABLE ROUTE'S HEADER BEFORE THE TABLE IS OPEN: Back and "Data", in the route header the table
 * page will draw (a fallback, so the page's own header takes over the moment it mounts). Drawn by the
 * skeleton, so it is in the SERVER's HTML (CLOSE-PERF, CD-PERF-01): the route header's row, with the
 * table page's action cluster reserved, is in the header from the first paint, and the shell decides
 * whether to fold its own controls before anything is drawn — at 768px the shell folded a second
 * later, when the table page's header first mounted, and its controls moved (CLS 0.003).
 */
export function DataRouteFallbackHeader() {
  return (
    <RouteHeader
      fallback
      left={
        <>
          <ChevronLeftTapButton variant="transparent" href="/data" ariaLabel="Back to your tables" />
          <span className="truncate px-1.5 text-sm font-medium text-foreground">Data</span>
        </>
      }
    />
  );
}

export function TableRouteSkeleton({ tableId }: { tableId?: string | null }) {
  return (
    <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
      <DataRouteFallbackHeader />
      <div className="h-full overflow-y-auto px-3 pb-2 pt-1">
        <TablePageSkeleton {...(tableId ? { tableId } : {})} />
      </div>
    </div>
  );
}

/**
 * A RECORD PAGE'S FIRST FRAME IS A RECORD (lane STABLE-TABLES): the padding `UnifiedRecordPage` sits
 * in and the package's record skeleton. Drawn by the record route's `loading.tsx` AND by the record
 * page while it waits for its first reads.
 */
export function RecordRouteSkeleton() {
  return (
    <div className="h-full overflow-y-auto pt-[var(--shell-header-h)]">
      <div className="mx-auto w-full max-w-3xl p-4">
        <RecordsSkeleton layout="record" embedded />
      </div>
    </div>
  );
}
