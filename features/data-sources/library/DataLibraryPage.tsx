"use client";

/**
 * /data/library — the data library, built for a person with a job to do, not a developer reading a
 * catalog. It OPENS on everyday tasks in plain words ("See what customers say about a company"),
 * eight big doors (`./tasks.ts`). Tapping one shows the real sources that answer it, live-verified
 * first and the rest under "More sources"; a task with a single source opens it straight away.
 * "Browse all sources" is the secondary door to the full catalog — search, group chips, the shelf,
 * and the huge single-store collections as one compact searchable list.
 *
 * A source opens in the `dataSourceWindow` panel (`SourceDetail`), which runs the same fetch as the
 * board. `?source=<key>` opens one on arrival (a pasted address fills a field); nothing fetches
 * until Get data. Members see points only (each source's own price); dollars only through
 * `useCostDisplay`'s rule.
 */

import { createElement, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, SearchX, ShieldCheck } from "lucide-react";
import { Badge, Button, Chip, ChipSet, DisclosureHeader, EmptyState, RegionSkeleton, SearchField, Tile } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";

import { useOpenDataSourceWindow } from "@/features/overlays/openers/dataSourceWindow";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { cn } from "@/lib/utils";

import {
  cheapestPoints,
  fieldPreview,
  librarySections,
  pointsPerRecord,
  searchSources,
  sourceLine,
  type Library,
  type LibrarySection,
  type LibrarySource,
} from "./catalog";
import { GroupMark } from "./groupMark";
import { LIBRARY_TASKS, resolveTask, resolveTasks, type ResolvedTask } from "./tasks";
import { useLibrary, useLibraryOrganizationId, usePriceText } from "./hooks";

type View = { kind: "home" } | { kind: "browse" } | { kind: "task"; id: string };

export function DataLibraryPage() {
  const organizationId = useLibraryOrganizationId();
  const library = useLibrary(organizationId);
  return (
    <>
      <RecordPageHeader backHref="/data" record={{ name: "Data library" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto" data-matrx-page-scroll="" data-data-library="">
          {!organizationId || library.isLoading ? (
            <div className="mx-auto max-w-6xl p-4">
              <RegionSkeleton shape="cards" count={8} aria-label="Loading tasks" />
            </div>
          ) : library.error || !library.data ? (
            <div className="mx-auto max-w-6xl p-4">
              <ReadFailure error={library.error} what="the data library" onRetry={() => void library.refetch()} />
            </div>
          ) : (
            <LibraryBody library={library.data} />
          )}
        </div>
      </div>
    </>
  );
}

function LibraryBody({ library }: { library: Library }) {
  const [view, setView] = useState<View>({ kind: "home" });
  const openSource = useOpenDataSourceWindow();

  // `?source=<key>` (a link from anywhere): open that source once.
  const params = useSearchParams();
  const opened = useRef<string | null>(null);
  const linked = params.get("source");
  // `&field=<name>&value=<text>` (a pasted address): that field starts filled; nothing is fetched until Get data.
  const linkedField = params.get("field") ?? "url";
  const linkedValue = params.get("value");
  useEffect(() => {
    if (linked && opened.current !== linked && library.sources.some((s) => s.key === linked)) {
      opened.current = linked;
      openSource(linked, linkedValue ? { [linkedField]: linkedValue } : undefined);
    }
  }, [linked, linkedField, linkedValue, library.sources, openSource]);

  const openTask = (resolved: ResolvedTask) => {
    // One source answers the job: skip the picker and go straight into it.
    if (resolved.all.length === 1) openSource(resolved.all[0].key);
    else setView({ kind: "task", id: resolved.task.id });
  };

  const task = view.kind === "task" ? LIBRARY_TASKS.find((t) => t.id === view.id) : undefined;
  const resolved = task ? resolveTask(library, task) : null;
  if (resolved && resolved.all.length > 0) {
    return <TaskView resolved={resolved} onOpen={openSource} onHome={() => setView({ kind: "home" })} onBrowse={() => setView({ kind: "browse" })} />;
  }
  if (view.kind === "browse") {
    return <BrowseAllSources library={library} onHome={() => setView({ kind: "home" })} onOpen={openSource} />;
  }
  // Home (and the safe fall-back when a task no longer lands on anything).
  return <TaskHome library={library} onOpenTask={openTask} onBrowse={() => setView({ kind: "browse" })} onOpenSource={openSource} />;
}

// ─── the task-first home ──────────────────────────────────────────────────────

function TaskHome({
  library,
  onOpenTask,
  onBrowse,
  onOpenSource,
}: {
  library: Library;
  onOpenTask: (r: ResolvedTask) => void;
  onBrowse: () => void;
  onOpenSource: (key: string) => void;
}) {
  const [query, setQuery] = useState("");
  const tasks = resolveTasks(library);
  const searching = query.trim().length > 0;
  const matches = searching ? searchSources(library.sources, query).slice(0, 12) : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pb-12 pt-5">
      {/* Elevated stage: a plain opening and one search box, over a quiet primary wash. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">What would you like to pull in?</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Pick a task — we pull it into a table</p>
        <div className="mt-5 max-w-md">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reviews, prices, jobs…" aria-label="Search data sources" />
        </div>
      </section>

      {searching ? (
        <section className="flex flex-col gap-3" aria-label="Search results">
          {matches.length === 0 ? (
            <EmptyState icon={<SearchX className="h-5 w-5" />} title="Nothing matches" line="Try a task below, or browse every source." />
          ) : (
            <>
              <SectionTitle title="Matches" count={matches.length} />
              <CardGrid sources={matches} onOpen={onOpenSource} />
            </>
          )}
          <Button variant="quiet" className="self-start" onClick={onBrowse} icon={<ChevronRight className="h-4 w-4" />}>
            Browse all sources
          </Button>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3" aria-label="Tasks">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tasks.map((r) => (
                <TaskCard key={r.task.id} resolved={r} onOpen={() => onOpenTask(r)} />
              ))}
            </div>
          </section>

          <div className="flex items-center justify-center">
            <Button variant="outline" onClick={onBrowse} icon={<ChevronRight className="h-4 w-4" />} meta={formatCount(library.sources.length)}>
              Browse all sources
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function TaskCard({ resolved, onOpen }: { resolved: ResolvedTask; onOpen: () => void }) {
  const { task, confirmed, all } = resolved;
  return (
    <button
      type="button"
      data-clickable=""
      data-task-card={task.id}
      onClick={onOpen}
      className="group flex min-h-40 flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15" aria-hidden>
        {createElement(task.icon, { className: "h-5 w-5" })}
      </span>
      <div className="flex-1">
        <div className="text-base font-semibold leading-snug text-foreground">{task.title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{task.example}</p>
      </div>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {confirmed.length > 0 ? (
          <>
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden />
            {formatCount(confirmed.length)} ready
          </>
        ) : (
          `${formatCount(all.length)} ${all.length === 1 ? "source" : "sources"}`
        )}
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

// ─── one task: the sources that answer it ─────────────────────────────────────

function TaskView({
  resolved,
  onOpen,
  onHome,
  onBrowse,
}: {
  resolved: ResolvedTask;
  onOpen: (key: string) => void;
  onHome: () => void;
  onBrowse: () => void;
}) {
  const { task, confirmed, more } = resolved;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-12 pt-4">
      <div className="flex items-center gap-2">
        <Button variant="quiet" onClick={onHome} icon={<ArrowLeft className="h-4 w-4" />}>
          All tasks
        </Button>
        <Button variant="quiet" className="ml-auto" onClick={onBrowse}>
          Browse all sources
        </Button>
      </div>

      <section className="flex items-start gap-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden>
          {createElement(task.icon, { className: "h-6 w-6" })}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{task.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{task.example}</p>
        </div>
      </section>

      {confirmed.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Ready now">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
            <SectionTitle title="Ready now" count={confirmed.length} />
          </div>
          <CardGrid sources={confirmed} onOpen={onOpen} rich />
        </section>
      )}

      {more.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="More sources">
          <div>
            <SectionTitle title="More sources" count={more.length} />
            <p className="text-xs text-muted-foreground">Not confirmed yet — they may need a nudge.</p>
          </div>
          <CardGrid sources={more} onOpen={onOpen} />
        </section>
      )}

      {confirmed.length === 0 && more.length === 0 && (
        <EmptyState icon={<SearchX className="h-5 w-5" />} title="Nothing here yet" line="Browse every source instead." />
      )}
    </div>
  );
}

// ─── browse all sources (the full catalog, the secondary door) ────────────────

type BrowseView = { kind: "featured" } | { kind: "all" } | { kind: "group"; group: string };

function BrowseAllSources({ library, onHome, onOpen }: { library: Library; onHome: () => void; onOpen: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<BrowseView>({ kind: "featured" });
  const price = usePriceText();
  const { rate } = useCostDisplay();

  const searching = query.trim().length > 0;
  const inView = view.kind === "group" ? library.sources.filter((s) => s.group === view.group) : library.sources;
  const matches = searchSources(inView, query);
  const featured = view.kind === "featured" && !searching ? library.sources.filter((s) => s.featured) : [];
  const sections = librarySections(matches);

  const cheapest = cheapestPoints(library.sources, rate);
  const cheapestSource = cheapest == null ? null : library.sources.find((s) => pointsPerRecord(s, rate) === cheapest) ?? null;
  const fromText = cheapestSource ? price(cheapestSource, 1) : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-10">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:flex-row md:items-center">
        <Button variant="quiet" className="shrink-0 self-start md:self-center" onClick={onHome} icon={<ArrowLeft className="h-4 w-4" />}>
          Tasks
        </Button>
        <div className="w-full md:w-60 md:shrink-0">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sources" aria-label="Search data sources" />
        </div>
        <div className="-mx-4 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0" role="toolbar" aria-label="Filter by group">
          <FilterChip label="Featured" pressed={view.kind === "featured"} onClick={() => setView({ kind: "featured" })} />
          <FilterChip label="All" count={library.sources.length} pressed={view.kind === "all"} onClick={() => setView({ kind: "all" })} />
          {library.groups.map((g) => (
            <FilterChip
              key={g.group}
              label={g.group}
              count={g.count}
              pressed={view.kind === "group" && view.group === g.group}
              onClick={() => setView({ kind: "group", group: g.group })}
            />
          ))}
        </div>
        <div className="hidden shrink-0 text-xs text-muted-foreground lg:block" data-library-hero="">
          {formatCount(library.sources.length)} sources{fromText ? ` · from ${fromText} a record` : ""}
        </div>
      </div>

      {featured.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="Featured">
          <SectionTitle title="Featured" count={featured.length} />
          <CardGrid sources={featured} onOpen={onOpen} rich />
        </section>
      )}

      {sections.length === 0 ? (
        <EmptyState icon={<SearchX className="h-5 w-5" />} title="Nothing matches" line="Try a site, a kind of record, or a column name." />
      ) : (
        sections.map((sec) => <GroupSection key={sec.group} section={sec} searching={searching} onOpen={onOpen} />)
      )}
    </div>
  );
}

function FilterChip({ label, count, pressed, onClick }: { label: string; count?: number; pressed: boolean; onClick: () => void }) {
  return (
    <Button variant="quiet" pressed={pressed} onClick={onClick} meta={count != null ? formatCount(count) : undefined} className="shrink-0" data-filter={label}>
      {label}
    </Button>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <span className="text-xs text-muted-foreground">{formatCount(count)}</span>
    </div>
  );
}

function GroupSection({ section, searching, onOpen }: { section: LibrarySection; searching: boolean; onOpen: (key: string) => void }) {
  return (
    <section className="flex flex-col gap-3" aria-label={section.group} data-group={section.group}>
      <SectionTitle title={section.group} count={section.count} />
      {section.cards.length > 0 && <CardGrid sources={section.cards} onOpen={onOpen} />}
      {section.lists.map((l) => (
        <CompactList key={`${l.subgroup}:${searching}`} group={section.group} subgroup={l.subgroup} sources={l.sources} defaultOpen={searching} onOpen={onOpen} />
      ))}
    </section>
  );
}

function CardGrid({ sources, onOpen, rich = false }: { sources: LibrarySource[]; onOpen: (key: string) => void; rich?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sources.map((s) => (
        <SourceCard key={s.key} source={s} rich={rich} onOpen={() => onOpen(s.key)} />
      ))}
    </div>
  );
}

function SourceCard({ source, rich, onOpen }: { source: LibrarySource; rich: boolean; onOpen: () => void }) {
  const price = usePriceText()(source, 1);
  const preview = fieldPreview(source.outputFields, rich ? 5 : 3);
  return (
    <button
      type="button"
      data-clickable=""
      data-source-card={source.key}
      onClick={onOpen}
      className={cn(
        "group flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        rich && "min-h-36",
      )}
    >
      <div className="flex items-start gap-2.5">
        <GroupMark group={source.group} subgroup={source.subgroup} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{source.label}</div>
          <div className="truncate text-xs text-muted-foreground">{sourceLine(source)}</div>
        </div>
      </div>
      {preview.shown.length > 0 && (
        <ChipSet className="min-w-0">
          {preview.shown.map((f) => (
            <Chip key={f} label={f} />
          ))}
          {preview.more > 0 && <Chip label={`+${preview.more}`} tone="neutral" />}
        </ChipSet>
      )}
      <div className="mt-auto flex items-center gap-1.5 pt-1">
        <span className="text-xs font-medium text-foreground" data-unit-price="">
          {price ? `${price} / record` : "No price yet"}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {source.knownIssue && (
            <Badge tone="warning" title={source.knownIssue}>
              Known issue
            </Badge>
          )}
          {source.confirmed && (
            <Badge tone="success" title="Confirmed with a live fetch">
              Confirmed
            </Badge>
          )}
        </span>
      </div>
    </button>
  );
}

const LIST_PAGE = 60;

function CompactList({
  group,
  subgroup,
  sources,
  defaultOpen,
  onOpen,
}: {
  group: string;
  subgroup: string;
  sources: LibrarySource[];
  defaultOpen: boolean;
  onOpen: (key: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [filter, setFilter] = useState("");
  const [shown, setShown] = useState(LIST_PAGE);
  const price = usePriceText();
  const rows = searchSources(sources, filter);
  return (
    <div className="rounded-lg border border-border bg-card" data-compact-list={subgroup}>
      <DisclosureHeader
        open={open}
        onClick={() => setOpen((v) => !v)}
        icon={<GroupMark group={group} subgroup={subgroup} className="flex h-5 w-5 items-center justify-center text-primary" />}
        title={subgroup}
        meta={formatCount(sources.length)}
      />
      {open && (
        <div className="flex flex-col gap-2 border-t border-border p-2">
          <SearchField value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={`Search ${formatCount(sources.length)} ${subgroup.toLowerCase()}`} aria-label={`Search ${subgroup}`} />
          {rows.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">Nothing matches</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.slice(0, shown).map((s) => (
                <li key={s.key}>
                  <Tile
                    layout="row"
                    variant="quiet"
                    data-source-row={s.key}
                    onClick={() => onOpen(s.key)}
                    title={s.label}
                    end={
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        {s.confirmed && <ShieldCheck className="h-3.5 w-3.5 text-success" aria-label="Confirmed" />}
                        {price(s, 1, { short: true }) ?? ""}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {rows.length > shown && (
            <Button variant="quiet" className="self-center" onClick={() => setShown((n) => n + LIST_PAGE * 4)} meta={formatCount(rows.length - shown)}>
              Show more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
