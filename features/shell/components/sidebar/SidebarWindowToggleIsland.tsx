"use client";

// SidebarWindowToggleIsland — Client island for the lazy-loaded window toggle.
// The underlying SidebarWindowToggle ships a ~1,400-line popover body (window
// manager + Tools grid + icons). It's loaded on the client only so that bulk
// doesn't end up in the server bundle or the initial client payload. The
// trigger skeleton renders immediately so layout doesn't shift.
//
// `ssr: false` with next/dynamic is only allowed inside Client Components,
// which is why this island exists — the parent Sidebar is a Server Component.

import dynamic from "next/dynamic";

const SidebarWindowToggle = dynamic(
  () => import("@/features/window-panels/components/SidebarWindowToggle"),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="shell-nav-item shell-tactile"
        aria-label="Manage floating windows"
        title="Windows"
        disabled
      >
        <span className="shell-nav-icon" aria-hidden />
        <span className="shell-nav-label">Windows</span>
      </button>
    ),
  },
);

export default function SidebarWindowToggleIsland() {
  return <SidebarWindowToggle />;
}
