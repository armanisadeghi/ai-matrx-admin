"use client";

/**
 * CENTER, once there is something to hold the new agent against (mode 2's approved answer, a
 * person's own example): the new agent's run and the original, compared INSIDE the center pane —
 * never as another page column. One bar on top: what to show (Both · New agent · the original),
 * for Both side by side or stacked, and the host's own controls on the right ("Next reply on").
 * The pane measures itself: below `STUDIO_COMPARE_SIDE_BY_SIDE_PX` (a phone, or Watch AI open
 * beside the Studio) Both is not offered, so two answers never squeeze into narrow columns.
 */

import { useState } from "react";
import { Columns2, Rows2 } from "lucide-react";
import { Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { cn } from "@/lib/utils";
import { STUDIO_COMPARE_SIDE_BY_SIDE_PX } from "../studio-layout";
import { useMeasuredWidth } from "../use-width";
import { PaneBar } from "./PaneBar";

export type CompareView = "both" | "new" | "original";
export type CompareLayout = "side" | "stacked";

/** The choices the compare bar offers; in a narrow pane (or a phone), Both is not one of them. */
export function compareViews(originalLabel: string, narrow: boolean): { value: CompareView; label: string }[] {
  const views: { value: CompareView; label: string }[] = [
    { value: "both", label: "Both" },
    { value: "new", label: "New agent" },
    { value: "original", label: originalLabel },
  ];
  return narrow ? views.filter((v) => v.value !== "both") : views;
}

/** A measured width under the side-by-side minimum is narrow; an unmeasured (0/null) one is not. */
export function compareIsNarrow(width: number | null, phone: boolean): boolean {
  return phone || (width !== null && width > 0 && width < STUDIO_COMPARE_SIDE_BY_SIDE_PX);
}

interface StudioCompareProps {
  /** The new agent's run (the shared chat runner). */
  run: React.ReactNode;
  /** What it is compared against, as the person approved or made it. */
  original: string;
  /** "Approved" / "Your example". */
  originalLabel: string;
  phone?: boolean;
  /** The host's quiet controls, at the bar's right end. */
  toolbar?: React.ReactNode;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 px-3 pt-2 text-xs font-medium text-muted-foreground">{children}</div>;
}

export function StudioCompare({ run, original, originalLabel, phone = false, toolbar }: StudioCompareProps) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();
  const narrow = compareIsNarrow(width, phone);
  const [view, setView] = useState<CompareView>("both");
  const [layout, setLayout] = useState<CompareLayout>("side");
  const shown: CompareView = narrow && view === "both" ? "new" : view;
  const effectiveLayout: CompareLayout = shown === "both" ? layout : "side";
  const both = shown === "both";

  return (
    <div ref={ref} className="flex h-full min-h-0 flex-col" data-testid="studio-compare" data-view={shown} data-layout={layout}>
      <PaneBar>
        <SegmentedControl
          aria-label="Compare agent versions"
          value={shown}
          onValueChange={(v) => setView(v as CompareView)}
          data={compareViews(originalLabel, narrow)}
        />
        {both && (
          <Button
            variant="quiet"
            icon={layout === "side" ? <Rows2 /> : <Columns2 />}
            aria-label={layout === "side" ? "Stack them" : "Side by side"}
            title={layout === "side" ? "Stack them" : "Side by side"}
            data-testid="studio-compare-layout"
            onClick={() => setLayout((l) => (l === "side" ? "stacked" : "side"))}
          />
        )}
        {toolbar ? <div className="ml-auto flex min-w-0 items-center">{toolbar}</div> : null}
      </PaneBar>
      {/*
        ONE tree for every view: the run never moves to another parent, so switching views or
        layouts never remounts it (a remount would start a fresh, paid run).
      */}
      <div className={cn("flex min-h-0 flex-1", effectiveLayout === "side" ? "flex-row" : "flex-col")}>
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", shown === "original" && "hidden")}>
          {both && <Caption>New agent</Caption>}
          <div className="min-h-0 flex-1">{run}</div>
        </div>
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            effectiveLayout === "side" ? "border-l border-border" : "border-t border-border",
            shown === "new" && "hidden",
          )}
          data-testid="studio-approved"
        >
          {both && <Caption>{originalLabel}</Caption>}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-2">
            <div className="mx-auto max-w-[44rem]">
              <RichContent level="full" imagePolicy="ai" source={original} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
