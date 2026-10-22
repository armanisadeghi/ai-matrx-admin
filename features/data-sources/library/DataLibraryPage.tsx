"use client";

/**
 * /data/library — the data library, built for a person with a job to do, not a developer reading a
 * catalog. It OPENS on everyday tasks in plain words ("See what customers say about a company"),
 * eight big doors (`./tasks.ts`). Tapping one shows the real sources that answer it, live-verified
 * first and the rest under "More sources"; a task with a single source opens it straight away.
 * "Browse all sources" is the secondary door to the full catalog — search, group chips, the shelf,
 * and the huge single-store collections as one compact searchable list.
 *
 * A source opens ON THIS PAGE (`?source=<key>`, `SourceDetail`): the search, then its results
 * streaming in right below it as the person's own custom table, then the earlier runs. A task is
 * `?task=<id>` (its sources, then the earlier runs of all of them); a run shown is `&job=<id>`, so a
 * reload re-attaches to it. `&field=<name>&value=<text>` (a pasted address) fills a field; nothing
 * fetches until Get data. A price shows only behind the Cost door on a source's detail.
 */

import { createElement, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { pushAddressWithoutNavigating, replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { ArrowLeft, ChevronRight, Database, SearchX, ShieldCheck, Wrench } from "lucide-react";
import { useOwnToolSearch } from "@ai-matrx/chat/agents/identity/tool-search";
import type { CatalogToolHit } from "@ai-matrx/agents/tools";
import { Badge, Button, Chip, ChipSet, DisclosureHeader, EmptyState, RegionSkeleton, SearchField, Tile } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { cn } from "@/lib/utils";

import {
  fieldPreview,
  librarySections,
  searchSources,
  sourceLine,
  type Library,
  type LibrarySection,
  type LibrarySource,
  plainIssue,
} from "./catalog";
import { GroupMark } from "./groupMark";
import { PastRuns } from "./PastRuns";
import { SourceSpeed } from "./SourceSpeed";
import { SourceMethodTag } from "./UnderTheHood";
import { SourceDetail, type SourceAsk } from "./SourceDetail";
import { AskBox, type AskPlan } from "./AskBox";
import { dropAskRuns, newAsk } from "./askRun";
import { LIBRARY_TASKS, resolveTask, resolveTasks, type ResolvedTask } from "./tasks";
import { useLibrary, useLibraryOrganizationId } from "./hooks";
import { GiveToAgentDialog } from "./tools/GiveToAgentDialog";
import { ToolPage } from "./tools/ToolPage";
import { ToolsHome } from "./tools/ToolsHome";
import { foldForSearch } from "./tools/people/entityOffers";

type View = { kind: "home" } | { kind: "browse" };

/** Move this page's own address (`?task=`, `?source=`, `&job=`) without a navigation. */
function useLibraryAddress() {
  const pathname = usePathname();
  const params = useSearchParams();
  return (next: Record<string, string | null>, opts?: { replace?: boolean }) => {
    const p = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) p.delete(key);
      else p.set(key, value);
    }
    const text = p.toString();
    const href = text ? `${pathname}?${text}` : pathname;
    if (opts?.replace) replaceAddressWithoutNavigating(href);
    else pushAddressWithoutNavigating(href);
  };
}

/**
 * The page opens on the data library's task home, exactly as it always has ("nothing should have
 * ever changed for active things"). The Tools home is its own door: `?view=tools` (the Tools nav
 * entry). A Tool opens in place (`?tool=<id>`, a running call `&call=<id>`); every `?source=` link
 * still opens its source. A server with no Tool catalog yet falls back to the data library.
 */
export function DataLibraryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toolId = params.get("tool");
  const callId = params.get("call");
  // The Tools home is entered only on purpose; the data library is the landing.
  const dataMode = params.get("view") !== "tools" || params.get("source") !== null;

  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [opened, setOpened] = useState<CatalogToolHit | null>(null);
  const [giving, setGiving] = useState<CatalogToolHit | null>(null);
  const search = useOwnToolSearch(foldForSearch(query), family, !toolId && !dataMode);
  const toolsRequested = params.get("view") === "tools";
  const toolsOpen = search.status !== "unavailable";

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null) p.delete(key);
      else p.set(key, value);
    }
    const text = p.toString();
    pushAddressWithoutNavigating(text ? `${pathname}?${text}` : pathname);
  };
  const back = () => (window.history.length > 1 ? router.back() : replaceAddressWithoutNavigating(pathname));

  return (
    <>
      <RecordPageHeader backHref="/data" level={{ name: toolId || (toolsRequested && toolsOpen) ? "Tools" : "Data library" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto" data-matrx-page-scroll="" data-data-library="">
          {toolId ? (
            <ToolPage toolId={toolId} known={opened?.tool_id === toolId ? opened : (search.known[toolId] ?? null)} callId={callId} onBack={back} />
          ) : toolsOpen && !dataMode ? (
            <ToolsHome
              search={search}
              query={query}
              onQuery={setQuery}
              family={family}
              onFamily={setFamily}
              onOpenTool={(hit) => {
                setOpened(hit);
                go({ tool: hit.tool_id });
              }}
              onGive={setGiving}
              onLookup={(plan) => go({ tool: plan.jobKey, with: JSON.stringify(plan.inputs), run: "1", call: null })}
              onOffer={(offer) => go({ tool: offer.jobKey, with: JSON.stringify(offer.inputs), run: offer.complete ? "1" : null, call: null })}
              dataSection={<DataSourcesDoor onOpen={() => go({ view: null })} />}
            />
          ) : (
            <>
              {toolsRequested && toolsOpen ? (
                <div className="mx-auto max-w-6xl px-4 pt-4">
                  <Button variant="quiet" onClick={() => go({ view: "tools", source: null, field: null, value: null })} icon={<ArrowLeft className="h-4 w-4" />}>
                    All Tools
                  </Button>
                </div>
              ) : (
                <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
                  <Button variant="outline" onClick={() => go({ view: "tools", source: null, field: null, value: null })} icon={<Wrench className="h-4 w-4" />} data-tools-link="">
                    Tools
                  </Button>
                </div>
              )}
              <DataSourcesBody />
            </>
          )}
        </div>
      </div>
      {giving ? <GiveToAgentDialog toolId={giving.tool_id} toolName={giving.display_name} onClose={() => setGiving(null)} /> : null}
    </>
  );
}

/** The data sources, as the library has always shown them. */
function DataSourcesBody() {
  const organizationId = useLibraryOrganizationId();
  const library = useLibrary(organizationId);
  return !organizationId || library.isLoading ? (
    <div className="mx-auto max-w-6xl p-4">
      <RegionSkeleton shape="cards" count={8} aria-label="Loading tasks" />
    </div>
  ) : library.error || !library.data ? (
    <div className="mx-auto max-w-6xl p-4">
      <ReadFailure error={library.error} what="the data library" onRetry={() => void library.refetch()} />
    </div>
  ) : (
    <LibraryBody library={library.data} />
  );
}

/** The full data-source catalog door. Admin only (ToolsHome renders it for an admin): members never see the shop. */
function DataSourcesDoor({ onOpen }: { onOpen: () => void }) {
  return (
    <section className="flex items-center justify-center" aria-label="Data sources">
      <Button variant="outline" onClick={onOpen} icon={<Database className="h-4 w-4" />}>
        Browse data sources
      </Button>
    </section>
  );
}

function LibraryBody({ library }: { library: Library }) {
  const organizationId = useLibraryOrganizationId();
  const [view, setView] = useState<View>({ kind: "home" });
  // The plain-language box's reading: the source it opens is filled (and run) from it.
  const [asked, setAsked] = useState<(SourceAsk & { sourceKey: string; switchTo: AskPlan | null }) | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const go = useLibraryAddress();

  const sourceKey = params.get("source");
  const taskId = params.get("task");
  const jobId = params.get("job");
  // `&field=<name>&value=<text>` (a pasted address): that field starts filled; nothing is fetched until Get data.
  const linkedField = params.get("field") ?? "url";
  const linkedValue = params.get("value");

  const openSource = (key: string) => go({ source: key, job: null, field: null, value: null });
  const openRun = (r: { id: string; sourceKey: string }) => go({ source: r.sourceKey, job: r.id, field: null, value: null });
  const leaveSource = () => {
    dropAskRuns();
    if (window.history.length > 1) router.back();
    else go({ source: null, job: null, field: null, value: null }, { replace: true });
  };

  const openAsk = (plan: AskPlan) => {
    // The ask's id is a one-time run ticket (`./askRun`): it runs once, at most, and never on a re-mount.
    setAsked({
      nonce: newAsk(plan.run),
      sourceKey: plan.source.key,
      values: plan.fill.values,
      option: plan.fill.option,
      run: plan.run,
      unapplied: plan.fill.unapplied,
      canRunAnyway: plan.fill.complete,
      alternative: plan.alternative ? { key: plan.alternative.source.key, label: plan.alternative.source.label } : null,
      switchTo: plan.alternative,
    });
    go({ task: plan.task.id, source: plan.source.key, job: null, field: null, value: null });
  };

  const openTask = (resolved: ResolvedTask) => {
    // One source answers the job: skip the picker and go straight into it.
    if (resolved.all.length === 1) go({ task: resolved.task.id, source: resolved.all[0].key, job: null });
    else go({ task: resolved.task.id, source: null, job: null });
  };

  const source = sourceKey ? library.sources.find((s) => s.key === sourceKey) : undefined;
  if (source) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-12 pt-4" data-source-page={source.key}>
        <div className="flex items-center gap-2">
          <Button variant="quiet" onClick={leaveSource} icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </div>
        <SourceDetail
          sourceKey={source.key}
          initialValues={linkedValue ? { [linkedField]: linkedValue } : undefined}
          jobId={jobId}
          onJob={(id, opts) => go({ job: id }, opts)}
          onOpenRun={openRun}
          ask={asked?.sourceKey === source.key ? asked : undefined}
          onSwitchAsk={asked?.switchTo ? () => asked.switchTo && openAsk(asked.switchTo) : undefined}
        />
      </div>
    );
  }

  const task = taskId ? LIBRARY_TASKS.find((t) => t.id === taskId) : undefined;
  const resolved = task ? resolveTask(library, task) : null;
  if (resolved && resolved.all.length > 0) {
    return (
      <TaskView
        resolved={resolved}
        library={library}
        onOpen={openSource}
        onOpenRun={openRun}
        onHome={() => go({ task: null, source: null, job: null })}
        onBrowse={() => {
          setView({ kind: "browse" });
          go({ task: null, source: null, job: null });
        }}
      />
    );
  }
  if (view.kind === "browse") {
    return <BrowseAllSources library={library} onHome={() => setView({ kind: "home" })} onOpen={openSource} />;
  }
  // Home (and the safe fall-back when a task no longer lands on anything).
  return (
    <TaskHome
      library={library}
      organizationId={organizationId}
      onOpenTask={openTask}
      onBrowse={() => setView({ kind: "browse" })}
      onOpenSource={openSource}
      onAsk={openAsk}
    />
  );
}

// ─── the task-first home ──────────────────────────────────────────────────────

function TaskHome({
  library,
  organizationId,
  onOpenTask,
  onBrowse,
  onOpenSource,
  onAsk,
}: {
  library: Library;
  organizationId: string | null;
  onOpenTask: (r: ResolvedTask) => void;
  onBrowse: () => void;
  onOpenSource: (key: string) => void;
  onAsk: (plan: AskPlan) => void;
}) {
  const [query, setQuery] = useState("");
  const tasks = resolveTasks(library);
  const searching = query.trim().length > 0;
  const matches = searching ? searchSources(library.sources, query).slice(0, 12) : [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 pb-12 pt-5">
      {/* Elevated stage: a plain opening and one search box, over a quiet primary wash. */}
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-8">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">What would you like to pull in?</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">Pick a task — we pull it into a table</p>
        <div className="mt-5" data-ask-stage="">
          <AskBox library={library} organizationId={organizationId} onPlan={onAsk} />
        </div>
        <div className="mt-3 max-w-md">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the library" aria-label="Search data sources" />
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
        {(confirmed[0] ?? all[0]) ? <SourceSpeed sourceKey={(confirmed[0] ?? all[0]).key} /> : null}
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

// ─── one task: the sources that answer it ─────────────────────────────────────

function TaskView({
  resolved,
  library,
  onOpen,
  onOpenRun,
  onHome,
  onBrowse,
}: {
  resolved: ResolvedTask;
  library: Library;
  onOpen: (key: string) => void;
  onOpenRun: (run: { id: string; sourceKey: string }) => void;
  onHome: () => void;
  onBrowse: () => void;
}) {
  const labelOf = (key: string) => library.sources.find((s) => s.key === key)?.label ?? key;
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

      <PastRuns sourceKeys={resolved.all.map((s) => s.key)} labelOf={labelOf} showSource onOpen={onOpenRun} />
    </div>
  );
}

// ─── browse all sources (the full catalog, the secondary door) ────────────────

type BrowseView = { kind: "featured" } | { kind: "all" } | { kind: "group"; group: string };

function BrowseAllSources({ library, onHome, onOpen }: { library: Library; onHome: () => void; onOpen: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<BrowseView>({ kind: "featured" });

  const searching = query.trim().length > 0;
  const inView = view.kind === "group" ? library.sources.filter((s) => s.group === view.group) : library.sources;
  const matches = searchSources(inView, query);
  const featured = view.kind === "featured" && !searching ? library.sources.filter((s) => s.featured) : [];
  const sections = librarySections(matches);

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
          {formatCount(library.sources.length)} sources
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
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <SourceSpeed sourceKey={source.key} />
        <SourceMethodTag sourceKey={source.key} />
        <span className="ml-auto flex items-center gap-1">
          {source.knownIssue ? (
            <Badge tone="warning" title={plainIssue(source.knownIssue)}>
              Known issue
            </Badge>
          ) : source.confirmed ? (
            <Badge tone="success" title="Confirmed with a live fetch">
              Confirmed
            </Badge>
          ) : null}
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
