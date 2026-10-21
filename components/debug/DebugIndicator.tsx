"use client";

import React, { useState } from "react";
import { useDock } from "@ai-matrx/summon/dock";
import { clientDockStore } from "@/lib/sync/dock-positions";
import { Bug, ChevronRight, X } from "lucide-react";
import type { DebugData } from "./SystemPromptDebugModal";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button as ControlButton } from "@ai-matrx/design-system/controls";

interface DebugIndicatorProps {
  debugData: DebugData | null;
  onClose: () => void;
}

type IndicatorSize = "small" | "large";

export const DebugIndicator: React.FC<DebugIndicatorProps> = ({
  debugData,
  onClose,
}) => {
  const [size, setSize] = useState<IndicatorSize>("small");
  // Below the admin chip until moved; summon's dock owns drag, clamp, z-lane and memory.
  const dock = useDock({
    id: "debug-indicator.prompt",
    corner: "top-left",
    defaultPosition: { x: 50, y: 45 },
    store: clientDockStore,
    zIndex: 9999,
  });

  // Small indicator
  if (size === "small") {
    return (
      <div
        ref={dock.ref}
        data-dock="debug-indicator.prompt"
        {...dock.handleProps}
        style={{
          ...dock.style,
          ...dock.handleProps.style,
          userSelect: "none",
          cursor: dock.dragging ? "grabbing" : "move",
          filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25))",
        }}
      >
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-600 text-white shadow-lg">
          <Bug size={14} />
          <span className="text-xs font-semibold">DEBUG</span>

          {/* Expand button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSize("large");
            }}
            className="p-0 rounded hover:bg-amber-700"
            title="Expand debug info"
          >
            <ChevronRight size={12} />
          </button>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-0 rounded hover:bg-amber-700"
            title="Close debug indicator"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Large indicator - full modal content
  return (
    <div ref={dock.ref} data-dock="debug-indicator.prompt" style={{ ...dock.style, userSelect: "none" }}>
      <Card className="w-[600px] max-h-[80dvh] shadow-2xl">
        {/* Header - draggable */}
        <div
          className="flex items-center justify-between p-3 border-b cursor-move bg-muted/50"
          {...dock.handleProps}
        >
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600" />
            <h3 className="font-semibold">
              Debug: {debugData?.promptName || "Unknown"}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSize("small")}
              className="p-1 rounded hover:bg-muted"
              title="Minimize"
            >
              <ChevronRight size={16} className="rotate-180" />
            </button>
            <ControlButton variant="quiet" removes onClick={onClose} aria-label="Close" icon={<X size={16} />} />
          </div>
        </div>

        {/* Content - scrollable */}
        <ScrollArea className="max-h-[calc(80dvh-60px)]">
          <div className="p-4 space-y-4">
            {debugData ? (
              <>
                {/* Selected Text */}
                {debugData.selectedText && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      Selected Text
                      <Badge variant="secondary">
                        {debugData.selectedText.length} chars
                      </Badge>
                    </h4>
                    <div className="bg-muted p-3 rounded-lg text-sm font-mono whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {debugData.selectedText}
                    </div>
                  </div>
                )}

                {/* Available Context */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Available Context
                  </h4>
                  <div className="bg-muted p-3 rounded-lg">
                    <pre className="text-xs font-mono overflow-x-auto">
                      {JSON.stringify(debugData.availableContext, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Resolved Variables */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    Resolved Variables
                    <Badge>
                      {Object.keys(debugData.resolvedVariables).length}{" "}
                      variables
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(debugData.resolvedVariables).map(
                      ([key, value]) => (
                        <div key={key} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <code className="text-sm font-semibold text-primary">
                              {"{{" + key + "}}"}
                            </code>
                            <Badge variant="outline" className="text-xs">
                              {typeof value === "string"
                                ? `${value.length} chars`
                                : typeof value}
                            </Badge>
                          </div>
                          <div className="bg-muted p-2 rounded text-xs font-mono max-h-24 overflow-y-auto whitespace-pre-wrap">
                            {typeof value === "string"
                              ? value
                              : JSON.stringify(value, null, 2)}
                          </div>
                        </div>
                      ),
                    )}
                    {Object.keys(debugData.resolvedVariables).length === 0 && (
                      <div className="text-sm text-muted-foreground italic">
                        No variables resolved
                      </div>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                {debugData.metadata && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Metadata</h4>
                    <div className="bg-muted p-3 rounded-lg">
                      <pre className="text-xs font-mono overflow-x-auto">
                        {JSON.stringify(debugData.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                No debug data available
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};
