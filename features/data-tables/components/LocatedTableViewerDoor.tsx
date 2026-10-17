"use client";

/**
 * THE FRONT DOOR to the table opened by id (`LocatedTableViewer`) for hosts that load before any
 * table is shown — the rich-content host's bindings. `LocatedTableViewer` mounts the whole table
 * page and with it `@ai-matrx/records-ui` (~2.7 MB unpacked); held statically by the host, the
 * person's FIRST KEYSTROKE in a composer (which warms the rich-content host) pulled it in on
 * /chat/new with no table anywhere. Behind this door it loads only when a table is actually
 * shown, and the box it will fill holds a table skeleton meanwhile (same flex footprint, so the
 * swap moves nothing). ONE edge (React.lazy inside the host's already-gated graph — the
 * Fragmentation Law's cheap shape); hosts that are themselves a table surface keep the static import.
 */
import { lazy, Suspense, type ComponentProps } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";

const LocatedTableViewer = lazy(() => import("./LocatedTableViewer"));

export function LocatedTableViewerDoor(props: ComponentProps<typeof LocatedTableViewer>) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden p-2" data-record-store-table={props.tableId}>
          <RegionSkeleton shape="rows" count={8} aria-label="Loading table" />
        </div>
      }
    >
      <LocatedTableViewer {...props} />
    </Suspense>
  );
}

export default LocatedTableViewerDoor;
