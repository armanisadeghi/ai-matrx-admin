"use client";

/**
 * One Tool in the grid — a card that says what it does, what it costs and how often it works, then
 * lets a person try it or hand it to an agent in one press. Champions: treg's catalog (task-first,
 * priced, measured) and the Apify Store (success rate on every card). Beaten by points instead of
 * vendors, an honest "New" while the sample is too small to mean anything, and "Give to an agent"
 * on the card itself. The card never names who serves the Tool (R-1).
 */

import { createElement } from "react";
import { Zap } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { toolPriceText, type CatalogToolHit } from "@ai-matrx/agents/tools";

import { AGENT_ICON } from "@/components/icons/domain-icons";
import { cn } from "@/lib/utils";

import { jobFamilyOf, reliabilityFacts, speedText } from "./toolFacts";

export function ToolCard({
  hit,
  onOpen,
  onGive,
}: {
  hit: CatalogToolHit;
  onOpen: () => void;
  onGive: () => void;
}) {
  const family = jobFamilyOf(hit.job_family);
  const reliability = reliabilityFacts(hit.reliability);
  const speed = speedText(hit.reliability.p50_ms);
  const price = toolPriceText(hit);
  const off = hit.state !== "live";
  return (
    <div
      data-tool-card={hit.tool_id}
      data-tool-job={hit.job_key}
      data-clickable=""
      onClick={onOpen}
      className="group relative flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors focus-within:border-primary/60 hover:border-primary/50 hover:bg-accent/30"
    >
      <div className="pointer-events-none flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
          {createElement(family.icon, { className: "h-5 w-5" })}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">{hit.display_name}</h3>
            {off ? <Badge tone="warning">Paused</Badge> : null}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {hit.display_noun} · {family.label}
          </div>
        </div>
        {price ? (
          <Badge tone="neutral" data-tool-price="">
            {price}
          </Badge>
        ) : null}
      </div>
      <p className="pointer-events-none line-clamp-2 min-h-10 text-sm text-muted-foreground">{hit.summary}</p>
      <div className="pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className={cn("inline-flex items-center gap-1 font-medium", reliability.tone === "success" && "text-success", reliability.tone === "warning" && "text-warning", reliability.tone === "danger" && "text-destructive")} data-tool-reliability="">
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current", reliability.tone === "neutral" && "bg-muted-foreground")} aria-hidden />
          {reliability.headline}
        </span>
        {reliability.sample ? <span>{reliability.sample}</span> : null}
        {speed ? (
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" aria-hidden />
            {speed}
          </span>
        ) : null}
      </div>
      <div className="mt-auto flex items-center gap-2">
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          Try it
        </Button>
        <Button
          variant="quiet"
          onClick={(e) => {
            e.stopPropagation();
            onGive();
          }} icon={createElement(AGENT_ICON, { className: "h-4 w-4" })}>
          Give to an agent
        </Button>
      </div>
    </div>
  );
}
