"use client";

/**
 * The Tools home — one box and a handful of plain jobs. Champions: Google search (one box, nothing else
 * competing) and the Apple Shortcuts gallery (a few big, plainly named jobs that open the thing). No store
 * cards, no prices, no run counts, no success rates: a Tool is found by the job, never by who serves it,
 * and points show only at the step where someone confirms a spend (law 14). Search is server-side and
 * paged (`useOwnToolSearch`); nothing here loads the whole catalog.
 */

import { createElement, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button, EmptyState, RegionSkeleton, SearchField } from "@ai-matrx/design-system/controls";
import type { CatalogSearchState, CatalogToolHit } from "@ai-matrx/agents/tools";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { cn } from "@/lib/utils";

import { LookupSuggestion } from "./people/LookupSuggestion";
import { lookupHelp, planLookup, type LookupPlan } from "./people/lookupPlan";
import { ToolRow } from "./ToolRow";
import { ToolsAdminSlot, useToolsAdminView } from "./ToolsAdminSlot";
import { readEntity, type EntityOffer } from "./people/entityOffers";
import { dedupeByJob, verdictLine } from "./toolFacts";
import { TOOL_TASKS } from "./toolTasks";

export type ToolsSearch = CatalogSearchState & { loadMore: () => void; retry: () => void };

export function ToolsHome({
  search,
  query,
  onQuery,
  family,
  onFamily,
  onOpenTool,
  onGive,
  onLookup,
  onOffer,
  dataSection,
}: {
  search: ToolsSearch;
  query: string;
  onQuery: (query: string) => void;
  family: string | null;
  onFamily: (family: string | null) => void;
  onOpenTool: (hit: CatalogToolHit) => void;
  onGive: (hit: CatalogToolHit) => void;
  /** The one box recognized a website, email, phone or person: open that lookup with the box filled. */
  onLookup: (plan: LookupPlan) => void;
  /** One offer from the box (a thing was typed): open that job with the box filled. */
  onOffer: (offer: EntityOffer) => void;
  /** The full data-source catalog door: shown to an admin only, never to a member. */
  dataSection: ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { status, verdict, nextCursor, loadMore } = search;
  const tools = dedupeByJob(search.tools);
  const admin = useToolsAdminView();
  const searching = query.trim().length > 0 || family !== null;

  // Page on scroll: the sentinel under the last row asks for the next page as it comes into view.
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
  const entity = family === null ? readEntity(query) : null;
  // A bare dotted handle ("name.surname") reads as a website to the lookup planner; the handle wins.
  const lookup = entity?.kind === "handle" || entity?.kind === "social_link" ? null : planLookup(query);
  const settled = status === "succeeded" || status === "failed";
  const strong = tools.length > 0 && verdict === "strong";
  // A thing typed (a handle, a link, a website) is answered by its offers alone. A business name is answered by
  // its offers unless the Tool search found a strong match for those very words.
  const offers = entity && entity.offers.length > 0 && (entity.kind !== "business" || (settled && !strong)) ? entity.offers : [];
  const showTools = offers.length === 0 || (entity?.kind === "business" && tools.length > 0 && verdict === "strong");
  // A recognized lookup is the answer to the box; the list of Tools waits one press away (and returns on a new query).
  const [listOpenFor, setListOpenFor] = useState<string | null>(null);
  const hideList = lookup !== null && listOpenFor !== query;
  const help = !lookup && (family === "people" || family === "company") ? lookupHelp(query) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 pt-8 sm:pt-14" data-tools-home="">
      <ToolsAdminSlot where="home" />
      <section className="flex flex-col items-center gap-5 text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">What do you want to find?</h1>
        <SearchField
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            onFamily(null);
          }}
          placeholder="An email, a website, a business…"
          aria-label="What do you want to find?"
          hero
          className="w-full"
          autoFocus
        />
      </section>

      {!searching ? (
        <section aria-label="Jobs" className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-tool-tasks="">
          {TOOL_TASKS.map((task) => (
            <button
              key={task.id}
              type="button"
              data-clickable=""
              data-tool-task={task.id}
              onClick={() => {
                onQuery(task.query);
                onFamily(task.family);
              }}
              className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                {createElement(task.icon, { className: "h-5 w-5" })}
              </span>
              <span className="text-base font-medium leading-snug text-foreground">{task.title}</span>
            </button>
          ))}
        </section>
      ) : null}

      {lookup ? <LookupSuggestion plan={lookup} onLookup={onLookup} /> : null}
      {offers.length > 0 ? (
        <section className="flex flex-wrap gap-2" aria-label="What you can do" data-entity-offers={entity?.kind}>
          {offers.map((offer) =>
            offer.href ? (
              <Button key={offer.id} variant="outline" asChild data-entity-offer={offer.id}>
                <a href={offer.href} target="_blank" rel="noopener noreferrer">
                  {offer.label}
                </a>
              </Button>
            ) : (
              <Button key={offer.id} variant="outline" onClick={() => onOffer(offer)} data-entity-offer={offer.id}>
                {offer.label}
              </Button>
            ),
          )}
        </section>
      ) : null}
      {help ? (
        <p className="text-sm text-muted-foreground" data-lookup-help="">
          {help}
        </p>
      ) : null}
      {hideList ? (
        <div className="flex justify-center">
          <Button variant="quiet" onClick={() => setListOpenFor(query)} data-lookup-show-tools="">
            Search the Tools instead
          </Button>
        </div>
      ) : null}

      {searching ? (
        <section className={cn("flex flex-col gap-3", hideList && "hidden")} aria-label="Tools">
          <div className="flex items-center gap-2">
            <Button
              variant="quiet"
              onClick={() => {
                onQuery("");
                onFamily(null);
              }}
              icon={<ArrowLeft className="h-4 w-4" />}
            >
              All jobs
            </Button>
          </div>
          {showTools ? (
            <>
          {line ? <p className="text-sm text-muted-foreground">{line}</p> : null}

          {firstLoad ? (
            <RegionSkeleton shape="cards" count={4} aria-label="Loading Tools" />
          ) : status === "failed" && tools.length === 0 ? (
            <EmptyState
              icon={<SearchX className="h-5 w-5" />}
              title="Couldn't load Tools"
              line="Try again in a moment."
              action={
                <span className="inline-flex items-center gap-1">
                  <Button variant="outline" onClick={search.retry}>
                    Try again
                  </Button>
                  <ErrorAlchemyMenu error={search.error ?? "The Tool search failed"} />
                </span>
              }
            />
          ) : tools.length === 0 ? (
            <NearestJobs onPick={(task) => {
              onQuery(task.query);
              onFamily(task.family);
            }} />
          ) : (
            <div className={cn("flex flex-col gap-2", status === "loading" && "opacity-60 transition-opacity")}>
              {tools.map((hit) => (
                <ToolRow key={hit.tool_id} hit={hit} onOpen={() => onOpenTool(hit)} onGive={() => onGive(hit)} />
              ))}
            </div>
          )}

          {status === "loading_more" ? <RegionSkeleton shape="cards" count={2} aria-label="Loading more Tools" /> : null}
          {nextCursor && status === "succeeded" ? (
            <div ref={sentinel} className="flex justify-center py-2">
              <Button variant="outline" onClick={loadMore}>
                Show more
              </Button>
            </div>
          ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {/* A job picked from the grid is answered by Tools alone; data sources join only words the person typed. */}
      {admin && !hideList && family === null ? dataSection : null}
    </div>
  );
}

/** No Tool matched the words and they are not a thing we know: the closest plain jobs, never a dead end. */
function NearestJobs({ onPick }: { onPick: (task: (typeof TOOL_TASKS)[number]) => void }) {
  return (
    <div className="flex flex-col gap-3" data-nearest-jobs="">
      <p className="text-sm text-muted-foreground">Pick a job</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TOOL_TASKS.map((task) => (
          <Button
            key={task.id}
            variant="outline"
            data-tool-task={task.id}
            onClick={() => onPick(task)}
            icon={createElement(task.icon, { className: "h-4 w-4" })}
            className="justify-start"
          >
            {task.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
