"use client";

/**
 * One Tool in a result list — a plain row: what it does, one press to open. No price, no run counts, no
 * success rate (a Tool is picked by the job, not by its numbers; points show only where someone confirms a
 * spend). Champions: Google's result list and the Apple Shortcuts gallery. "Give to an agent" stays one quiet
 * press away. The row never names who serves the Tool.
 */

import { createElement } from "react";
import { ChevronRight } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import type { CatalogToolHit } from "@ai-matrx/agents/tools";

import { AGENT_ICON } from "@/components/icons/domain-icons";

import { jobFamilyOf } from "./toolFacts";

export function ToolRow({ hit, onOpen, onGive }: { hit: CatalogToolHit; onOpen: () => void; onGive: () => void }) {
  const family = jobFamilyOf(hit.job_family);
  return (
    <div
      data-tool-card={hit.tool_id}
      data-tool-job={hit.job_key}
      data-clickable=""
      onClick={onOpen}
      className="group flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:bg-accent/30"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
        {createElement(family.icon, { className: "h-5 w-5" })}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{hit.display_name}</h3>
          {hit.state !== "live" ? <Badge tone="warning">Paused</Badge> : null}
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{hit.summary}</p>
      </div>
      <Button
        variant="quiet"
        aria-label="Give to an agent"
        title="Give to an agent"
        className="shrink-0 opacity-70 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onGive();
        }}
        icon={createElement(AGENT_ICON, { className: "h-4 w-4" })}
      />
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </div>
  );
}
