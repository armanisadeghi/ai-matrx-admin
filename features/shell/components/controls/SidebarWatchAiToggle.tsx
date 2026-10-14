"use client";

/**
 * SidebarWatchAiToggle — "Watch AI" in the sidebar's admin section (Arman, 2026-10-13:
 * "I get a icon that lights up orange in my sidebar menu. And if I click on it, I see
 * the window panel").
 *
 * Present only for people who may watch (`useCanWatchAi`: system admins with debug mode
 * on). The Eye glyph itself is ORANGE while an AI run on this page is still working
 * (`selectLiveWatchableRuns` — keyed by server run, finished runs never count), grey
 * otherwise. Click opens Watch AI on the live run; with several, the window lists them.
 * Orange is deliberately not the Error Inspector's amber dot.
 *
 * AUTO-WATCH (VISION Part 18 item 5): with debug mode on, every automated AI call this page
 * starts — a workflow step's mandate run (bound to its server run) — opens the page's Watch AI
 * window by itself, once per run; the window follows the newest live run.
 */

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { isAutomatedRun, selectLivePageAiRuns } from "@/features/ai-watch/page-ai-runs";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCanWatchAi } from "@/features/ai-watch/useCanWatchAi";
import { useWatchAiRun } from "@/features/overlays/openers/aiWatchWindow";

export default function SidebarWatchAiToggle() {
  const canWatch = useCanWatchAi();
  const live = useAppSelector(selectLivePageAiRuns);
  const watch = useWatchAiRun();
  const count = live.length;

  // Post-hydration gate, so this footer control never swaps DOM between SSR and first commit.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Auto-watch: a new automated AI run opens (or refreshes) the page's window, once per run.
  const autoOpened = useRef(new Set<string>());
  const automatedKeys = live.filter(isAutomatedRun).map((r) => r.key).join(",");
  useEffect(() => {
    if (!canWatch || !automatedKeys) return;
    const fresh = automatedKeys.split(",").filter((k) => !autoOpened.current.has(k));
    if (!fresh.length) return;
    for (const k of fresh) autoOpened.current.add(k);
    watch({ pageRuns: true, instanceId: "ai-watch:page" });
  }, [canWatch, automatedKeys, watch]);

  if (!hydrated || !canWatch) return null;

  const open = () =>
    watch({
      // One live run: open it. Several (or none): the page's runs window lists them.
      requestId: count === 1 ? live[0].requestIds.at(-1) ?? null : null,
      pageRuns: count !== 1,
      instanceId: count === 1 ? `ai-watch:${live[0].key}` : "ai-watch:page",
      label: count === 1 ? (live[0].mandateRun?.mandate_key ?? null) : null,
    });

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
