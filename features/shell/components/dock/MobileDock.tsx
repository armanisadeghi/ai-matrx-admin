// MobileDock — Default shell dock. Pure Server Component. No props needed.
// Active state driven by CSS via .shell-root[data-pathname] + data-nav-href.

import MobileDockShell from "./MobileDockShell";
import MobileDockItems from "./MobileDockItems";
import MobileDockVoiceButton from "./MobileDockVoiceButton";

export default function MobileDock() {
  return (
    <MobileDockShell>
      <MobileDockItems />
      <MobileDockVoiceButton />
    </MobileDockShell>
  );
}
