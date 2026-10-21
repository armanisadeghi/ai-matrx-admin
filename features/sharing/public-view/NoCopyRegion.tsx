"use client";

// features/sharing/public-view/NoCopyRegion.tsx — "Restrict copying data" on a shared view link (lane CLOSE-SHARE).
//
// The maker of a view link can stop people who open it from copying its data (custom.set_view_share_link_copy;
// the read door answers restrict_copy). Inside this region nothing can be selected, copied, cut or dragged, and the
// right-click menu is off. The rows are still drawn by the server; this is the same promise Airtable makes, not a vault.

import type { ReactNode, SyntheticEvent } from "react";

function stop(e: SyntheticEvent) {
  e.preventDefault();
}

export function NoCopyRegion({ children }: { children: ReactNode }) {
  return (
    <div
      className="select-none [-webkit-touch-callout:none]"
      onCopy={stop}
      onCut={stop}
      onContextMenu={stop}
      onDragStart={stop}
      onSelect={stop}
      data-public-view-no-copy=""
    >
      {children}
    </div>
  );
}
