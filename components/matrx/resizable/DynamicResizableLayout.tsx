"use client";

import React from "react";
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from "@/components/ui/resizable";
import { pct } from "@/components/matrx/resizable/pct";

interface PanelConfig {
  content: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
}

interface DynamicResizableLayoutProps {
  panels: PanelConfig[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

/**
 * Uncontrolled split panes; config numbers are percentages. v4 applies `defaultSize` on mount only —
 * if defaults change from state, remount this tree (e.g. `key` on the parent); see SchemaVisualizerLayout.
 */
export function DynamicResizableLayout({
  panels,
  direction = "horizontal",
  className = "",
}: DynamicResizableLayoutProps) {
  const totalDeclared = panels.reduce(
    (sum, panel) => sum + (panel.defaultSize ?? 0),
    0,
  );
  if (totalDeclared > 100) {
    console.warn(
      "Total default sizes exceed 100%. Panels will be adjusted proportionally.",
    );
  }

  const defaultSizes = panels.map((panel, _index, arr) => {
    if (panel.defaultSize != null) return panel.defaultSize;
    const withDefaults = arr.filter((p) => p.defaultSize != null);
    const remainingPanels = arr.length - withDefaults.length;
    const remainingSize =
      100 - withDefaults.reduce((sum, p) => sum + (p.defaultSize ?? 0), 0);
    return remainingSize / remainingPanels;
  });

  return (
    <div className={`h-full min-h-0 overflow-hidden ${className}`}>
      <ResizablePanelGroup orientation={direction} className="h-full min-h-0">
        {panels.map((panel, index) => (
          <React.Fragment key={index}>
            <ResizablePanel
              id={`dyn-panel-${index}`}
              defaultSize={pct(defaultSizes[index])}
              minSize={pct(panel.minSize ?? 10)}
              maxSize={pct(panel.maxSize ?? 90)}
              collapsible={panel.collapsible}
              className="flex min-h-0"
            >
              <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 overflow-auto">
                  {panel.content}
                </div>
              </div>
            </ResizablePanel>
            {index < panels.length - 1 && <ResizableHandle />}
          </React.Fragment>
        ))}
      </ResizablePanelGroup>
    </div>
  );
}
