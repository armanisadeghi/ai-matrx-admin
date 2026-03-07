// MobileDock — Default shell dock. Pure Server Component. No props needed.
// Active state driven by CSS via .shell-root[data-pathname] + data-nav-href.

import MobileDockShell from "./MobileDockShell";
import MobileDockItems from "./MobileDockItems";

export default function MobileDock() {
  return (
    <MobileDockShell>
      <MobileDockItems />
    </MobileDockShell>
  );
}
