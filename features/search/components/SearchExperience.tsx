"use client";

/**
 * SearchExperience — THE search page (universal search, 2026-10-14). One
 * component renders `/search` (signed-in) and `/scraper/search`; each route
 * keeps its own surface mount around it.
 *
 * Google's shape, borrowed where it helps: before a search, a 48px pill at the
 * calm centre with the tabs under it; after one, the pill at the top, the tabs
 * under it, results below. The pill understands what it was given (words, a
 * @handle, a profile/post/page link, an image — `useSearchInputs`), and a
 * quiet camera inside it searches by image.
 *
 * Tabs: All · News · Images · Videos · Places · Social · Shopping · Jobs ·
 * Trends. The engine switch (Matrx | Google | Both) belongs only to the tabs
 * both engines answer; elsewhere it is held invisible so nothing shifts.
 * Everything renders through registered kind components; admin debuggers get
 * an Inspector (request + raw) on every door.
 *
 * Spend: a Matrx search is free and re-runs on a tab change. Google-only tabs
 * and Social wait for an explicit press; the empty Social tab loads
 * "Trending now" (a capped call).
 */

import { useRef, useState } from "react";
import { formatDurationMs } from "@ai-matrx/kit/format";
import {
  Braces,
  Camera,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Info,
  Link2,
  MapPinOff,
  RotateCcw,
  ScanSearch,
  Search,
  SearchX,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  LoadingTapButton,
  SearchTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import { TapTargetButtonTransparent } from "@ai-matrx/design-system/tap-target";
import {
  Button,
  ClampedNumberInput,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
} from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { ProInput } from "@/components/official/ProInput";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";
import {
  SearchKindNested,
  hasCanonicalSearchComponent,
} from "@/components/mardown-display/blocks/search-kinds/SearchKindNested";
import { SearchResultsSkeleton } from "@/features/search/components/SearchResultsSkeleton";
import { ScraperHookErrorDetails } from "@/features/scraper/parts/ScraperHookErrorDetails";
import { ScrapeFailureNotice } from "@/features/scraper/parts/ScrapeFailureNotice";
import { ScrapedContentPretty } from "@/features/scraper/parts/ScrapedContentPretty";
import {
  KEYWORD_SOCIAL_PLATFORMS,
  kindToSearchItems,
  type KeywordEngineRun,
  type KeywordSearchEngine,
  type KeywordSearchOptions,
  type UseScraperKeywordSearchFormReturn,
} from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import { SEARCH_LAB_PAGE_MAX } from "@/features/scraper/utils/search-lab-url";
import {
  RESULT_LIMIT_DEFAULT,
  RESULT_LIMIT_MAX,
  RESULT_LIMIT_MIN,
} from "@/features/scraper/scrape-command";
import {
  SEARCH_ENGINE_LABEL,
  tabHasEngineChoice,
  type SearchDevice,
  type SearchOutcome,
  type SearchSafeSearch,
  type SearchTab,
  type SearchTranslationDrop,
  type SocialSearchPlatform,
} from "@/features/search/types";
import {
  HANDLE_LOOKUP_PLATFORMS,
  siteOf,
} from "@/features/search/input-understanding";
import type {
  SearchSpecialView,
  UseSearchInputsReturn,
} from "@/features/search/hooks/useSearchInputs";
import { PlatformMark, platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";

// ── Vocabulary ──────────────────────────────────────────────────────────────

const ENGINE_OPTIONS = [
  { value: "brave", label: SEARCH_ENGINE_LABEL.brave },
  { value: "google", label: SEARCH_ENGINE_LABEL.google },
  { value: "compare", label: "Both" },
] as const satisfies readonly { value: KeywordSearchEngine; label: string }[];

export const SEARCH_TAB_LABEL: Record<SearchTab, string> = {
  web: "All",
  news: "News",
  images: "Images",
  videos: "Videos",
  places: "Places",
  social: "Social",
  shopping: "Shopping",
  jobs: "Jobs",
  trends: "Trends",
};

const TAB_OPTIONS = (Object.keys(SEARCH_TAB_LABEL) as SearchTab[]).map(
  (value) => ({ value, label: SEARCH_TAB_LABEL[value] }),
);

const SOCIAL_PLATFORM_OPTIONS = KEYWORD_SOCIAL_PLATFORMS.map((value) => ({
  value,
  label: value === "all" ? "All" : platformLabel(value),
  icon:
    value === "all" ? undefined : <PlatformMark platform={value} size={14} />,
}));

const COUNTRY_OPTIONS = [
  ["us", "United States"],
  ["gb", "United Kingdom"],
  ["ca", "Canada"],
  ["au", "Australia"],
  ["de", "Germany"],
  ["fr", "France"],
  ["es", "Spain"],
  ["it", "Italy"],
  ["nl", "Netherlands"],
  ["br", "Brazil"],
  ["mx", "Mexico"],
  ["in", "India"],
  ["jp", "Japan"],
  ["kr", "South Korea"],
  ["ae", "UAE"],
  ["ir", "Iran"],
].map(([value, label]) => ({ value, label }));

const LANGUAGE_OPTIONS = [
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["pt", "Portuguese"],
  ["nl", "Dutch"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["ar", "Arabic"],
  ["fa", "Persian"],
  ["hi", "Hindi"],
].map(([value, label]) => ({ value, label }));

const TIME_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "day", label: "Past day" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
] as const;

const SAFE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "moderate", label: "Moderate" },
  { value: "strict", label: "Strict" },
] as const satisfies readonly { value: SearchSafeSearch; label: string }[];

const DEVICE_OPTIONS = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
] as const satisfies readonly { value: SearchDevice; label: string }[];

/** One measure for the header and the results — they line up. */
const PAGE_WIDTH = "max-w-6xl";
/** Google's search box measure. */
const PILL_WIDTH = "max-w-[692px]";

/** A code the short list lacks (from a shared link) still shows as itself. */
function withCurrent(list: { value: string; label: string }[], current: string) {
  return list.some((o) => o.value === current)
    ? list
    : [{ value: current, label: current.toUpperCase() }, ...list];
}

function clampCount(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return RESULT_LIMIT_DEFAULT;
  return Math.min(RESULT_LIMIT_MAX, Math.max(RESULT_LIMIT_MIN, n));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** How many things a result holds — items for lists, points for a trend. */
export function countResult(query: string, result: Record<string, unknown>): number {
  if (result.__kind === "trend_report") {
    const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
    return len(result.series) + len(result.rising) + len(result.top);
  }
  return kindToSearchItems(query, result).length;
}

/** What a run is called on screen: the engine on engine tabs, else the tab. */
function runLabel(run: KeywordEngineRun, tab: SearchTab, query: string): string {
  if (run.provider === "social") return query ? "Social" : "Trending now";
  if (!tabHasEngineChoice(tab)) return SEARCH_TAB_LABEL[tab];
  return SEARCH_ENGINE_LABEL[run.provider];
}

/**
 * A kind instance through its ONE component: the compiled canonical one for
 * the search family (a db override still wins inside the seam), the registry
 * route for every other kind (e.g. search-by-image).
 */
export function SearchKindView({ value }: { value: Record<string, unknown> }) {
  const kind = typeof value.__kind === "string" ? value.__kind : "";
  if (kind && hasCanonicalSearchComponent(kind)) {
    return <SearchKindNested value={value} />;
  }
  return <KindInstanceRender kind={kind} value={value} variant="bare" />;
}

// ── The pill ────────────────────────────────────────────────────────────────

const PILL_HINT: Record<string, string> = {
  handle: "Enter to look up this account",
  profile: "Enter to look up this profile",
  post: "Enter to open this post",
  link: "Enter to read this page",
  image: "Enter to search by this image",
};

function SearchPill({
  form,
  inputs,
  onQuery,
  onClear,
  autoFocus,
}: {
  form: UseScraperKeywordSearchFormReturn;
  inputs: UseSearchInputsReturn;
  onQuery: (value: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
}) {
  const { keywords, isLoading, isLocating, vertical } = form;
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = isLoading || isLocating;
  const canSearch = (keywords.trim() !== "" || vertical === "social") && !busy;

  const pickImage = (file: File | undefined | null) => {
    if (file && file.type.startsWith("image/")) inputs.searchByImage(file);
  };

  return (
    <div className="flex h-12 w-full min-w-0 items-center rounded-full border border-border bg-card pl-1.5 pr-1.5 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md">
      {busy ? (
        <LoadingTapButton
          variant="transparent"
          ariaLabel="Searching"
          tooltip={false}
          className="text-primary"
        />
      ) : (
        <SearchTapButton
          variant="transparent"
          ariaLabel="Search"
          tooltip="Search"
          disabled={!canSearch}
          onClick={inputs.submit}
          className="text-muted-foreground"
        />
      )}
      <ProInput
        id="search-query"
        aria-label="Search"
        enableCleanup={false}
        placeholder="Search, paste a link or @handle"
        value={keywords}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !busy) inputs.submit();
        }}
        onPaste={(e) => {
          const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
            f.type.startsWith("image/"),
          );
          if (file) {
            e.preventDefault();
            pickImage(file);
          }
        }}
        clearable
        onClear={onClear}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        wrapperClassName="min-w-0 flex-1"
        className="h-11 border-0 bg-transparent px-1.5 shadow-none placeholder:text-base focus-visible:ring-0"
      />
      <TapTargetButtonTransparent
        icon={<Camera />}
        ariaLabel="Search by image"
        tooltip="Search by image"
        onClick={() => fileRef.current?.click()}
        className="text-muted-foreground"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          pickImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── The page ────────────────────────────────────────────────────────────────

export interface SearchExperienceProps {
  form: UseScraperKeywordSearchFormReturn;
  inputs: UseSearchInputsReturn;
  /** Which route hosts it — the scraper route adds its scrape doors. */
  surface: "search" | "scraper";
}

export function SearchExperience({ form, inputs, surface }: SearchExperienceProps) {
  const {
    keywords,
    setKeywords,
    engine,
    setEngine,
    vertical,
    setVertical,
    socialPlatform,
    setSocialPlatform,
    options,
    setOption,
    changedOptionCount,
    runs,
    lastRequest,
    isStale,
    isLoading,
    handleSearch,
    handleClear,
    errorDiagnostics,
    locationNote,
  } = form;
  const { special } = inputs;

  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  // A link that carries a query opens on the results layout — never the
  // start screen for one frame.
  const [pinnedTop, setPinnedTop] = useState(() => keywords.trim() !== "");

  const engineChoice = tabHasEngineChoice(vertical);

  /** Run the current tab now (an explicit press). */
  const runTab = (tab: SearchTab, overrides: Partial<Parameters<typeof handleSearch>[0]> = {}) => {
    inputs.clearSpecial();
    setPinnedTop(true);
    void handleSearch({ vertical: tab, options: { ...options, page: 1 }, ...overrides });
  };

  const onTab = (next: SearchTab) => {
    setVertical(next);
    if (options.page !== 1) setOption("page", 1);
    if (isLoading) return;
    // The empty Social tab is "Trending now".
    if (next === "social" && !keywords.trim()) {
      runTab("social", { query: "" });
      return;
    }
    // A Matrx re-run is free; everything else waits for a press. Only when
    // the inputs still match the last run — unsubmitted edits never ride
    // along on a tab change.
    const words = keywords.trim() !== "" && inputs.pendingMode === "words";
    if (
      words &&
      lastRequest &&
      !isStale &&
      engine === "brave" &&
      tabHasEngineChoice(next)
    ) {
      runTab(next);
    }
  };

  const onQuery = (value: string) => {
    setKeywords(value);
    if (options.page !== 1) setOption("page", 1);
  };

  // × clears the query, the results and any action: back to the start screen.
  const onClear = () => {
    setKeywords("");
    handleClear();
    inputs.clearSpecial();
    setPinnedTop(false);
  };

  const onDrop = (e: React.DragEvent) => {
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (file) {
      e.preventDefault();
      setPinnedTop(true);
      inputs.searchByImage(file);
    }
  };
  const dragProps = {
    onDragOver: (e: React.DragEvent) => {
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        setDragging(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDragging(false);
    },
    onDrop,
  };

  const home = runs.length === 0 && !special && !pinnedTop;
  const compare = runs.length > 1;

  // The engine switch is held (invisible, inert) on tabs no engine choice
  // applies to, so the row never shifts as tabs change.
  const engineControls = (
    <div className="flex items-center gap-1">
      <div
        className={cn(!engineChoice && "invisible")}
        aria-hidden={!engineChoice}
        inert={!engineChoice}
      >
        <SegmentedControl
          aria-label="Search engine"
          value={engine}
          onValueChange={setEngine}
          data={ENGINE_OPTIONS}
        />
      </div>
      <Button
        variant="quiet"
        icon={<SlidersHorizontal />}
        pressed={optionsOpen}
        badge={changedOptionCount > 0}
        title={changedOptionCount > 0 ? `Options · ${changedOptionCount} changed` : "Options"}
        onClick={() => setOptionsOpen((v) => !v)}
        aria-label={changedOptionCount > 0 ? `Options, ${changedOptionCount} changed` : "Options"}
        aria-expanded={optionsOpen}
      >
        Options
      </Button>
    </div>
  );

  const placesLocation = vertical === "places" && (
    <ProInput
      aria-label="Location"
      enableCleanup={false}
      placeholder="Location, e.g. Austin, Texas"
      value={options.location ?? ""}
      onChange={(e) => setOption("location", e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isLoading) inputs.submit();
      }}
      wrapperClassName="w-full sm:w-64"
      className="h-8 text-sm"
    />
  );

  const optionsPanel = optionsOpen && <SearchOptions form={form} />;

  const hintMode = inputs.pendingMode !== "words" ? inputs.pendingMode : null;
  const statusLine = (
    <span className="min-w-0 truncate text-xs text-muted-foreground">
      {hintMode
        ? PILL_HINT[hintMode]
        : isStale && runs.length > 0 && !isLoading && !special
          ? "Inputs changed — press Enter"
          : null}
    </span>
  );

  const dropVeil = dragging && (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/80">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <ImageIcon className="h-5 w-5 text-primary" />
        Drop an image to search with it
      </span>
    </div>
  );

  if (home) {
    // The start screen — Google's calm centre. The box sits at a fixed
    // height, so opening Options grows the page downward and never moves it.
    return (
      <div className="relative flex-1 overflow-auto px-4" {...dragProps}>
        {dropVeil}
        <div className={cn("mx-auto w-full space-y-4 pb-16 pt-[18vh] sm:pt-[24vh]", PILL_WIDTH)}>
          <SearchPill form={form} inputs={inputs} onQuery={onQuery} onClear={onClear} autoFocus />
          <div className="flex min-h-4 justify-center">{statusLine}</div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Tabs
              aria-label="Result type"
              variant="capsule"
              className="flex-wrap justify-center"
              value={vertical}
              onValueChange={onTab}
              data={TAB_OPTIONS}
            />
            {engineControls}
          </div>
          {placesLocation && <div className="flex justify-center">{placesLocation}</div>}
          {optionsPanel}
        </div>
      </div>
    );
  }

  const tabStale =
    !special &&
    lastRequest !== null &&
    lastRequest.vertical !== vertical &&
    !isLoading;
  const showRuns = !special && runs.length > 0 && !tabStale;

  return (
    <>
      <div className="flex-shrink-0 border-b border-border/60 px-3 pt-3 sm:px-4">
        <div className={cn("mx-auto space-y-1", PAGE_WIDTH)}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className={cn("w-full min-w-0 sm:flex-1", PILL_WIDTH)}>
              <SearchPill form={form} inputs={inputs} onQuery={onQuery} onClear={onClear} />
            </div>
            {engineControls}
          </div>

          <div className="flex min-h-10 min-w-0 items-center gap-x-3 gap-y-1">
            {/* Nine tabs scroll sideways on a phone, Google's way. */}
            <div className="min-w-0 max-w-full shrink overflow-x-auto scrollbar-none">
              <Tabs
                aria-label="Result type"
                className="overflow-visible"
                value={vertical}
                rule={false}
                onValueChange={onTab}
                data={TAB_OPTIONS}
              />
            </div>
            <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
              {placesLocation}
              {statusLine}
              {locationNote && (
                <p className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <MapPinOff className="h-3.5 w-3.5 shrink-0" />
                  {locationNote}
                </p>
              )}
            </div>
          </div>
          {placesLocation && <div className="pb-2 md:hidden">{placesLocation}</div>}

          {optionsPanel && <div className="pb-3">{optionsPanel}</div>}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5" {...dragProps}>
        {dropVeil}
        <div className={cn("mx-auto space-y-4", PAGE_WIDTH)}>
          {vertical === "social" && !special && (
            <Tabs
              aria-label="Social platform"
              variant="capsule"
              className="flex-wrap"
              value={socialPlatform}
              onValueChange={(next: SocialSearchPlatform) => {
                setSocialPlatform(next);
                if (!isLoading && (lastRequest?.vertical === "social")) {
                  runTab("social", { socialPlatform: next });
                }
              }}
              data={SOCIAL_PLATFORM_OPTIONS}
            />
          )}

          {special ? (
            <SpecialPanel
              special={special}
              inputs={inputs}
              form={form}
              surface={surface}
              onSearchWords={(query) => runTab("web", { query })}
            />
          ) : showRuns ? (
            <div className={cn(compare && "grid gap-x-8 gap-y-10 lg:grid-cols-2")}>
              {runs.map((run) => (
                <RunColumn
                  key={run.provider}
                  run={run}
                  tab={lastRequest?.vertical ?? vertical}
                  query={lastRequest?.query ?? keywords.trim()}
                  onRetry={
                    run.provider === "brave" && engine === "brave"
                      ? () => void handleSearch()
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <TabCallToAction
              tab={vertical}
              query={keywords.trim()}
              onRun={() => runTab(vertical)}
            />
          )}

          {errorDiagnostics && isAdminDebugger && !special && (
            <ScraperHookErrorDetails diagnostics={errorDiagnostics} />
          )}
        </div>
      </div>
    </>
  );
}

/** The waiting state for a tab: an explicit door for tabs that spend, a hint otherwise. */
function TabCallToAction({
  tab,
  query,
  onRun,
}: {
  tab: SearchTab;
  query: string;
  onRun: () => void;
}) {
  const label = SEARCH_TAB_LABEL[tab];
  const icon = tab === "trends" ? TrendingUp : tab === "social" ? UserRound : Search;
  const Icon = icon;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon className="h-6 w-6 text-muted-foreground" />
      {query ? (
        <Button variant="primary" icon={<Search />} onClick={onRun}>
          {`Search ${tab === "web" ? "" : `${label.toLowerCase()} `}for “${query.length > 40 ? `${query.slice(0, 40)}…` : query}”`}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Type something to search {tab === "web" ? "the web" : label.toLowerCase()}
        </p>
      )}
    </div>
  );
}

// ── Options ─────────────────────────────────────────────────────────────────

function OptionCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex h-8 min-w-0 items-center">{children}</div>
    </div>
  );
}

function SearchOptions({ form }: { form: UseScraperKeywordSearchFormReturn }) {
  const { options, setOption, engine, vertical, maxResults, setMaxResults } = form;
  const aiAllowed = engine !== "google" && vertical === "web";
  const set =
    <K extends keyof KeywordSearchOptions>(key: K) =>
    (value: KeywordSearchOptions[K]) =>
      setOption(key, value);

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
      <OptionCell label="Country">
        <Select
          aria-label="Country"
          value={options.country}
          options={withCurrent(COUNTRY_OPTIONS, options.country)}
          onValueChange={set("country")}
        />
      </OptionCell>
      <OptionCell label="Language">
        <Select
          aria-label="Language"
          value={options.language}
          options={withCurrent(LANGUAGE_OPTIONS, options.language)}
          onValueChange={set("language")}
        />
      </OptionCell>
      <OptionCell label="How many">
        <ClampedNumberInput
          aria-label="How many"
          value={clampCount(maxResults)}
          onChange={(v) => setMaxResults(String(v))}
          min={RESULT_LIMIT_MIN}
          max={RESULT_LIMIT_MAX}
          className="w-20"
        />
      </OptionCell>
      <OptionCell label="Page">
        <ClampedNumberInput
          aria-label="Page"
          value={options.page}
          onChange={set("page")}
          min={1}
          max={SEARCH_LAB_PAGE_MAX}
          className="w-20"
        />
      </OptionCell>
      <OptionCell label="Time range">
        <Select
          aria-label="Time range"
          value={options.timeRange ?? "any"}
          options={TIME_OPTIONS}
          onValueChange={(v) => setOption("timeRange", v === "any" ? null : v)}
        />
      </OptionCell>
      <OptionCell label="Device">
        <SegmentedControl
          aria-label="Device"
          value={options.device}
          onValueChange={set("device")}
          data={DEVICE_OPTIONS}
        />
      </OptionCell>
      <OptionCell label="Safe search" className="col-span-2">
        <SegmentedControl
          aria-label="Safe search"
          value={options.safeSearch}
          onValueChange={set("safeSearch")}
          data={SAFE_OPTIONS}
        />
      </OptionCell>
      {vertical !== "places" && (
        <OptionCell label="Location" className="col-span-2">
          <ProInput
            aria-label="Location"
            enableCleanup={false}
            placeholder="City, region or address"
            value={options.location ?? ""}
            onChange={(e) => setOption("location", e.target.value)}
            wrapperClassName="w-full"
            className="h-8 text-sm"
          />
        </OptionCell>
      )}
      <OptionCell label="AI answer">
        <Switch
          aria-label="AI answer"
          checked={options.aiAnswer && aiAllowed}
          disabled={!aiAllowed}
          onCheckedChange={(v) => setOption("aiAnswer", v)}
          title={aiAllowed ? "Add an AI answer" : "Not offered here"}
        />
      </OptionCell>
      <OptionCell label="Use my location" className="col-span-2">
        <div className="flex min-w-0 items-center gap-2">
          <Switch
            aria-label="Use my location"
            checked={options.nearMe}
            disabled={form.isLocating}
            onCheckedChange={(v) => void form.setNearMe(v)}
            title="Search near where you are"
          />
          {form.locationNote && (
            <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPinOff className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{form.locationNote}</span>
            </span>
          )}
        </div>
      </OptionCell>
      <OptionCell label="Defaults">
        <Button
          variant="quiet"
          icon={<RotateCcw />}
          disabled={form.changedOptionCount === 0}
          onClick={form.resetOptions}
        >
          Reset
        </Button>
      </OptionCell>
    </div>
  );
}

// ── One run's column ────────────────────────────────────────────────────────

function RunColumn({
  run,
  tab,
  query,
  onRetry,
}: {
  run: KeywordEngineRun;
  tab: SearchTab;
  query: string;
  onRetry?: () => void;
}) {
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const { outcome } = run;
  const hits = outcome ? countResult(query, outcome.result) : 0;
  const notes = outcome?.ignoredOptions ?? [];
  const label = runLabel(run, tab, query);
  const isWeb = outcome?.result.__kind === "web_search_results" || (outcome && !outcome.result.__kind);

  return (
    <section className="min-w-0 space-y-3" aria-label={`${label} results`}>
      <ResultLine
        label={label}
        phase={run.phase}
        hits={outcome ? hits : null}
        elapsedMs={outcome?.elapsedMs ?? null}
        unit={outcome?.result.__kind === "trend_report" ? "data points" : "results"}
        inspect={
          isAdminDebugger
            ? { open: inspectorOpen, toggle: () => setInspectorOpen((v) => !v), notes: notes.length }
            : null
        }
      />

      {notes.length > 0 && <SearchNotes notes={notes} />}

      {isAdminDebugger && inspectorOpen && (
        <OutcomeInspector outcome={outcome} phase={run.phase} includedRaw={run.includedRaw} />
      )}

      {run.phase === "error" && (
        <ErrorNotice
          title="That search didn't come back"
          message={run.error ?? "The search failed."}
          size="compact"
          actions={
            onRetry ? (
              <Button variant="quiet" icon={<RotateCcw />} onClick={onRetry}>
                Try again
              </Button>
            ) : undefined
          }
        />
      )}

      {run.phase === "searching" && !outcome && <SearchResultsSkeleton query={query} bare />}

      {outcome &&
        (isWeb ? (
          // The result line already names the engine and count.
          <div className="[&_[data-search-collection-header]]:hidden">
            <KindInstanceRender kind="web_search_results" value={outcome.result} variant="bare" />
          </div>
        ) : (
          <SearchKindView value={outcome.result} />
        ))}

      {outcome && hits === 0 && run.phase === "done" && <NoResults />}
    </section>
  );
}

function NoResults() {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-12 text-center">
      <SearchX className="mb-1 h-6 w-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">No results</p>
      <p className="text-xs text-muted-foreground">Try other words, another tab or fewer options.</p>
    </div>
  );
}

function ResultLine({
  label,
  phase,
  hits,
  elapsedMs,
  unit,
  inspect,
  trailing,
}: {
  label: string;
  phase: "idle" | "searching" | "working" | "uploading" | "done" | "error";
  hits: number | null;
  elapsedMs: number | null;
  unit?: string;
  inspect: { open: boolean; toggle: () => void; notes: number } | null;
  trailing?: React.ReactNode;
}) {
  const busy = phase === "searching" || phase === "working" || phase === "uploading";
  return (
    <div className="flex h-8 min-w-0 items-center gap-2 border-b border-border/60 text-xs">
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          phase === "error" ? "bg-destructive" : busy ? "animate-pulse bg-primary" : "bg-success",
        )}
      />
      <span className="truncate text-sm font-medium text-foreground">{label}</span>
      <span className="min-w-0 truncate tabular-nums text-muted-foreground">
        {busy && hits === null
          ? phase === "uploading"
            ? "Uploading…"
            : "Searching…"
          : phase === "error"
            ? "Didn't come back"
            : hits !== null
              ? `${hits} ${hits === 1 ? (unit ?? "results").replace(/s$/, "") : (unit ?? "results")}${
                  elapsedMs !== null
                    ? ` · ${formatDurationMs(elapsedMs, { style: "compact", precision: "fine" })}`
                    : ""
                }`
              : null}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {trailing}
        {inspect && (
          <Button
            variant="quiet"
            icon={<Braces />}
            pressed={inspect.open}
            onClick={inspect.toggle}
            meta={inspect.notes > 0 ? inspect.notes : undefined}
            title="Request, raw response and notes"
          >
            Inspect
          </Button>
        )}
      </span>
    </div>
  );
}

function SearchNotes({ notes }: { notes: string[] }) {
  return (
    <div className="flex items-start gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-medium text-foreground">Search notes: </span>
        {notes.join(" · ")}
      </span>
    </div>
  );
}

// ── Actions the box understood (handle, profile, page, image) ──────────────

function SpecialPanel({
  special,
  inputs,
  form,
  surface,
  onSearchWords,
}: {
  special: SearchSpecialView;
  inputs: UseSearchInputsReturn;
  form: UseScraperKeywordSearchFormReturn;
  surface: "search" | "scraper";
  onSearchWords: (query: string) => void;
}) {
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const inspect = (outcome: SearchOutcome | null) =>
    isAdminDebugger
      ? { open: inspectorOpen, toggle: () => setInspectorOpen((v) => !v), notes: outcome?.ignoredOptions.length ?? 0 }
      : null;

  if (special.type === "handle") {
    return (
      <section className="space-y-3" aria-label={`Look up @${special.handle}`}>
        <p className="text-sm text-foreground">
          Look up <span className="font-medium">@{special.handle}</span> on
        </p>
        <div className="flex flex-wrap gap-2">
          {HANDLE_LOOKUP_PLATFORMS.map((platform) => (
            <Button
              key={platform}
              variant="outline"
              icon={<PlatformMark platform={platform} size={16} />}
              onClick={() => inputs.lookUpProfile(platform, special.handle)}
            >
              {platformLabel(platform)}
            </Button>
          ))}
        </div>
        <Button variant="quiet" icon={<Search />} onClick={() => onSearchWords(`@${special.handle}`)}>
          {`Search the web for @${special.handle}`}
        </Button>
      </section>
    );
  }

  if (special.type === "profile") {
    const where = platformLabel(special.platform);
    return (
      <section className="space-y-3" aria-label={`@${special.handle} on ${where}`}>
        <ResultLine
          label={`@${special.handle} on ${where}`}
          phase={special.phase}
          hits={special.outcome ? countResult("", special.outcome.result) : null}
          elapsedMs={special.outcome?.elapsedMs ?? null}
          inspect={inspect(special.outcome)}
          trailing={<PlatformMark platform={special.platform} size={16} />}
        />
        {isAdminDebugger && inspectorOpen && (
          <OutcomeInspector outcome={special.outcome} phase={special.phase} includedRaw />
        )}
        {special.phase === "working" && <SearchResultsSkeleton query={`@${special.handle}`} bare />}
        {special.phase === "error" && (
          <ErrorNotice
            title={`Couldn't look up @${special.handle}`}
            message={special.error ?? "The lookup failed."}
            size="compact"
            actions={
              <Button
                variant="quiet"
                icon={<RotateCcw />}
                onClick={() => inputs.lookUpProfile(special.platform, special.handle, special.url)}
              >
                Try again
              </Button>
            }
          />
        )}
        {special.outcome && <SearchKindView value={special.outcome.result} />}
        {special.url && (
          <OutboundLink
            href={special.url}
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
          >
            {`Open on ${where}`}
            <ExternalLink className="h-3.5 w-3.5" />
          </OutboundLink>
        )}
      </section>
    );
  }

  if (special.type === "image") {
    return (
      <section className="space-y-3" aria-label="Search by image">
        <ResultLine
          label="Search by image"
          phase={special.phase}
          hits={null}
          elapsedMs={special.outcome?.elapsedMs ?? null}
          inspect={inspect(special.outcome)}
        />
        <div className="flex min-w-0 items-center gap-3">
          {special.previewUrl ? (
            <img
              src={special.previewUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-lg border border-border bg-muted object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </span>
          )}
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium text-foreground">{special.name}</div>
            <div className="text-muted-foreground">
              {special.phase === "uploading"
                ? "Uploading…"
                : special.phase === "working"
                  ? "Looking for where it appears…"
                  : special.phase === "done"
                    ? "Where it appears, and lookalikes"
                    : "Didn't come back"}
            </div>
          </div>
        </div>
        {isAdminDebugger && inspectorOpen && (
          <OutcomeInspector outcome={special.outcome} phase={special.phase} includedRaw />
        )}
        {(special.phase === "uploading" || special.phase === "working") && (
          <SearchResultsSkeleton query="image" bare />
        )}
        {special.phase === "error" && (
          <ErrorNotice
            title="Search by image didn't come back"
            message={special.error ?? "The search failed."}
            size="compact"
          />
        )}
        {special.outcome && <SearchKindView value={special.outcome.result} />}
      </section>
    );
  }

  return <PageRead special={special} inputs={inputs} form={form} surface={surface} onSearchWords={onSearchWords} />;
}

function PageRead({
  special,
  inputs,
  surface,
  onSearchWords,
}: {
  special: Extract<SearchSpecialView, { type: "read" }>;
  inputs: UseSearchInputsReturn;
  form: UseScraperKeywordSearchFormReturn;
  surface: "search" | "scraper";
  onSearchWords: (query: string) => void;
}) {
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const { data, isLoading, failure } = inputs.scraper;
  const site = siteOf(special.url);
  const title = (typeof data?.overview.page_title === "string" && data.overview.page_title) || site;
  const links = [...(data?.links.external ?? []), ...(data?.links.internal ?? [])]
    .filter((l, i, all) => typeof l === "string" && all.indexOf(l) === i)
    .slice(0, 24);
  const images = (data?.images ?? []).filter((u) => /^https?:/i.test(u)).slice(0, 12);

  return (
    <section className="space-y-4" aria-label={`Reading ${site}`}>
      <div className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            {special.platform ? (
              <PlatformMark platform={special.platform} size={14} />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{site}</span>
          </div>
          <OutboundLink
            href={special.url}
            className="block text-xl font-normal leading-snug text-primary underline-offset-2 hover:underline"
          >
            {isLoading && !data ? special.url : title}
          </OutboundLink>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {special.platform && (
            <Button variant="outline" asChild icon={<ExternalLink />}>
              <OutboundLink href={special.url}>{`Open on ${platformLabel(special.platform)}`}</OutboundLink>
            </Button>
          )}
          <Button variant="quiet" icon={<Search />} onClick={() => onSearchWords(`site:${site}`)}>
            Search the web for this site
          </Button>
          {surface === "scraper" && (
            <Button variant="quiet" asChild icon={<ScanSearch />}>
              <a
                href={`/scraper/quick?url=${encodeURIComponent(special.url)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Full scrape
              </a>
            </Button>
          )}
        </div>
      </div>

      {isLoading && !data && <SearchResultsSkeleton query={site} bare />}

      {failure && (
        <ScrapeFailureNotice
          failure={failure}
          size="page"
          detailsAllowed={isAdminDebugger}
          remedyAction={{ label: "Try again", onClick: () => inputs.readPage(special.url, special.platform) }}
        />
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="min-w-0 space-y-4">
            {data.mainImage && /^https?:/i.test(data.mainImage) && (
              <img
                src={data.mainImage}
                alt=""
                className="max-h-80 w-full rounded-xl border border-border bg-muted object-cover"
              />
            )}
            <ScrapedContentPretty
              markdown={data.markdownRenderable ?? data.textContent}
              emptyLabel="This page had no readable text."
            />
          </article>
          <aside className="min-w-0 space-y-4">
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Images
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {images.map((src) => (
                    <OutboundLink
                      key={src}
                      href={src}
                      className="block aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </OutboundLink>
                  ))}
                </div>
              </div>
            )}
            {links.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  Links
                </div>
                <ul className="space-y-1">
                  {links.map((href) => (
                    <li key={href} className="min-w-0">
                      <OutboundLink
                        href={href}
                        className="block truncate text-sm text-primary underline-offset-2 hover:underline"
                        title={href}
                      >
                        {href.replace(/^https?:\/\/(www\.)?/, "")}
                      </OutboundLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {images.length === 0 && links.length === 0 && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                No images or links on this page.
              </p>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

// ── Inspector (admin debuggers only) ───────────────────────────────────────

type InspectorTab = "request" | "raw" | "translation" | "notes";

function OutcomeInspector({
  outcome,
  phase,
  includedRaw,
}: {
  outcome: SearchOutcome | null;
  phase: string;
  includedRaw: boolean;
}) {
  const [tab, setTab] = useState<InspectorTab>("request");
  const notes = outcome?.ignoredOptions ?? [];
  const translation = outcome?.translation;

  const empty = (line: string) => (
    <p className="px-2 py-6 text-center text-xs text-muted-foreground">{line}</p>
  );

  let body: React.ReactNode;
  if (!outcome) {
    body = empty(phase === "searching" || phase === "working" ? "Waiting for the response…" : "No response to inspect.");
  } else if (tab === "request") {
    body = outcome.request ? (
      <JsonInspector showSource data={outcome.request} label="Request sent" className="h-56" />
    ) : (
      empty("The server did not report the request.")
    );
  } else if (tab === "raw") {
    body = outcome.raw ? (
      <JsonInspector showSource data={outcome.raw} label="Raw response" className="h-96" />
    ) : (
      empty(includedRaw ? "The server returned no raw response." : "Not captured for this search. Search again to capture it.")
    );
  } else if (tab === "translation") {
    body = translation ? (
      <div className="space-y-2 p-2">
        <KeyList title="Unknown keys" sections={translation.unknownSections} />
        <DropList drops={translation.dropped} />
        <JsonInspector showSource data={translation.raw} label="Translation report" className="h-56" />
      </div>
    ) : (
      empty("No translation report.")
    );
  } else {
    body =
      notes.length > 0 ? (
        <ul className="space-y-1 p-2 text-xs text-foreground">
          {notes.map((line, i) => (
            <li key={i} className="flex gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {line}
            </li>
          ))}
        </ul>
      ) : (
        empty("No notes for this search.")
      );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border/60 px-2 pt-1">
        <Tabs
          aria-label="Inspector"
          value={tab}
          onValueChange={setTab}
          data={[
            { value: "request", label: "Request" },
            { value: "raw", label: "Raw response" },
            {
              value: "translation",
              label: "Translation",
              count: translation ? translation.unknownSections.length + translation.dropped.length : null,
            },
            { value: "notes", label: "Notes", count: notes.length || null },
          ]}
        />
      </div>
      {body}
    </div>
  );
}

function KeyList({ title, sections }: { title: string; sections: { section: string; keys: string[] }[] }) {
  return (
    <div className="text-xs">
      <div className="mb-0.5 font-medium text-foreground">
        {title} <span className="text-muted-foreground">({sections.length})</span>
      </div>
      {sections.length === 0 ? (
        <div className="text-muted-foreground">None</div>
      ) : (
        <ul className="space-y-0.5">
          {sections.map((s, i) => (
            <li key={i} className="font-mono text-xs text-muted-foreground">
              <span className="text-foreground">{s.section}</span>
              {s.keys.length > 0 && `: ${s.keys.join(", ")}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DropList({ drops }: { drops: SearchTranslationDrop[] }) {
  return (
    <div className="text-xs">
      <div className="mb-0.5 font-medium text-foreground">
        Dropped <span className="text-muted-foreground">({drops.length})</span>
      </div>
      {drops.length === 0 ? (
        <div className="text-muted-foreground">None</div>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {drops.map((d, i) => (
            <li key={i} className="min-w-0 text-xs text-muted-foreground">
              <span className="font-mono text-foreground">{d.path}</span>
              {d.kindOf && <span> · {d.kindOf}</span>}
              {d.size !== null && <span> · {d.size}</span>}
              {d.reason && <span> · {d.reason}</span>}
              {d.preview && (
                <div className="truncate font-mono" title={d.preview}>
                  {d.preview}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Used by the route mounts for the surface scope. */
export function isWebSearchResult(value: unknown): boolean {
  return isRecord(value) && (value.__kind === "web_search_results" || !value.__kind);
}
