"use client";

import React from "react";
import { AgentAppErrorBoundary } from "./AgentAppErrorBoundary";
import { AgentAppPublicRenderer } from "./AgentAppPublicRenderer";
import type { PublicAgentApp } from "../types";

interface AgentAppPreviewProps {
  app: PublicAgentApp;
}

export function AgentAppPreview({ app }: AgentAppPreviewProps) {
  return (
    <div className="h-full w-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex-shrink-0 border-b border-border px-4 py-2 bg-muted/40">
        <div className="text-sm font-medium text-foreground">{app.name}</div>
        {app.tagline && (
          <div className="text-xs text-muted-foreground truncate">
            {app.tagline}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <AgentAppErrorBoundary appName={app.name}>
          <AgentAppPublicRenderer app={app} slug={app.slug} />
        </AgentAppErrorBoundary>
      </div>
    </div>
  );
}
