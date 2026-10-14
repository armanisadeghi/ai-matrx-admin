"use client";

/**
 * The Search Lab — `/scraper/search` as a search testing workbench.
 *
 * One search row (query · engine Brave | Google | Both · Options · Search),
 * result-type tabs, a collapsible options grid, and one result column per
 * engine. Each column carries an engine line (hits, elapsed ms, options the
 * engine could not honour) and an Inspector with the wire request, the raw
 * provider payload, the translation report and the ignored options.
 *
 * Results render through the canonical `web_search_results` kind component;
 * nothing here draws a result. A Google search spends a shared monthly
 * allowance, so nothing runs on load or on a keystroke — Brave-only tab
 * switches re-run, every other change waits for Search.
 */

import { useState } from "react";
import {
  AlertTriangle,
  Braces,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Button,
  NumberStepper,
  SegmentedControl,
  Select,
  Switch,
  Tabs,
} from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { Spinner } from "@/components/ui/spinner";
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

/** One measure for the search row, the options and the results — they line up. */
const LAB_WIDTH = "max-w-6xl";

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
  } = form;

  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [inspect, setInspect] = useState<InspectorState>({
    brave: false,
    google: false,
  });
  const [captureRaw, setCaptureRaw] = useState(false);

  // Raw provider payloads are only asked for while someone is looking.
  const applyRaw = (nextInspect: InspectorState, nextCapture: boolean) =>
    form.setIncludeRaw(nextCapture || nextInspect.brave || nextInspect.google);

  const toggleInspector = (provider: SearchProvider) => {
    const next = { ...inspect, [provider]: !inspect[provider] };
    setInspect(next);
    applyRaw(next, captureRaw);
  };

  const onCaptureRaw = (value: boolean) => {
    setCaptureRaw(value);
    applyRaw(inspect, value);
  };

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

  const compare = runs.length > 1;
  const canSearch = keywords.trim() !== "" && !isLoading;

  return (
    <>
      <div className="flex-shrink-0 border-b border-border/60 px-3 pb-2 pt-2.5 sm:px-4">
        <div className={cn("mx-auto space-y-2", LAB_WIDTH)}>
          {/* Phone: query + Search on one row, engine + Options under it.
              Wider: one row, Search last. Nothing appears or vanishes here,
              so the row never shifts. */}
          <div className="flex flex-wrap items-center gap-2">
            <ProInput
              id="search-lab-query"
              aria-label="Search query"
              enableCleanup={false}
              placeholder="Search the web…"
              value={keywords}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              wrapperClassName="order-1 min-w-0 flex-1 sm:min-w-[240px]"
              className="h-9 text-sm"
            />
            <div className="order-3 flex w-full items-center gap-1 sm:order-2 sm:w-auto">
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
                meta={changedOptionCount > 0 ? changedOptionCount : undefined}
                onClick={() => setOptionsOpen((v) => !v)}
                aria-label="Options"
                aria-expanded={optionsOpen}
              >
                Options
              </Button>
              <Button
                variant="quiet"
                icon={<X />}
                aria-label="Clear results"
                title="Clear results"
                onClick={handleClear}
                disabled={runs.length === 0 || isLoading}
                className={cn(
                  "ml-auto sm:ml-0",
                  (runs.length === 0 || isLoading) && "invisible",
                )}
              />
            </div>
            <Button
              variant="primary"
              icon={isLoading ? <Spinner /> : <Search />}
              onClick={() => void handleSearch()}
              disabled={!canSearch}
              aria-label="Search"
              className="order-2 sm:order-3"
            >
              Search
            </Button>
          </div>

          <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
            <Tabs
              aria-label="Result type"
              variant="capsule"
              value={vertical}
              onValueChange={onVertical}
              data={VERTICAL_OPTIONS}
            />
            {vertical === "places" && (
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
            )}
            {isStale && runs.length > 0 && !isLoading && (
              <span className="text-xs text-muted-foreground">
                Inputs changed — press Search
              </span>
            )}
          </div>

          {optionsOpen && (
            <SearchLabOptions
              form={form}
              captureRaw={captureRaw}
              onCaptureRaw={onCaptureRaw}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-3 py-4 sm:px-4 sm:py-5">
        <div className={cn("mx-auto", LAB_WIDTH)}>
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
              <Search className="h-6 w-6 text-muted-foreground/60" />
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
  captureRaw,
  onCaptureRaw,
}: {
  form: UseScraperKeywordSearchFormReturn;
  captureRaw: boolean;
  onCaptureRaw: (v: boolean) => void;
}) {
  // Request, raw payload and translation are debug tooling: they show provider
  // internals (vendor names, keys we drop), so they are an admin-debugging view.
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);
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
      <OptionCell label="Time range">
        <Select
          aria-label="Time range"
          value={options.timeRange ?? "any"}
          options={TIME_OPTIONS}
          onValueChange={(v) => setOption("timeRange", v === "any" ? null : v)}
        />
      </OptionCell>
      <OptionCell label="Results">
        <NumberStepper
          value={clampCount(maxResults)}
          onChange={(v) => setMaxResults(String(v))}
          min={RESULT_LIMIT_MIN}
          max={RESULT_LIMIT_MAX}
          fallback={RESULT_LIMIT_DEFAULT}
        />
      </OptionCell>
      <OptionCell label="Page">
        <NumberStepper
          value={options.page}
          onChange={set("page")}
          min={1}
          max={SEARCH_LAB_PAGE_MAX}
          fallback={1}
        />
      </OptionCell>
      <OptionCell label="Safe search" className="col-span-2 sm:col-span-1">
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
      <OptionCell label="Device">
        <SegmentedControl
          aria-label="Device"
          value={options.device}
          onValueChange={set("device")}
          data={DEVICE_OPTIONS}
        />
      </OptionCell>
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
      {isAdminDebugger && (
        <OptionCell label="Capture raw">
          <Switch
            aria-label="Capture raw response"
            checked={captureRaw}
            onCheckedChange={onCaptureRaw}
            title="Keep the provider's raw response for the inspector"
          />
        </OptionCell>
      )}
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
            title="Request, raw response, translation and ignored options"
          >
            Inspect
          </Button>
        )}
      </div>

      {ignored.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            <span className="font-medium text-foreground">Not applied: </span>
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
          <SearchX className="mb-1 h-6 w-6 text-muted-foreground/60" />
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
          : "Not captured. Search again with the inspector open.",
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
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
              {line}
            </li>
          ))}
        </ul>
      ) : (
        empty("Every option was applied.")
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
              label: "Ignored",
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
