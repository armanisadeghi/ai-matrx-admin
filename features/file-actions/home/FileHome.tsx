"use client";

/**
 * FileHome — the Workbooks and Documents homes, ONE component set, modelled on the Google Sheets /
 * Google Docs home: a search box, the "Start a new …" template band, our Google strip, then
 * "Recent …" with the owner filter (plus Starred and Trash), grid ⇄ list, Google's four sorts and
 * the upload door, grouped Today / Previous 7 days / Previous 30 days / Earlier.
 *
 * Grid cards show the file's real first page / first sheet (`RecordThumb`). The desktop list is the
 * canonical table (Google's columns first: Name, Owner, Last opened by me; every older column kept,
 * every column sorts and filters). A phone gets Google's mobile list.
 *
 * The page keeps what is its own (load, create, import, the Google strip's data) and hands it in.
 * Every per-file action is the shared file menu (`useFileItemActions`), on ⋮ and on right-click.
 *
 * The Microsoft 365 look (the person's Office look setting, switched right here or in Settings) is
 * a skin of this same home — Excel / Word / PowerPoint on the web's start page: a left app rail,
 * "Create" with Blank workbook/document/presentation and the templates, Recent · Pinned · Shared
 * with me tabs over a Name / Opened / Owner list, the app's colour and type. Same data, same menus.
 */

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, FolderOpen, Home as HomeIcon, Plus, Star, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { Button, EmptyState, RegionSkeleton, SearchField, Select, Tabs } from "@ai-matrx/design-system/controls";
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

import { FileCardContextArea } from "../FileCardContextArea";
import type { FileScope } from "../FileScopeBar";
import { filterByScope } from "../FileScopeBar";
import { useFileItemActions } from "../useFileItemActions";
import type { FileKindAdapter } from "../types";
import type { HomeKind } from "./home-kinds";
import { RecordThumb } from "./RecordThumb";
import { FileHomeTable } from "./FileHomeTable";
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
    void fetchUserDisplayNames(others.split(",")).then((m) => live && setNames(m));
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
  const now = Date.now();
  const groups = groupHomeItems(sorted, sort, now);
  const visibleRows = sorted.map((d) => d.item.row);

  const ownerLabel = (ownerId: string) =>
    ownerId === userId ? "me" : (ownerNames.get(ownerId) ?? "Someone else");

  const open = (id: string, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (navigatingId) return;
    setNavigatingId(id);
    startTransition(() => router.push(kind.href(id)));
  };

  const heading = trashed
    ? "Trash"
    : scope === "starred"
      ? office
        ? `Pinned ${kind.pluralNoun}`
        : `Starred ${kind.pluralNoun}`
      : `Recent ${kind.pluralNoun}`;
  const accent = OFFICE_ACCENT[kind.kind];
  const scrollToCreate = () =>
    document.getElementById(`file-home-create-${kind.kind}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const showList = !loading && !error && sorted.length > 0;

  // Until the person's saved look is read, the home is a placeholder — never the default look
  // flashing into theirs.
  const home = !lookSettled ? (
    <>
      {props.header}
      <div className="h-full overflow-y-auto scrollbar-none" data-file-home={kind.kind}>
        <div className="mx-auto w-full max-w-[72rem] px-3 pt-[calc(var(--shell-header-h)+0.75rem)] sm:px-6">
          <RegionSkeleton shape="cards" count={6} aria-label={`Loading ${kind.pluralNoun}`} />
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
        <div className="mx-auto flex w-full max-w-[72rem] items-center gap-2 px-3 pb-2 pt-1 sm:px-6">
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${kind.pluralNoun}`}
            aria-label={`Search ${kind.pluralNoun}`}
            className="mx-auto min-w-0 max-w-2xl flex-1"
          />
          <OfficeLookSwitch className="shrink-0" />
        </div>
        {trashed ? null : props.startBand}
        {trashed ? null : props.googleStrip ? (
          <div className="mx-auto w-full max-w-[72rem] px-3 pt-3 sm:px-6">{props.googleStrip}</div>
        ) : null}

        <section aria-label={heading} className="mx-auto w-full max-w-[72rem] px-3 pb-6 pt-3 sm:px-6">
          <div className="flex h-10 items-center gap-2">
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
                <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{heading}</h2>
                <Select
                  aria-label="Show"
                  value={scope}
                  options={office ? OFFICE_TABS : SCOPE_OPTIONS}
                  onValueChange={(v) => onScopeChange(v)}
                  align="end"
                />
              </>
            )}
            <TapTargetButtonGroup surface="solid">
              {isPhone || office ? null : view === "cards" ? (
                <ListTapButton variant="group" ariaLabel="List view" tooltip="List view" onClick={() => setPrefs({ view: "table" })} />
              ) : (
                <LayoutGridTapButton variant="group" ariaLabel="Grid view" tooltip="Grid view" onClick={() => setPrefs({ view: "cards" })} />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ArrowDownUpTapButton
                    variant="group"
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
            </TapTargetButtonGroup>
          </div>
          {dialogs}

          {loading ? (
            view === "cards" && !isPhone ? (
              <div className="pt-2"><RegionSkeleton shape="cards" count={6} aria-label={`Loading ${kind.pluralNoun}`} /></div>
            ) : (
              <div className="pt-2"><RegionSkeleton shape="rows" count={6} twoLine aria-label={`Loading ${kind.pluralNoun}`} /></div>
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
              menuFor={(row, control) => menuFor(row, trashed, control)}
              marksFor={props.marksFor}
            />
          ) : null}

          {showList && !isPhone && view === "table" ? (
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
              columns={office ? "office" : "google"}
            />
          ) : null}

          {showList && !isPhone && view === "cards"
            ? groups.map((g) => (
                <div key={g.key} className="pt-2">
                  {g.label ? <h3 className="pb-2 pt-3 text-xs font-medium text-muted-foreground">{g.label}</h3> : null}
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
        {thumb ?? (
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
