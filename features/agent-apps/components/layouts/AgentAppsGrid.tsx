"use client";

import React from "react";
import { AgentAppCard } from "./AgentAppCard";
import type { AgentApp, PublicAgentApp } from "../../types";

interface AgentAppsGridProps {
  apps: (AgentApp | PublicAgentApp)[];
  hrefFor?: (app: AgentApp | PublicAgentApp) => string;
  onClick?: (app: AgentApp | PublicAgentApp) => void;
  emptyLabel?: string;
}

export function AgentAppsGrid({
  apps,
  hrefFor,
  onClick,
  emptyLabel = "No agent apps yet.",
}: AgentAppsGridProps) {
  if (apps.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {apps.map((app) => (
        <AgentAppCard
          key={app.id}
          app={app}
          href={hrefFor?.(app)}
          onClick={onClick}
        />
      ))}
    </div>
  );
}
