"use client";

/**
 * CENTER, once there is something to hold the new agent against (mode 2's approved answer, a
 * person's own example): the new agent's run and the original, compared INSIDE the center pane —
 * never as another page column. One row on top: what to show (Both · New · the original) and,
 * for Both, side by side or stacked. Phone: one at a time.
 */

import { useState } from "react";
import { Columns2, Rows2 } from "lucide-react";
import { Badge, Button, SegmentedControl } from "@ai-matrx/design-system/controls";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { cn } from "@/lib/utils";

export type CompareView = "both" | "new" | "original";
export type CompareLayout = "side" | "stacked";

/** The choices the compare row offers; on a phone, Both is not one of them. */
export function compareViews(originalLabel: string, phone: boolean): { value: CompareView; label: string }[] {
  const views: { value: CompareView; label: string }[] = [
    { value: "both", label: "Both" },
    { value: "new", label: "New agent" },
    { value: "original", label: originalLabel },
  ];
  return phone ? views.filter((v) => v.value !== "both") : views;
}

interface StudioCompareProps {
  /** The new agent's run (the shared chat runner). */
  run: React.ReactNode;
  /** What it is compared against, as the person approved or made it. */
  original: string;
  /** "Approved" / "Your example". */
  originalLabel: string;
  phone?: boolean;
}

export function StudioCompare({ run, original, originalLabel, phone = false }: StudioCompareProps) {
  const [view, setView] = useState<CompareView>(phone ? "new" : "both");
  const [layout, setLayout] = useState<CompareLayout>("side");
  const shown: CompareView = phone && view === "both" ? "new" : view;
  const effectiveLayout: CompareLayout = shown === "both" ? layout : "side";

  const originalPane = (
    <div className="h-full min-h-0 overflow-y-auto p-3" data-testid="studio-approved">
      <Badge className="mb-2">{originalLabel}</Badge>
      <RichContent level="full" imagePolicy="ai" source={original} />
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="studio-compare" data-view={shown} data-layout={layout}>
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        <SegmentedControl
          aria-label="Compare agent versions"
          value={shown}
          onValueChange={(v) => setView(v as CompareView)}
          data={compareViews(originalLabel, phone)}
        />
        {shown === "both" && (
          <Button
            variant="quiet"
            className="ml-auto"
            icon={layout === "side" ? <Rows2 /> : <Columns2 />}
            aria-label={layout === "side" ? "Stack them" : "Side by side"}
            data-testid="studio-compare-layout"
            onClick={() => setLayout((l) => (l === "side" ? "stacked" : "side"))}
          />
        )}
      </div>
      {/*
        ONE tree for every view: the run never moves to another parent, so switching views or
        layouts never remounts it (a remount would start a fresh, paid run).
      */}
      <div className={cn("flex min-h-0 flex-1", effectiveLayout === "side" ? "flex-row" : "flex-col")}>
        <div className={cn("min-h-0 min-w-0 flex-1", shown === "original" && "hidden")}>{run}</div>
        <div
          className={cn(
            "min-h-0 min-w-0 flex-1",
            effectiveLayout === "side" ? "border-l border-border" : "border-t border-border",
            shown === "new" && "hidden",
          )}
        >
          {originalPane}
        </div>
      </div>
    </div>
  );
}
