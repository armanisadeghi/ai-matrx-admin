"use client";

/**
 * SidebarBuilderToggle — "Builder" in the sidebar's admin section. Opens the Builder panel
 * (features/builder-panel) for the current page, and lights up with a dot + count when this
 * page has published entries. Admins only (selectIsAdminDebugger), like the Error Inspector.
 * It records only while debug mode is on (useBuilderRecording); with debug off the count stays 0.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { selectIsOverlayOpen } from "@/lib/redux/slices/overlaySlice";
import { selectBuilderFeedList, feedsForRoute } from "@/features/builder-panel/selectors";
import { useBuilderRecording } from "@/features/builder-panel/hooks/useBuilderRecording";
import { BUILDER_PANEL_OVERLAY_ID, useToggleBuilderPanel } from "@/features/overlays/openers/builderPanelWindow";

export default function SidebarBuilderToggle() {
  const isAdmin = useAppSelector(selectIsAdminDebugger) ?? false;
  const isOpen = useAppSelector((state) => selectIsOverlayOpen(state, BUILDER_PANEL_OVERLAY_ID));
  const feeds = useAppSelector(selectBuilderFeedList);
  const pathname = usePathname();
  const toggle = useToggleBuilderPanel();
  const count = feedsForRoute(feeds, pathname).reduce((n, f) => n + f.order.length, 0);

  // Post-hydration gate, so this footer control never swaps DOM between SSR and first commit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Every page keeps its own requests for the Builder panel while debug mode is on.
  useBuilderRecording();

  if (!hydrated || !isAdmin) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("shell-nav-item shell-tactile", isOpen && "shell-nav-item-active")}
      aria-pressed={isOpen}
      aria-label={count ? `Open Builder (${count} entries on this page)` : "Open Builder"}
      title="Builder: everything this page has"
      data-testid="sidebar-builder-toggle"
    >
      <span className="shell-nav-icon">
        <span className="relative inline-flex">
          <Blocks size={18} strokeWidth={1.75} />
          {count > 0 ? (
            <span className="shell-nav-badge-collapsed absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          ) : null}
        </span>
      </span>
      <span className="shell-nav-label">Builder</span>
      {count > 0 ? (
        <span className="shell-nav-badge-expanded rounded-full bg-primary/15 px-1.5 type-meta font-semibold tabular-nums text-primary">
          {count}
        </span>
      ) : null}
    </button>
  );
}
