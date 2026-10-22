"use client";

// The Sidebar's two reserved places for custom layouts (custom-experience PLAN §5.5):
//   • WhatsNewSlot — at the top: the What's new offers (`WhatsNewOffers`, the same list and actions as the
//     launchpad band): "New: X" — Add / Dismiss, and "Your organization updated its menu" — Review / Dismiss.
//     Only for a person with her own layout; never a modal, never injected into her tree.
//   • EditSidebarRow — at the bottom of the menu: "Edit sidebar…".
import { PanelLeft } from "lucide-react";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { WhatsNewOffers } from "@/features/shell/shell-layout/editor/WhatsNewOffers";

export function EditSidebarRow() {
  const open = useOpenShellLayoutEditor();
  return (
    <button type="button" title="Edit sidebar" className="shell-nav-item shell-tactile-subtle" onClick={() => open({ region: "sidebar" })} data-shell-edit-sidebar>
      <span className="shell-nav-icon text-muted-foreground">
        <PanelLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      </span>
      <span className="shell-nav-label text-muted-foreground">Edit sidebar…</span>
    </button>
  );
}

export function WhatsNewSlot() {
  return <WhatsNewOffers placement="sidebar" />;
}
