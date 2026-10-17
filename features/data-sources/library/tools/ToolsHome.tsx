"use client";

/**
 * The Tools home — one place to search thousands of Tools by the job you need done, see what each
 * costs and how often it works, try it, and give it to an agent. Champions: treg's catalog (task-first,
 * priced, measured) and Google's one box. Beaten by: points instead of vendor names, strong / closest /
 * none said in plain words, a card that shows its sample size, and "Give to an agent" on the card.
 * Search is server-side and paged (`useOwnToolSearch`); nothing here loads the whole catalog.
 */

import { createElement, useEffect, useRef, type ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Button, EmptyState, RegionSkeleton, SearchField } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import type { CatalogSearchState, CatalogToolHit } from "@ai-matrx/agents/tools";

import { cn } from "@/lib/utils";

import { ToolCard } from "./ToolCard";
import { JOB_FAMILIES, verdictLine } from "./toolFacts";

export type ToolsSearch = CatalogSearchState & { loadMore: () => void; retry: () => void };

export function ToolsHome({
  search,
  query,
  onQuery,
  family,
  onFamily,
  onOpenTool,
  onGive,
  dataSection,
}: {
  search: ToolsSearch;
  query: string;
  onQuery: (query: string) => void;
  family: string | null;
  onFamily: (family: string | null) => void;
  onOpenTool: (hit: CatalogToolHit) => void;
  onGive: (hit: CatalogToolHit) => void;
  /** The data sources that answer the same words, under the Tools. */
  dataSection: ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { status, tools, verdict, nextCursor, loadMore } = search;
  const searching = query.trim().length > 0;

  // Page on scroll: the sentinel under the last card asks for the next page as it comes into view.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !nextCursor || status !== "succeeded" || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, status, loadMore, tools.length]);

  const firstLoad = (status === "idle" || status === "loading") && tools.length === 0;
  const line = verdictLine(verdict, query);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-5" data-tools-home="">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-9">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">What do you need done?</h1>
        <div className="mt-5 max-w-2xl">
          <SearchField
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Backlinks for a site, a work email, reviews of a company…"
            aria-label="Search Tools"
            autoFocus
          />
        </div>
        <div className="-mx-1 mt-5 flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Browse by job">
          <Button variant="quiet" pressed={family === null} onClick={() => onFamily(null)}>
            All
          </Button>
          {JOB_FAMILIES.map((f) => (
            <Button
              key={f.slug}
              variant="quiet"
              pressed={family === f.slug}
              onClick={() => onFamily(family === f.slug ? null : f.slug)}
              icon={createElement(f.icon, { className: "h-4 w-4" })}
              data-job-family={f.slug}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-label="Tools">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-foreground">{searching ? (verdict === "closest" ? "Closest Tools" : "Tools") : "Popular Tools"}</h2>
          {tools.length > 0 ? <span className="text-xs text-muted-foreground">{formatCount(tools.length)}{nextCursor ? "+" : ""}</span> : null}
        </div>
        {line ? <p className="text-sm text-muted-foreground">{line}</p> : null}

        {firstLoad ? (
          <RegionSkeleton shape="cards" count={8} aria-label="Loading Tools" />
        ) : status === "failed" && tools.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-5 w-5" />}
            title="Couldn't load Tools"
            line="Try again in a moment."
            action={<Button variant="outline" onClick={search.retry}>Try again</Button>}
          />
        ) : tools.length === 0 ? (
          <EmptyState icon={<SearchX className="h-5 w-5" />} title="No Tool does that yet" line="Try other words, or browse by job." />
        ) : (
          <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", status === "loading" && "opacity-60 transition-opacity")}>
            {tools.map((hit) => (
              <ToolCard key={hit.tool_id} hit={hit} onOpen={() => onOpenTool(hit)} onGive={() => onGive(hit)} />
            ))}
          </div>
        )}

        {status === "loading_more" ? <RegionSkeleton shape="cards" count={3} aria-label="Loading more Tools" /> : null}
        {nextCursor && status === "succeeded" ? (
          <div ref={sentinel} className="flex justify-center py-2">
            <Button variant="outline" onClick={loadMore}>
              Show more
            </Button>
          </div>
        ) : null}
      </section>

      {dataSection}
    </div>
  );
}
