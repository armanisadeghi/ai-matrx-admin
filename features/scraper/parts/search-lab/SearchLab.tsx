"use client";

/**
 * The Search Lab — `/scraper/search` as a search testing workbench.
 *
 * Google's shape, borrowed where it helps: before a search, a 48px pill at
 * the calm centre with the result-type tabs and the engine switch under it;
 * after one, the pill at the top, left-aligned with the results, the engine
 * switch and Options beside it and the result types under it. One result
 * column per engine, each with an engine line (hits, elapsed time, the
 * server's search notes) and, for admin debuggers, an Inspector with the wire
 * request, the raw provider payload (always captured for them), the
 * translation report and the notes.
 *
 * Results render through the canonical `web_search_results` kind component;
 * nothing here draws a result. A Google search spends a shared monthly
 * allowance, so nothing runs on load or on a keystroke — Brave-only tab
 * switches re-run, every other change waits for Search.
 */

import { useState } from "react";
import {
  Braces,
  Info,
  MapPinOff,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import {
  LoadingTapButton,
  SearchTapButton,
} from "@ai-matrx/design-system/tap-target/buttons";
import {
  Button,
  ClampedNumberInput,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
} from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { ErrorNotice } from "@ai-matrx/design-system";
import { JsonInspector } from "@/components/official-candidate/json-inspector/JsonInspector";
import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";
import { SearchResultsSkeleton } from "@/features/search/components/SearchResultsSkeleton";
import { ScraperHookErrorDetails } from "@/features/scraper/parts/ScraperHookErrorDetails";
import {
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
import type {
  SearchTranslationDrop,
  SearchDevice,
  SearchProvider,
  SearchSafeSearch,
  SearchVertical,
} from "@/features/search/types";
import { SEARCH_ENGINE_LABEL } from "@/features/search/types";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";

const ENGINE_OPTIONS = [
  { value: "brave", label: SEARCH_ENGINE_LABEL.brave },
  { value: "google", label: SEARCH_ENGINE_LABEL.google },
  { value: "compare", label: "Both" },
] as const satisfies readonly { value: KeywordSearchEngine; label: string }[];

const VERTICAL_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "news", label: "News" },
  { value: "images", label: "Images" },
  { value: "videos", label: "Videos" },
  { value: "places", label: "Places" },
] as const satisfies readonly { value: SearchVertical; label: string }[];

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

/** A code the short list lacks (from a shared link) still shows as itself. */
function withCurrent(
  list: { value: string; label: string }[],
  current: string,
) {
  return list.some((o) => o.value === current)
    ? list
    : [{ value: current, label: current.toUpperCase() }, ...list];
}

function clampCount(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return RESULT_LIMIT_DEFAULT;
  return Math.min(RESULT_LIMIT_MAX, Math.max(RESULT_LIMIT_MIN, n));
}

type InspectorState = Record<SearchProvider, boolean>;

/** One measure for the header and the results — they line up. */
const LAB_WIDTH = "max-w-6xl";
/** Google's search box measure. */
const PILL_WIDTH = "max-w-[692px]";

/**
 * The search box — Google's shape: a 48px pill, the magnifier leading (it
 * also runs the search; a spinner while one runs), the clear (×) inside.
 */
function SearchPill({
  form,
  onQuery,
  onClear,
  autoFocus,
}: {
  form: UseScraperKeywordSearchFormReturn;
  onQuery: (value: string) => void;
  onClear: () => void;
  autoFocus?: boolean;
}) {
  const { keywords, isLoading, isLocating, handleSearch, handleKeyDown } = form;
  const busy = isLoading || isLocating;
  const canSearch = keywords.trim() !== "" && !busy;
  return (
    <div className="flex h-12 w-full min-w-0 items-center rounded-full border border-border bg-card pl-1.5 pr-2 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md">
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
          onClick={() => void handleSearch()}
          className="text-muted-foreground"
        />
      )}
      <ProInput
        id="search-lab-query"
        aria-label="Search query"
        enableCleanup={false}
        placeholder="Search the web"
        value={keywords}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        clearable
        onClear={onClear}
        autoFocus={autoFocus}
        autoComplete="off"
        enterKeyHint="search"
        wrapperClassName="min-w-0 flex-1"
        className="h-11 border-0 bg-transparent px-1.5 shadow-none placeholder:text-base focus-visible:ring-0"
      />
    </div>
  );
}

export function SearchLabBody({
  form,
}: {
  form: UseScraperKeywordSearchFormReturn;
}) {
  const {
    keywords,
    setKeywords,
    engine,
    setEngine,
    vertical,
    setVertical,
    options,
    setOption,
    changedOptionCount,
    runs,
    lastRequest,
    isStale,
    isLoading,
    statusMessage,
    handleSearch,
    handleKeyDown,
    handleClear,
    errorDiagnostics,
    locationNote,
  } = form;

  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inspect, setInspect] = useState<InspectorState>({
    brave: false,
    google: false,
  });
  // A link that carries a query opens on the results layout (it is about to
  // run, or waits for Search) — never the start screen for one frame.
  const [pinnedTop, setPinnedTop] = useState(() => keywords.trim() !== "");

  const toggleInspector = (provider: SearchProvider) =>
    setInspect((prev) => ({ ...prev, [provider]: !prev[provider] }));

  const onVertical = (next: SearchVertical) => {
    setVertical(next);
    if (options.page !== 1) setOption("page", 1);
    // A Brave re-run costs nothing worth guarding; Google waits for Search.
    // Only when the inputs still match the last run — edits nobody submitted
    // never ride along on a tab change.
    if (
      lastRequest &&
      !isStale &&
      engine === "brave" &&
      keywords.trim() &&
      !isLoading
    ) {
      void handleSearch({ vertical: next, options: { ...options, page: 1 } });
    }
  };

  const onQuery = (value: string) => {
    setKeywords(value);
    if (options.page !== 1) setOption("page", 1);
  };

  // × clears the query and the results: back to the start screen.
  const onClear = () => {
    setKeywords("");
    handleClear();
    setPinnedTop(false);
  };

  const compare = runs.length > 1;
  const home = runs.length === 0 && !pinnedTop;

  const engineControls = (
    <div className="flex items-center gap-1">
      <SegmentedControl
        aria-label="Search engine"
        value={engine}
        onValueChange={setEngine}
        data={ENGINE_OPTIONS}
      />
      <Button
        variant="quiet"
        icon={<SlidersHorizontal />}
        pressed={optionsOpen}
        // A corner dot, not an inline count: it sits on the button, so
        // changing an option never shifts the engine switch beside it.
        badge={changedOptionCount > 0}
        title={
          changedOptionCount > 0
            ? `Options · ${changedOptionCount} changed`
            : "Options"
        }
        onClick={() => setOptionsOpen((v) => !v)}
        aria-label={
          changedOptionCount > 0
            ? `Options, ${changedOptionCount} changed`
            : "Options"
        }
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
      onKeyDown={handleKeyDown}
      wrapperClassName="w-full sm:w-64"
      className="h-8 text-sm"
    />
  );

  const optionsPanel = optionsOpen && (
    <SearchLabOptions form={form} />
  );

  const locationLine = locationNote && (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MapPinOff className="h-3.5 w-3.5 shrink-0" />
      {locationNote}
    </p>
  );

  if (home) {
    // The start screen — Google's calm centre: the box, and the quiet
    // controls under it. The box sits at a fixed height (not centred), so
    // opening Options grows the page downward and never moves the box.
    return (
      <div className="flex-1 overflow-auto px-4">
        <div
          className={cn(
            "mx-auto w-full space-y-4 pb-16 pt-[18vh] sm:pt-[24vh]",
            PILL_WIDTH,
          )}
        >
          <SearchPill
            form={form}
            onQuery={onQuery}
            onClear={onClear}
            autoFocus
          />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Tabs
              aria-label="Result type"
              variant="capsule"
              value={vertical}
              onValueChange={onVertical}
              data={VERTICAL_OPTIONS}
            />
            {engineControls}
          </div>
          {placesLocation && (
            <div className="flex justify-center">{placesLocation}</div>
          )}
          {optionsPanel}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-shrink-0 border-b border-border/60 px-3 pt-3 sm:px-4">
        <div className={cn("mx-auto space-y-1", LAB_WIDTH)}>
          {/* Google's results page: the box at the top, left-aligned with the
              results column; the engine switch and Options beside it (under
              it on a phone). Nothing appears or vanishes here, so the row
              never shifts. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className={cn("w-full min-w-0 sm:flex-1", PILL_WIDTH)}>
              <SearchPill form={form} onQuery={onQuery} onClear={onClear} />
            </div>
            {engineControls}
          </div>

          <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1">
            {/* Five short tabs always fit (they need ~265px): no scroll box,
                whose 6px of underline overhang drew a stray scrollbar. */}
            <Tabs
              aria-label="Result type"
              className="overflow-visible"
              value={vertical}
              rule={false}
              onValueChange={onVertical}
              data={VERTICAL_OPTIONS}
            />
            {placesLocation}
            {isStale && runs.length > 0 && !isLoading && (
              <span className="text-xs text-muted-foreground">
                Inputs changed — press Enter
              </span>
            )}
            {locationLine}
          </div>

          {optionsPanel && <div className="pb-3">{optionsPanel}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5">
        <div className={cn("mx-auto", LAB_WIDTH)}>
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
              <Search className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {keywords.trim()
                  ? "Press Enter to search"
                  : "Search the web, news, images, videos and places"}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                compare && "grid gap-x-8 gap-y-10 lg:grid-cols-2",
              )}
            >
              {runs.map((run) => (
                <EngineColumn
                  key={run.provider}
                  run={run}
                  query={lastRequest?.query ?? keywords.trim()}
                  statusMessage={statusMessage}
                  inspectorOpen={inspect[run.provider]}
                  onToggleInspector={() => toggleInspector(run.provider)}
                  onRetry={
                    // A Matrx re-run is free; Google spends the allowance and
                    // waits for an explicit Search.
                    engine === "brave" && run.provider === "brave"
                      ? () => void handleSearch()
                      : undefined
                  }
                />
              ))}
            </div>
          )}
          {errorDiagnostics && isAdminDebugger && (
            <div className="mt-4">
              <ScraperHookErrorDetails diagnostics={errorDiagnostics} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

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

function SearchLabOptions({
  form,
}: {
  form: UseScraperKeywordSearchFormReturn;
}) {
  const { options, setOption, engine, vertical, maxResults, setMaxResults } =
    form;
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
      <OptionCell label="Results">
        <ClampedNumberInput
          aria-label="Results"
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
      {/* Three segments never fit one column: it always takes two. */}
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
          title={
            aiAllowed
              ? "Add an AI answer"
              : "Not offered for this engine or type"
          }
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
          {/* In the cell's own fixed-height row: a refusal never moves the grid. */}
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

type InspectorTab = "request" | "raw" | "translation" | "ignored";

function EngineColumn({
  run,
  query,
  statusMessage,
  inspectorOpen,
  onToggleInspector,
  onRetry,
}: {
  run: KeywordEngineRun;
  query: string;
  statusMessage: string | null;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  onRetry?: () => void;
}) {
  // Request, raw payload and translation are debug tooling: they show provider
  // internals (vendor names, keys we drop), so they are an admin-debugging view.
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const { outcome } = run;
  const hits = outcome ? kindToSearchItems(query, outcome.result).length : 0;
  const ignored = outcome?.ignoredOptions ?? [];
  const label = SEARCH_ENGINE_LABEL[run.provider];

  return (
    <section className="min-w-0 space-y-3" aria-label={`${label} results`}>
      {/* The engine line is the header: the query is already in the box. */}
      <div className="flex h-8 min-w-0 items-center gap-2 border-b border-border/60 text-xs">
        <span
          aria-hidden
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            run.phase === "error"
              ? "bg-destructive"
              : run.phase === "searching"
                ? "animate-pulse bg-primary"
                : "bg-success",
          )}
        />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="min-w-0 truncate tabular-nums text-muted-foreground">
          {run.phase === "searching" && !outcome
            ? (statusMessage ?? "Searching…")
            : run.phase === "error"
              ? "Failed"
              : outcome
                ? `${hits} ${hits === 1 ? "result" : "results"}${
                    outcome.elapsedMs !== null
                      ? ` · ${(outcome.elapsedMs / 1000).toFixed(2)} s`
                      : ""
                  }`
                : null}
        </span>
        {isAdminDebugger && (
          <Button
            variant="quiet"
            icon={<Braces />}
            pressed={inspectorOpen}
            onClick={onToggleInspector}
            className="ml-auto"
            meta={ignored.length > 0 ? ignored.length : undefined}
            title="Request, raw response, translation and search notes"
          >
            Inspect
          </Button>
        )}
      </div>

      {ignored.length > 0 && (
        // The server's own sentences: what it could not apply AND what it
        // used ("Searched near Laguna Hills, California.") — neutral notes.
        <div className="flex items-start gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            <span className="font-medium text-foreground">Search notes: </span>
            {ignored.join(" · ")}
          </span>
        </div>
      )}

      {isAdminDebugger && inspectorOpen && <EngineInspector run={run} />}

      {run.phase === "error" && (
        <ErrorNotice
          title={`${label} search failed`}
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

      {run.phase === "searching" && !outcome && (
        <SearchResultsSkeleton query={query} bare />
      )}

      {outcome && (
        // The engine line already names the query and engine, so the
        // collection's own header line is hidden here.
        <div className="[&_[data-search-collection-header]]:hidden">
          <KindInstanceRender
            kind="web_search_results"
            value={outcome.result}
            variant="bare"
          />
        </div>
      )}

      {outcome && hits === 0 && run.phase === "done" && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <SearchX className="mb-1 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No results</p>
          <p className="text-xs text-muted-foreground">
            Try other words, another result type or fewer options.
          </p>
        </div>
      )}
    </section>
  );
}

function EngineInspector({ run }: { run: KeywordEngineRun }) {
  const [tab, setTab] = useState<InspectorTab>("request");
  const { outcome } = run;
  const ignored = outcome?.ignoredOptions ?? [];
  const translation = outcome?.translation;

  const empty = (line: string) => (
    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
      {line}
    </p>
  );

  let body: React.ReactNode;
  if (!outcome) {
    body = empty(
      run.phase === "searching"
        ? "Waiting for the response…"
        : "No response to inspect.",
    );
  } else if (tab === "request") {
    body = outcome.request ? (
      <JsonInspector
        showSource
        data={outcome.request}
        label="Request sent"
        className="h-56"
      />
    ) : (
      empty("The server did not report the request.")
    );
  } else if (tab === "raw") {
    body = outcome.raw ? (
      <JsonInspector
        showSource
        data={outcome.raw}
        label="Raw response"
        className="h-96"
      />
    ) : (
      empty(
        run.includedRaw
          ? "The server returned no raw response."
          : "Not captured for this search. Search again to capture it.",
      )
    );
  } else if (tab === "translation") {
    body = translation ? (
      <div className="space-y-2 p-2">
        <KeyList title="Unknown keys" sections={translation.unknownSections} />
        <DropList drops={translation.dropped} />
        <JsonInspector
          showSource
          data={translation.raw}
          label="Translation report"
          className="h-56"
        />
      </div>
    ) : (
      empty("No translation report.")
    );
  } else {
    body =
      ignored.length > 0 ? (
        <ul className="space-y-1 p-2 text-xs text-foreground">
          {ignored.map((line, i) => (
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
              count: translation
                ? translation.unknownSections.length +
                  translation.dropped.length
                : null,
            },
            {
              value: "ignored",
              label: "Notes",
              count: ignored.length || null,
            },
          ]}
        />
      </div>
      {body}
    </div>
  );
}

function KeyList({
  title,
  sections,
}: {
  title: string;
  sections: { section: string; keys: string[] }[];
}) {
  return (
    <div className="text-xs">
      <div className="mb-0.5 font-medium text-foreground">
        {title}{" "}
        <span className="text-muted-foreground">({sections.length})</span>
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
