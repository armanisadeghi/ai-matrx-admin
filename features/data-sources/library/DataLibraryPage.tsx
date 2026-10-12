"use client";

/**
 * /data/library — every data source the platform can fetch into a table, at its own price.
 * One row on top (search · Featured · All · a chip per group with its count), the featured shelf
 * first, then every group; a huge subgroup (the single-store product collectors) is one collapsed,
 * searchable compact list, never a wall of cards. A source opens in the `dataSourceWindow` panel
 * (`SourceDetail`), which runs the same fetch as the board. `?source=<key>` opens one on arrival.
 *
 * Members see points only (each source's own price); dollars only through `useCostDisplay`'s rule.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight, SearchX, ShieldCheck } from "lucide-react";
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
import { useLibrary, useLibraryOrganizationId, usePriceText } from "./hooks";

type View = { kind: "featured" } | { kind: "all" } | { kind: "group"; group: string };

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
              <RegionSkeleton shape="cards" count={8} aria-label="Loading data sources" />
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
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ kind: "featured" });
  const openSource = useOpenDataSourceWindow();
  const price = usePriceText();
  const { rate } = useCostDisplay();

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
        <div className="w-full md:w-64 md:shrink-0">
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
          <CardGrid sources={featured} onOpen={openSource} rich />
        </section>
      )}

      {sections.length === 0 ? (
        <EmptyState icon={<SearchX className="h-5 w-5" />} title="Nothing matches" line="Try a site, a kind of record, or a column name." />
      ) : (
        sections.map((sec) => <GroupSection key={sec.group} section={sec} searching={searching} onOpen={openSource} />)
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

