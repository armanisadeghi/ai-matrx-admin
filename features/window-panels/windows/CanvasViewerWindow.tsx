"use client";

import React, { useState, useEffect } from "react";
import { WindowPanel } from "../WindowPanel";
import { SharedCanvasView } from "@/features/canvas/shared/SharedCanvasView";
import { Search } from "lucide-react";

export interface CanvasViewerWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  instanceId?: string;
  initialShareToken?: string;
}

export function CanvasViewerWindow({
  isOpen,
  onClose,
  title = "Canvas Viewer",
  instanceId = "default",
  initialShareToken,
}: CanvasViewerWindowProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [activeToken, setActiveToken] = useState<string | undefined>(undefined);

  // Sync initial token on open
  useEffect(() => {
    if (isOpen && initialShareToken) {
      setActiveToken(initialShareToken);
      setTokenInput(initialShareToken);
    }
  }, [isOpen, initialShareToken]);

  const resolveToken = (input: string) => {
    if (!input) return null;
    const val = input.trim();
    try {
      const url = new URL(val);
      const match = url.pathname.match(/\/canvas\/shared\/([^/?#]+)/);
      if (match) return match[1];
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1];
    } catch {
      const match = val.match(/(?:\/)?canvas\/shared\/([^/?#]+)/);
      if (match) return match[1];
      const parts = val.split("/").filter(Boolean);
      return parts[parts.length - 1];
    }
    return val;
  };

  const handleResolve = () => {
    const resolved = resolveToken(tokenInput);
    if (resolved) {
      setActiveToken(resolved);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleResolve();
    }
  };

  if (!isOpen) return null;

  return (
    <WindowPanel
      id={`canvas-viewer-${instanceId}`}
      title={title}
      onClose={onClose}
      minWidth={350}
      minHeight={250}
      width={700}
      height={550}
    >
      <div className="flex flex-col h-full min-h-0 bg-background">
        <div className="shrink-0 px-3 py-2 border-b border-border bg-muted/20 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 h-7 text-xs px-2 rounded-md border border-border bg-background focus:ring-1 focus:ring-primary outline-none placeholder:text-muted-foreground/50 transition-all font-mono"
            placeholder="Paste canvas link or token (e.g. y33f8x...)"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleResolve}
            className="h-7 px-3 flex items-center gap-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Resolve
          </button>
        </div>

        <div className="flex-1 min-h-0 relative">
          {activeToken ? (
            <SharedCanvasView
              shareToken={activeToken}
              className="h-full min-h-0"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full border border-border bg-muted flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground">
                No Canvas Selected
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Enter a generated canvas code or shared link above to view it in this window.
              </p>
            </div>
          )}
        </div>
      </div>
    </WindowPanel>
  );
}
