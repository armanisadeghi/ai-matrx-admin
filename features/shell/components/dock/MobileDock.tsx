// MobileDock — Default shell dock. Pure Server Component.
// Active state driven by CSS via .shell-root[data-pathname] + data-nav-href.

import MobileDockShell from "./MobileDockShell";
import ShellDockItems from "./ShellDockItems";
import MobileDockVoiceButton from "./MobileDockVoiceButton";
import { CommandBarDockButton } from "@/features/knowledge/command-bar/OpenCommandBarButtons";

export default function MobileDock({
  isAuthenticated,
}: {
  isAuthenticated: boolean;
}) {
  return (
    <MobileDockShell>
      <CommandBarDockButton isAuthenticated={isAuthenticated} />
      <ShellDockItems isAuthenticated={isAuthenticated} />
      <MobileDockVoiceButton />
    </MobileDockShell>
  );
}
