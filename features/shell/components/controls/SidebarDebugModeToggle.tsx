"use client";

/**
 * SidebarDebugModeToggle — the admin debug switch, one press in the sidebar footer.
 * On: the bug and an "On" tag turn the success colour, and debug-gated tools (Watch AI,
 * debug panels) appear. The admin indicator lives in the Production menu (SidebarEnvToggle).
 */

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminDebugger } from "@/lib/redux/slices/userSlice";
import { selectIsDebugMode, toggleDebugMode } from "@/lib/redux/preferences/adminDebugSlice";

export default function SidebarDebugModeToggle() {
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsSuperAdminDebugger) ?? false;
  const isOn = Boolean(useAppSelector(selectIsDebugMode));

  // Post-hydration gate, so this footer control never swaps DOM between SSR and first commit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated || !isAdmin) return null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={() => dispatch(toggleDebugMode())}
      className="shell-nav-item shell-tactile"
      aria-label={isOn ? "Turn debug mode off" : "Turn debug mode on"}
      title={isOn ? "Debug mode is on" : "Debug mode is off"}
      data-testid="sidebar-debug-mode-toggle"
    >
      <span className={cn("shell-nav-icon", isOn && "shell-nav-icon-on")}>
        <span className="relative inline-flex">
          <Bug size={18} strokeWidth={1.75} />
          {isOn ? (
            <span className="shell-nav-badge-collapsed absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success" />
          ) : null}
        </span>
      </span>
      <span className="shell-nav-label">Debug mode</span>
      <span
        className={cn(
          "shell-nav-badge-expanded rounded-full px-1.5 type-meta font-semibold",
          isOn ? "bg-success/15 text-success" : "text-muted-foreground",
        )}
      >
        {isOn ? "On" : "Off"}
      </span>
    </button>
  );
}
