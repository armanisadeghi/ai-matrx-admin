"use client";

/**
 * SidebarWatchAiToggle — "Watch AI" in the sidebar's admin section (Arman, 2026-10-13:
 * "I get a icon that lights up orange in my sidebar menu. And if I click on it, I see
 * the window panel").
 *
 * Present only for people who may watch (`useCanWatchAi`: system admins with debug mode
 * on). The Eye glyph itself is ORANGE while an AI run on this page is still working
 * (`selectLiveWatchableRuns` — keyed by server run, finished runs never count), gray
 * otherwise. Click opens Watch AI on the live run; with several, the window lists them.
 * Orange is deliberately not the Error Inspector's amber dot.
 *
 * AUTO-WATCH lives in `features/ai-watch/AutoWatch.tsx` (always mounted for admins), never here.
 */

import { Eye } from "lucide-react";
import { selectLivePageAiRuns } from "@/features/ai-watch/page-ai-runs";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCanWatchAi } from "@/features/ai-watch/useCanWatchAi";
import { useWatchAiRun } from "@/features/overlays/definitions/aiWatchWindow.overlay";

export default function SidebarWatchAiToggle() {
  const canWatch = useCanWatchAi();
  const live = useAppSelector(selectLivePageAiRuns);
  const watch = useWatchAiRun();
  const count = live.length;

  // Drawn from the server's HTML when it may watch (CD-PERF-01): the store starts with the saved debug
  // switch (lib/redux/store.ts seededDebugMode), so the server and the first commit agree and the row
  // is in the footer from the first paint instead of appearing (and moving the footer) later.
  if (!canWatch) return null;

  // The page's one Watch AI window; with one live run, that run is selected.
  const open = () => watch({ requestId: count === 1 ? live[0].requestIds.at(-1) ?? null : null });

  return (
    <button
      type="button"
      onClick={open}
      className="shell-nav-item shell-tactile"
      aria-label={count ? `Watch AI (${count} running)` : "Watch AI"}
      title={count ? "Watch AI: an AI run is working on this page" : "Watch AI: this page's AI runs"}
      data-testid="sidebar-watch-ai-toggle"
      data-live={count > 0 ? "true" : "false"}
    >
      <span className="shell-nav-icon">
        <Eye
          size={18}
          strokeWidth={1.75}
          className={cn(count > 0 ? "text-orange-500" : "text-muted-foreground")}
        />
      </span>
      <span className="shell-nav-label">Watch AI</span>
      {count > 0 ? (
        <span className="shell-nav-badge-expanded rounded-full bg-orange-500/15 px-1.5 type-meta font-semibold tabular-nums text-orange-600 dark:text-orange-400">
          {count}
        </span>
      ) : null}
    </button>
  );
}
