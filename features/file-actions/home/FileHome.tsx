"use client";

/**
 * FileHome — the Workbooks and Documents homes, ONE component set, modelled on the Google Sheets /
 * Google Docs home: a search box, the "Start a new …" template band, our Google strip, then
 * "Recent …" with the owner filter (plus Starred and Trash), grid ⇄ list, Google's four sorts and
 * the upload door, grouped Today / Previous 7 days / Previous 30 days / Earlier.
 *
 * Grid cards show the file's real first page / first sheet (`RecordThumb`). The Google Look's desktop
 * list is Google's calm list (`GoogleFileList`: icon + name, owner, date, ⋮, grouped by time); the
 * Microsoft 365 look keeps the canonical table (every column, bulk selection). A phone gets
 * Google's mobile list. The "Recent …" row sticks under the app header in every view
 * (`useStickyHomeHeader`) and, in the Google list, names the time group under it.
 *
 * The page keeps what is its own (load, create, import, the Google strip's data) and hands it in.
 * Every per-file action is the shared file menu (`useFileItemActions`), on ⋮ and on right-click.
 *
 * The Microsoft 365 look (the person's Office look setting, switched right here or in Settings) is
 * a skin of this same home — Excel / Word / PowerPoint on the web's start page: a left app rail,
 * "Create" with Blank workbook/document/presentation and the templates, Recent · Pinned · Shared
 * with me tabs over a Name / Opened / Owner list, the app's colour and type. Same data, same menus.
 */

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FolderOpen, Home as HomeIcon, Plus, Star, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { Button, EmptyState, SearchField, Select, Tabs } from "@ai-matrx/design-system/controls";
import { TapTargetButtonForGroup, TapTargetButtonGroup } from "@ai-matrx/design-system/tap-target";
import {
  ArrowDownUpTapButton,
  LayoutGridTapButton,
  ListTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useListViewPrefs, type LegacyListViewImport } from "@/lib/list-views/useListViewPrefs";
import { cn } from "@/lib/utils";
import { fetchUserDisplayNames } from "@/features/mandates/notes";
import { resolveVisiblePerson } from "@/features/organizations/people/visiblePeople";

import { FileCardContextArea } from "../FileCardContextArea";
import type { FileScope } from "../FileScopeBar";
import { filterByScope } from "../FileScopeBar";
import { useFileItemActions } from "../useFileItemActions";
import type { FileKindAdapter } from "../types";
import type { HomeKind } from "./home-kinds";
import { RecordThumb } from "./RecordThumb";
import { FileHomeTable } from "./FileHomeTable";
import { GOOGLE_LIST_COLUMNS, GoogleFileList } from "./GoogleFileList";
import { useStickyHomeHeader } from "./useStickyHomeHeader";
import { useFileHomeBulk } from "./useFileHomeBulk";
import { HomeCardsSkeleton, HomePhoneRowsSkeleton, HomeTableSkeleton } from "./HomeSkeleton";
import {
  groupHomeItems,
  HOME_SORT_OPTIONS,
  homeDateLabel,
  matchesHomeQuery,
  sortHomeItems,
  type DatedItem,
  type HomeItem,
  type HomeSortKey,
} from "./recent";
import { useRecordsOpened } from "./useRecordsOpened";
import { HomeLookContext } from "./home-look";
import { useOfficeLook } from "../skin/useOfficeLook";
import { OfficeLookSwitch } from "../skin/OfficeLookSwitch";
import { OFFICE_ACCENT } from "../skin/office-look";

/** Google's owner filter, with our Starred and Trash beside it (same lists, same menu). */
const SCOPE_OPTIONS: ReadonlyArray<{ value: FileScope; label: string }> = [
  { value: "all", label: "Owned by anyone" },
  { value: "mine", label: "Owned by me" },
  { value: "shared", label: "Not owned by me" },
  { value: "starred", label: "Starred" },
  { value: "trash", label: "Trash" },
];

/** The Microsoft 365 look's tabs over the same lists (Office's Recent · Pinned · Shared with me). */
const OFFICE_TABS: ReadonlyArray<{ value: FileScope; label: string }> = [
  { value: "all", label: "Recent" },
  { value: "starred", label: "Pinned" },
  { value: "shared", label: "Shared with me" },
  { value: "mine", label: "Owned by me" },
  { value: "trash", label: "Trash" },
];

const SORT_KEYS = new Set<string>(HOME_SORT_OPTIONS.map((o) => o.value));

function useOwnerNames(ownerIds: readonly string[], userId: string | null): ReadonlyMap<string, string> {
  const [names, setNames] = useState<ReadonlyMap<string, string>>(new Map());
  const others = [...new Set(ownerIds.filter((id) => id && id !== userId))].sort().join(",");
  useEffect(() => {
    if (!others) return;
    let live = true;
    // The ONE "who is this account?" lookup (people I share an organization with), then the
    // profile name for anyone it cannot place (a file shared with me directly).
    const ids = others.split(",");
    void Promise.all(ids.map((id) => resolveVisiblePerson(id).catch(() => null))).then(async (people) => {
      const found = new Map<string, string>();
      people.forEach((p, i) => p?.name && found.set(ids[i], p.name));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length) (await fetchUserDisplayNames(missing)).forEach((name, id) => found.set(id, name));
      if (live) setNames(found);
    });
    return () => {
      live = false;
    };
  }, [others]);
  return names;
}

export interface FileHomeProps<Row extends { id: string; user_id: string }> {
  kind: HomeKind;
  adapter: FileKindAdapter<Row>;
  rows: Row[];
  toItem: (row: Row) => HomeItem<Row>;
  loading: boolean;
  error: string | null;
  scope: FileScope;
  onScopeChange: (scope: FileScope) => void;
  reload: () => void | Promise<void>;
  /** Saved list style: the hub's own key (and the device-local key it used before, if any). */
  viewPrefsKey: string;
  legacyViewPrefs?: LegacyListViewImport;
  /** The "Start a new …" band (built with `StartBand`). */
  startBand: ReactNode;
  /** Our Google strip, between the band and Recent. */
  googleStrip?: ReactNode;
  /** The folder icon in the Recent header: open the device's file picker (absent: no file import for this kind). */
  onPickFile?: () => void;
  pickingFile?: boolean;
  /** Small marks after the date on a card / in a row (Google link, table link, source file). */
  marksFor?: (row: Row, where: "card" | "table") => ReactNode;
  /**
   * A card's picture when the kind draws its own (a presentation's first slide); default is
   * `RecordThumb` (first sheet / first page).
   */
  thumbFor?: (row: Row) => ReactNode;
  /** The page's RouteHeader. */
  header: ReactNode;
  /**
   * Wraps the whole home (header included) — the page's agent surface, which reads the live list
   * state at run time.
   */
  wrap?: (state: FileHomeState<Row>, home: ReactNode) => ReactNode;
}

export interface FileHomeState<Row> {
  visible: Row[];
  query: string;
  sort: HomeSortKey;
  view: "cards" | "table";
}

/** A group plate paints a solid square behind its buttons (white on the Google Look's grey): the view and sort buttons are plain tap targets; only the "Open a file" row keeps the group. */
function SortGroup({ single, children }: { single: boolean; children: ReactNode }) {
  // The wrapper has no gap: tap buttons space themselves (a parent's gap is the dev-mode "TAP BUTTON MISUSE" outline).
  return single ? <div className="flex shrink-0 items-center">{children}</div> : <TapTargetButtonGroup surface="solid">{children}</TapTargetButtonGroup>;
}

export function FileHome<Row extends { id: string; user_id: string }>(props: FileHomeProps<Row>) {
  const { kind, adapter, rows, toItem, loading, error, scope, onScopeChange, reload } = props;
  const router = useRouter();
  const isPhone = useIsMobile();
  const [query, setQuery] = useState("");
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { prefs, setPrefs } = useListViewPrefs(
    props.viewPrefsKey,
    { view: "cards", sort: "opened" },
    props.legacyViewPrefs,
  );
  const [look, , lookSettled] = useOfficeLook();
  const office = look === "microsoft";
  // Office's start page is a list; the Google look keeps the person's grid ⇄ list choice.
  const view: "cards" | "table" = office || prefs.view === "table" ? "table" : "cards";
  const sort: HomeSortKey = SORT_KEYS.has(prefs.sort) ? (prefs.sort as HomeSortKey) : "opened";
  const trashed = scope === "trash";

  const { userId, starredIds, menuFor, sectionsFor, dialogs } = useFileItemActions(adapter, reload);
  const { opened } = useRecordsOpened(kind.entityType);
  const ownerNames = useOwnerNames(rows.map((r) => r.user_id), userId);

  const scoped = filterByScope(rows, scope, userId, starredIds).map(toItem);
  const matched = scoped.filter((i) => matchesHomeQuery(i, query));
  const sorted = sortHomeItems(matched, sort, opened, userId);
  const [now] = useState(() => Date.now());
  const groups = groupHomeItems(sorted, sort, now);
  const visibleRows = sorted.map((d) => d.item.row);

  const bulk = useFileHomeBulk({ kind, adapter, rows: sorted, userId, trashed, reload });
  // A selection belongs to the list it was ticked in: a new scope or search starts clean.
  const clearBulk = bulk.clear;
  useEffect(() => {
    clearBulk();
  }, [scope, query]);

  const ownerLabel = (ownerId: string) =>
    ownerId === userId ? "me" : (ownerNames.get(ownerId) ?? "Someone else");

  const open = (id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (navigatingId) return;
    setNavigatingId(id);
    startTransition(() => router.push(kind.href(id)));
  };

  // On a phone Google's heading is just "Recent" / "Starred" — the long form wraps to two lines at 375.
  const noun = isPhone && !office ? "" : ` ${kind.pluralNoun}`;
  const heading = trashed
    ? "Trash"
    : scope === "starred"
      ? office
        ? `Pinned ${kind.pluralNoun}`
        : `Starred${noun}`
      : `Recent${noun}`;
  const accent = OFFICE_ACCENT[kind.kind];
  const scrollToCreate = () =>
    document.getElementById(`file-home-create-${kind.kind}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const showList = !loading && !error && sorted.length > 0;

  // The Google Look's desktop list is Google's calm list (not the data table); its sticky row
  // names the time group under it. Office keeps its table (with bulk selection).
  const googleList = !office && !isPhone && view === "table";
  const groupLabels = new Map(groups.map((g) => [g.key, g.label]));
  const { sentinelRef: stickySentinelRef, barRef: stickyBarRef, groupRef: stickyGroupRef, stuck: stickyStuck, currentGroup: stickyCurrentGroup } = useStickyHomeHeader(googleList ? groups.map((g) => g.key) : [], `${lookSettled}:${look}:${view}:${isPhone}:${loading}:${showList}`);
  const stickyTitle = (stickyCurrentGroup ? groupLabels.get(stickyCurrentGroup) : groups[0]?.label) ?? heading;
  const dateHeading = sort === "title" ? "Last modified" : (HOME_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "");
  const sortControls = (
    <SortGroup single={!props.onPickFile}>
      {isPhone || office ? null : view === "cards" ? (
        <ListTapButton variant={props.onPickFile ? "group" : "transparent"} ariaLabel="List view" tooltip="List view" onClick={() => setPrefs({ view: "table" })} />
      ) : (
        <LayoutGridTapButton variant={props.onPickFile ? "group" : "transparent"} ariaLabel="Grid view" tooltip="Grid view" onClick={() => setPrefs({ view: "cards" })} />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ArrowDownUpTapButton
            variant={props.onPickFile ? "group" : "transparent"}
            ariaLabel={`Sort: ${HOME_SORT_OPTIONS.find((o) => o.value === sort)?.label ?? ""}`}
            tooltip="Sort options"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {HOME_SORT_OPTIONS.map((o) => (
            <DropdownMenuItem key={o.value} onSelect={() => setPrefs({ sort: o.value })}>
              <Check className={sort === o.value ? "size-3.5 text-primary" : "size-3.5 opacity-0"} aria-hidden />
              {o.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {props.onPickFile ? (
        <TapTargetButtonForGroup
          icon={props.pickingFile ? <Spinner size="xs" label="Opening" /> : <FolderOpen className="size-4" />}
          ariaLabel="Open a file from this device"
          tooltip="Open a file"
          disabled={props.pickingFile}
          onClick={props.onPickFile}
        />
      ) : null}
    </SortGroup>
  );

  // Until the person's saved look is read, the home is a placeholder — never the default look
  // flashing into theirs.
  const home = !lookSettled ? (
    <>
      {props.header}
      <div className="h-full overflow-y-auto scrollbar-none" data-file-home={kind.kind}>
        <div className="mx-auto w-full max-w-[72rem] px-3 pt-[calc(var(--shell-header-h)+0.75rem)] sm:px-6">
          <HomeCardsSkeleton label={`Loading ${kind.pluralNoun}`} />
        </div>
      </div>
    </>
  ) : (
    <HomeLookContext.Provider value={{ look, kind }}>
    {props.header}
    <div
      className={cn(
        "flex h-full",
        office &&
          "[--office-accent:var(--office-accent-light)] [font-family:'Segoe_UI',system-ui,sans-serif] dark:[--office-accent:var(--office-accent-dark)]",
      )}
      style={office ? ({ "--office-accent-light": accent.light, "--office-accent-dark": accent.dark } as CSSProperties) : undefined}
      data-office-look={look}
    >
    {office ? <OfficeAppRail kind={kind} onCreate={scrollToCreate} onPickFile={props.onPickFile} /> : null}
    <div className="h-full min-w-0 flex-1 overflow-y-auto scrollbar-none" data-file-home={kind.kind}>
      <div className="pt-[var(--shell-header-h)]">
        {/* Google's search: one big filled pill (48px, ~720px) centred over the page, the Look switch
            at the row's end. It stays here, not in the app header: the header is 44px (a 48px pill
            cannot sit in it) and its right side is the app's own icons. */}
        <div className="mx-auto flex w-full max-w-[80rem] items-center gap-3 px-3 pb-3 pt-2 sm:grid sm:grid-cols-[minmax(14rem,1fr)_minmax(0,45rem)_minmax(14rem,1fr)] sm:px-6">
          <span aria-hidden className="hidden sm:block" />
          <SearchField
            filled
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind.pluralNoun}`}
            aria-label={`Search ${kind.pluralNoun}`}
            className="min-w-0 flex-1"
          />
          <OfficeLookSwitch className="shrink-0 sm:justify-self-end" />
        </div>
        {trashed ? null : props.startBand}
        {trashed ? null : props.googleStrip ? (
          <div className="mx-auto w-full max-w-[72rem] px-3 pt-3 sm:px-6">{props.googleStrip}</div>
        ) : null}

        <section aria-label={heading} className="w-full pb-6 pt-3">
          <div ref={stickySentinelRef} aria-hidden className="h-0" />
          {/* Google's sticky header row: sticks under the app header in every view, lifts with Google's
              shadow only once stuck, and paints the strip above it (behind the see-through app header)
              so nothing scrolls visibly behind the header while it holds. */}
          <div
            ref={stickyBarRef}
            data-stuck={stickyStuck || undefined}
            className={cn(
              "sticky top-[var(--shell-header-h)] z-20 bg-background transition-shadow duration-200",
              stickyStuck && "shadow-md",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-full h-[var(--shell-header-h)] bg-background transition-opacity duration-200",
                stickyStuck ? "opacity-100" : "opacity-0",
              )}
            />
            <div className="mx-auto w-full max-w-[72rem] px-3 sm:px-6">
              {googleList ? (
                <div className={cn(GOOGLE_LIST_COLUMNS, "h-14 px-4")}>
                  <h2 className="truncate text-base font-medium text-foreground">{stickyTitle}</h2>
                  <Select aria-label="Show" variant="inline" value={scope} options={SCOPE_OPTIONS} onValueChange={(v) => onScopeChange(v)} align="start" />
                  <div className="col-span-2 flex min-w-0 items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{dateHeading}</span>
                    {sortControls}
                  </div>
                </div>
              ) : (
                <div className="flex h-14 items-center gap-2">
                  {office && !isPhone ? (
                    <>
                      <h2 className="sr-only">{heading}</h2>
                      <Tabs
                        aria-label="Show"
                        value={scope}
                        onValueChange={(v) => onScopeChange(v)}
                        data={OFFICE_TABS}
                        rule={false}
                        className="min-w-0 flex-1"
                      />
                    </>
                  ) : (
                    <>
                      <h2 className="line-clamp-2 min-w-0 flex-1 text-base font-medium leading-tight text-foreground">{heading}</h2>
                      <Select
                        aria-label="Show"
                        variant={office ? "field" : "inline"}
                        value={scope}
                        options={office ? OFFICE_TABS : SCOPE_OPTIONS}
                        onValueChange={(v) => onScopeChange(v)}
                        align="end"
                      />
                    </>
                  )}
                  {sortControls}
                </div>
              )}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[72rem] px-3 sm:px-6">
          {dialogs}
          {bulk.dialog}

          {loading ? (
            isPhone ? (
              <HomePhoneRowsSkeleton label={`Loading ${kind.pluralNoun}`} />
            ) : view === "cards" ? (
              <HomeCardsSkeleton label={`Loading ${kind.pluralNoun}`} />
            ) : (
              <HomeTableSkeleton label={`Loading ${kind.pluralNoun}`} />
            )
          ) : null}

          {error && !loading ? (
            <p className="flex items-center gap-1 py-6 text-sm text-destructive">
              {error}
              <ErrorAlchemyMenu error={error} />
            </p>
          ) : null}

          {!loading && !error && sorted.length === 0 ? (
            <EmptyState
              icon={<kind.Icon className="size-6" />}
              title={
                query.trim()
                  ? "Nothing matches your search"
                  : trashed
                    ? "Trash is empty"
                    : scope === "all"
                      ? `No ${kind.pluralNoun} yet`
                      : "Nothing here"
              }
            />
          ) : null}

          {showList && isPhone ? (
            <PhoneRows
              kind={kind}
              groups={groups}
              now={now}
              trashed={trashed}
              starredIds={starredIds}
              userId={userId}
              navigatingId={navigatingId}
              onOpen={open}
              menuFor={(row, control) => menuFor(row, trashed, control, { shareButton: false })}
              marksFor={props.marksFor}
            />
          ) : null}

          {showList && googleList ? (
            <GoogleFileList
              kind={kind}
              groups={groups}
              now={now}
              starredIds={starredIds}
              userId={userId}
              ownerLabel={ownerLabel}
              navigatingId={navigatingId}
              onOpen={open}
              menuFor={(row, control) => menuFor(row, trashed, control, { shareButton: false })}
              marksFor={props.marksFor}
              groupRef={stickyGroupRef}
            />
          ) : null}

          {showList && !isPhone && office ? (
            <FileHomeTable
              kind={kind}
              items={sorted}
              sort={sort}
              opened={opened}
              ownerLabel={ownerLabel}
              starredIds={starredIds}
              userId={userId}
              menuFor={(row) => menuFor(row, trashed)}
              sectionsFor={(payload) => sectionsFor(payload, trashed)}
              marksFor={props.marksFor}
              columns="office"
              selection={bulk.selection}
            />
          ) : null}

          {showList && !isPhone && view === "cards"
            ? groups.map((g, gi) => (
                <div key={g.key} className={gi > 0 ? "pt-2" : undefined}>
                  {g.label ? <h3 className={cn("pb-3 text-sm font-medium text-foreground", gi > 0 ? "pt-4" : "pt-1")}>{g.label}</h3> : null}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-4">
                    {g.items.map((d) => (
                      <FileCardContextArea key={d.item.id} className="grid min-w-0" menu={(control) => menuFor(d.item.row, trashed, control, { shareButton: false })}>
                        {(menu) => (
                          <RecentCard
                            kind={kind}
                            dated={d}
                            now={now}
                            menu={menu}
                            starred={starredIds.has(d.item.id)}
                            shared={userId !== null && d.item.ownerId !== userId}
                            navigating={navigatingId === d.item.id}
                            onOpen={open}
                            marks={props.marksFor?.(d.item.row, "card")}
                            thumb={props.thumbFor?.(d.item.row)}
                          />
                        )}
                      </FileCardContextArea>
                    ))}
                  </div>
                </div>
              ))
            : null}
          </div>
        </section>
      </div>
    </div>
    </div>
    </HomeLookContext.Provider>
  );
  return props.wrap ? props.wrap({ visible: visibleRows, query, sort, view }, home) : home;
}

/** The Microsoft 365 look's left app rail (Office on the web): the app tile, Home, Create, Open. */
function OfficeAppRail({ kind, onCreate, onPickFile }: { kind: HomeKind; onCreate: () => void; onPickFile?: () => void }) {
  const toTop = () =>
    document.querySelector(`[data-file-home="${kind.kind}"]`)?.scrollTo({ top: 0, behavior: "smooth" });
  return (
    <nav
      aria-label="App"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card pt-[calc(var(--shell-header-h)+0.5rem)] md:flex"
    >
      <span className="mb-2 flex size-9 items-center justify-center rounded-md bg-[var(--office-accent)] text-white" aria-hidden>
        <kind.Icon className="size-5" />
      </span>
      <Button variant="quiet" icon={<HomeIcon />} aria-label="Home" title="Home" aria-current="page" onClick={toTop} />
      <Button variant="quiet" icon={<Plus />} aria-label="Create" title="Create" onClick={onCreate} />
      {onPickFile ? <Button variant="quiet" icon={<FolderOpen />} aria-label="Open a file" title="Open a file" onClick={onPickFile} /> : null}
    </nav>
  );
}

function Navigating() {
  return (
    <span className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
      <Spinner size="sm" label="Opening" />
    </span>
  );
}

function RecentCard<Row>({
  kind,
  dated,
  now,
  menu,
  starred,
  shared,
  navigating,
  onOpen,
  marks,
  thumb,
}: {
  kind: HomeKind;
  dated: DatedItem<Row>;
  now: number;
  menu: ReactNode;
  starred: boolean;
  shared: boolean;
  navigating: boolean;
  onOpen: (id: string, e: React.MouseEvent) => void;
  marks?: ReactNode;
  thumb?: ReactNode;
}) {
  const { item } = dated;
  const href = kind.href(item.id);
  return (
    <div className="group/entity-ref relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/60">
      <Link href={href} onClick={(e) => onOpen(item.id, e)} className="block" aria-label={item.name} tabIndex={-1}>
        {thumb ? (
          // The card's picture box is fixed here (4:3), so a picture that mounts late never resizes the card.
          <div className="aspect-[4/3] w-full overflow-hidden border-b border-border">{thumb}</div>
        ) : (
          kind.kind === "presentation" ? null : (
            <RecordThumb kind={kind.kind} id={item.id} stamp={item.updatedAt} className="aspect-[4/3] w-full border-b border-border" />
          )
        )}
      </Link>
      <div className="flex min-w-0 flex-col gap-1 px-3 pb-2 pt-2">
        <Link
          href={href}
          onClick={(e) => onOpen(item.id, e)}
          className="truncate text-sm font-medium text-foreground"
          title={item.description ? `${item.name} — ${item.description}` : item.name}
        >
          {item.name}
        </Link>
        <div className="flex h-7 min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <kind.Icon className={cn("size-4 shrink-0", kind.iconTone)} aria-hidden />
          {shared ? <Users className="size-3.5 shrink-0" aria-label="Not owned by me" /> : null}
          {starred ? <Star className="size-3.5 shrink-0 fill-current text-warning" aria-label="Starred" /> : null}
          <span className="min-w-0 flex-1 truncate">
            {dated.verb} {homeDateLabel(dated.at, now)}
          </span>
          {marks ? <span className="flex shrink-0 items-center gap-1">{marks}</span> : null}
          <span className="matrx-touch-targets flex shrink-0 items-center">{menu}</span>
        </div>
      </div>
      {navigating ? <Navigating /> : null}
    </div>
  );
}

function PhoneRows<Row>({
  kind,
  groups,
  now,
  starredIds,
  userId,
  navigatingId,
  onOpen,
  menuFor,
  marksFor,
}: {
  kind: HomeKind;
  groups: ReturnType<typeof groupHomeItems<Row>>;
  now: number;
  trashed: boolean;
  starredIds: ReadonlySet<string>;
  userId: string | null;
  navigatingId: string | null;
  onOpen: (id: string, e: React.MouseEvent) => void;
  menuFor: (row: Row, control: { open: boolean; onOpenChange: (open: boolean) => void }) => ReactNode;
  marksFor?: (row: Row, where: "card" | "table") => ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label ? <h3 className="pb-1 pt-3 text-xs font-medium text-muted-foreground">{g.label}</h3> : null}
          <ul className="flex flex-col">
            {g.items.map((d) => (
              <li key={d.item.id}>
                <FileCardContextArea className="relative" menu={(control) => menuFor(d.item.row, control)}>
                  {(menu) => (
                    <div className="flex min-h-14 items-center gap-3 border-b border-border/60 py-1.5">
                      <Link
                        href={kind.href(d.item.id)}
                        onClick={(e) => onOpen(d.item.id, e)}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <kind.Icon className={cn("size-6 shrink-0", kind.iconTone)} aria-hidden />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-base text-foreground">{d.item.name}</span>
                          <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                            {userId !== null && d.item.ownerId !== userId ? <Users className="size-3 shrink-0" aria-label="Not owned by me" /> : null}
                            {starredIds.has(d.item.id) ? <Star className="size-3 shrink-0 fill-current text-warning" aria-label="Starred" /> : null}
                            <span className="truncate">
                              {d.verb} {homeDateLabel(d.at, now)}
                            </span>
                          </span>
                        </span>
                      </Link>
                      {/* Outside the Link: a mark is itself a link (Google), and a link never nests in a link. */}
                      <span className="flex shrink-0 items-center gap-1">{marksFor?.(d.item.row, "card")}</span>
                      <span className="matrx-touch-targets shrink-0">{menu}</span>
                      {navigatingId === d.item.id ? <Navigating /> : null}
                    </div>
                  )}
                </FileCardContextArea>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
