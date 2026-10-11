"use client";

/**
 * "Get data" on a board — the Table tile before its table exists. Left: the server's catalog,
 * grouped, searchable (an unverified source is listed and marked, and only picked once the person
 * turns "Unverified" on). Right: the chosen source's fields, How many (capped by the organization's
 * limit, which is SHOWN with its setting link), the points estimate, Fetch. The run is held outside
 * the body (`runs.ts`), so leaving the board never loses it; after a reload the saved job id
 * reconnects. The result turns THIS tile into the Table tile bound to the new table.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, DownloadCloud } from "lucide-react";
import {
  Badge,
  Button,
  ClampedNumberInput,
  EmptyState,
  RegionSkeleton,
  SearchField,
  SegmentedControl,
} from "@ai-matrx/design-system/controls";

import { ReadFailure } from "@ai-matrx/design-system";

import { formatCount, formatDurationMs } from "@ai-matrx/kit/format";
import { ProInput } from "@/components/official/ProInput";
import { Spinner } from "@/components/ui/spinner";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { cn } from "@/lib/utils";

import { useBoardOrganizationId } from "../items/board-organization";
import type { ItemBodyProps } from "../items/types";
import {
  buildInput,
  capCount,
  countChoices,
  groupSources,
  type DataFetchProgress,
  type DataFetchRefusal,
  type DataSource,
  type DataSourceCatalog,
} from "../../data-sources/contract";
import { limitSettingHref, useDataSources, useFetchEstimate } from "../../data-sources/hooks";
import { clearRun, resumeRun, runState, startRun, useRun } from "../../data-sources/runs";
import { fetchData, getJob } from "../../data-sources/server";
import { provenanceOf, readDataFetchMeta, withDataFetchMeta, type DataFetchDraft } from "./tile-meta";

import { RefusalView } from "../../data-sources/RefusalView";

const TABLE_ENTITY = "data-table";

/** The organization a fetch is billed to: the board's own, else the one the person works in. */
export function useFetchOrganizationId(): string | null {
  const board = useBoardOrganizationId();
  // org-filter: write-target a fetch makes a new table and spends points in this organization
  const active = useOrganizationRequired();
  return board ?? active.organizationId ?? null;
}

export function GetDataBody({ tileId, source, onSource }: Pick<ItemBodyProps, "tileId" | "source" | "onSource">) {
  const meta = source.kind === "entity" ? source.meta : undefined;
  const draft: DataFetchDraft = readDataFetchMeta(meta)?.draft ?? {};
  const organizationId = useFetchOrganizationId();
  const catalog = useDataSources(organizationId);
  const run = useRun(tileId);

  const saveDraft = (next: DataFetchDraft) =>
    onSource({ kind: "entity", entity: TABLE_ENTITY, id: null, meta: withDataFetchMeta(meta, { draft: next }) });

  // A saved job with nothing in memory (a reload): reconnect to it.
  const savedJob = draft.jobId ?? null;
  useEffect(() => {
    // A run still in memory (the person left and came back) owns itself.
    if (!savedJob || !organizationId || runState(tileId).status !== "idle") return;
    return resumeRun(tileId, (signal) => getJob(savedJob, { organizationId, signal }));
  }, [savedJob, organizationId, tileId]);

  // The job id, as soon as the server names it, is saved with the tile.
  const liveJob = run.status === "running" ? run.progress?.jobId ?? null : null;
  useEffect(() => {
    if (liveJob && liveJob !== draft.jobId) saveDraft({ ...draft, jobId: liveJob });
  }, [liveJob, draft, saveDraft]);

  // Done: this tile becomes the Table tile bound to the new table.
  const done = run.status === "done" ? run.result : null;
  useEffect(() => {
    if (!done || !draft.request) return;
    clearRun(tileId);
    onSource(
      {
        kind: "entity",
        entity: TABLE_ENTITY,
        id: done.table_id,
        meta: withDataFetchMeta(undefined, { fetched: provenanceOf(done, draft.request) }),
      },
      done.table_name,
    );
  }, [done, draft.request, tileId, onSource]);

  // A saved job that is not resolved: show it at once (never the picker, which invites a second paid
  // click). The reconnect effect above polls the job right away once the organization is known.
  if (savedJob && run.status !== "failed" && run.status !== "done") {
    return (
      <div className="flex h-full">
        <ProgressView
          source={catalog.data?.sources.find((s) => s.key === draft.sourceKey) ?? null}
          progress={run.status === "running" ? run.progress : null}
          startedAt={run.status === "running" ? run.startedAt : Date.now()}
        />
      </div>
    );
  }
  if (!organizationId) {
    return <EmptyState icon={<Database className="h-5 w-5" />} title="No organization yet" line="Data is fetched into an organization." />;
  }
  if (catalog.isLoading) {
    return (
      <div className="p-4">
        <RegionSkeleton shape="rows" count={8} aria-label="Loading sources" />
      </div>
    );
  }
  if (catalog.error || !catalog.data) {
    return (
      <div className="p-4">
        <ReadFailure error={catalog.error} what="the data sources" onRetry={() => void catalog.refetch()} />
      </div>
    );
  }

  const fetchNow = (src: DataSource, values: Record<string, string>, count: number) => {
    const input = buildInput(src, values).input;
    if (!input) return;
    const request = { sourceKey: src.key, sourceLabel: src.label, input, count };
    saveDraft({ sourceKey: src.key, values, count, request });
    startRun(tileId, (onProgress) => fetchData({ sourceKey: src.key, input, maxRecords: count }, { organizationId, onProgress }));
  };

  return (
    <SourcePicker
      catalog={catalog.data}
      organizationId={organizationId}
      draft={draft}
      running={run.status === "running" ? { progress: run.progress, startedAt: run.startedAt } : null}
      refusal={run.status === "failed" ? run.refusal : null}
      onDraft={saveDraft}
      onFetch={fetchNow}
      onDismissRefusal={() => {
        clearRun(tileId);
        if (draft.jobId) saveDraft({ ...draft, jobId: undefined });
      }}
    />
  );
}

function SourcePicker({
  catalog,
  organizationId,
  draft,
  running,
  refusal,
  onDraft,
  onFetch,
  onDismissRefusal,
}: {
  catalog: DataSourceCatalog;
  organizationId: string;
  draft: DataFetchDraft;
  running: { progress: DataFetchProgress | null; startedAt: number } | null;
  refusal: DataFetchRefusal | null;
  onDraft: (next: DataFetchDraft) => void;
  onFetch: (source: DataSource, values: Record<string, string>, count: number) => void;
  onDismissRefusal: () => void;
}) {
  const [query, setQuery] = useState("");
  const [allowUnverified, setAllowUnverified] = useState(false);
  const [pickedKey, setPickedKey] = useState<string | null>(draft.sourceKey ?? null);
  const picked = catalog.sources.find((s) => s.key === pickedKey) ?? null;
  const groups = groupSources(catalog.sources, query);
  const unverifiedCount = catalog.sources.filter((s) => !s.verified).length;
  const busy = running != null;

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-1 p-2">
          <SearchField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sources" aria-label="Search sources" />
          {unverifiedCount > 0 && (
            <Button
              variant="quiet"
              pressed={allowUnverified}
              onClick={() => setAllowUnverified((v) => !v)}
              title="Allow sources not verified yet"
            >
              Unverified
            </Button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2" role="listbox" aria-label="Sources">
          {groups.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nothing matches</p>}
          {groups.map((g) => (
            <div key={g.group} className="mt-1">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.group}</div>
              {g.sources.map((s) => {
                const selectable = !busy && (s.verified || allowUnverified);
                const active = s.key === pickedKey;
                return (
                  <Button
                    key={s.key}
                    variant="quiet"
                    pressed={active}
                    role="option"
                    aria-selected={active}
                    disabled={!selectable}
                    data-source-key={s.key}
                    title={!s.verified && !allowUnverified ? "Not verified yet. Turn on Unverified to use it." : undefined}
                    meta={s.verified ? undefined : "Unverified"}
                    className="w-full"
                    onClick={() => {
                      setPickedKey(s.key);
                      onDraft({ ...draft, sourceKey: s.key, values: {}, request: undefined });
                    }}
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
        {refusal ? (
          <RefusalView refusal={refusal} organizationId={organizationId} onBack={onDismissRefusal} />
        ) : running ? (
          <ProgressView source={picked} progress={running.progress} startedAt={running.startedAt} />
        ) : picked ? (
          <SourceForm
            key={picked.key}
            source={picked}
            catalog={catalog}
            organizationId={organizationId}
            draft={draft}
            onDraft={onDraft}
            onFetch={(values, count) => onFetch(picked, values, count)}
          />
        ) : (
          <EmptyState icon={<DownloadCloud className="h-5 w-5" />} title="Pick a source" line="Reviews, places, jobs, companies and more." />
        )}
      </section>
    </div>
  );
}

type CountChoice = "10" | "50" | "100" | "500" | "custom";

function SourceForm({
  source,
  catalog,
  organizationId,
  draft,
  onDraft,
  onFetch,
}: {
  source: DataSource;
  catalog: DataSourceCatalog;
  organizationId: string;
  draft: DataFetchDraft;
  onDraft: (next: DataFetchDraft) => void;
  onFetch: (values: Record<string, string>, count: number) => void;
}) {
  const limit = catalog.limits.max_records_per_fetch;
  const [values, setValues] = useState<Record<string, string>>(draft.sourceKey === source.key ? draft.values ?? {} : {});
  const initial = capCount(draft.count ?? 50, limit?.value);
  const [choice, setChoice] = useState<CountChoice>(
    (["10", "50", "100", "500"] as const).find((c) => Number(c) === initial) ?? "custom",
  );
  const [custom, setCustom] = useState(initial);
  const count = capCount(choice === "custom" ? custom : Number(choice), limit?.value);
  const estimate = useFetchEstimate()(source, count);
  const built = buildInput(source, values);
  const settingHref = limit ? limitSettingHref(organizationId, limit.setting) : null;
  const saveValues = () => onDraft({ ...draft, sourceKey: source.key, values, count });

  return (
    <form
      className="flex max-w-xl flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (built.input) onFetch(values, count);
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="truncate text-sm font-semibold text-foreground">{source.label}</h3>
        <span className="text-xs text-muted-foreground">{source.group}</span>
        {!source.verified && <Badge tone="warning">Unverified</Badge>}
      </div>

      {source.input.fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {f.label}
            {f.required ? "" : " (optional)"}
          </span>
          <ProInput
            value={values[f.name] ?? ""}
            placeholder={f.example ?? (source.input.kind === "url" ? source.example_url ?? "https://" : "")}
            enableCleanup={false}
            enableVoice={source.input.kind === "keyword"}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            onBlur={saveValues}
            aria-label={f.label}
            data-field={f.name}
          />
        </label>
      ))}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">How many</span>
          {limit && (
            <span className="text-xs text-muted-foreground" data-limit={limit.value}>
              Up to {formatCount(limit.value)}
              {settingHref && (
                <>
                  {" · "}
                  <Link href={settingHref} className="text-primary hover:underline" target="_blank">
                    Change
                  </Link>
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<CountChoice>
            aria-label="How many records"
            value={choice}
            onValueChange={(next) => {
              setChoice(next);
              const n = capCount(next === "custom" ? custom : Number(next), limit?.value);
              onDraft({ ...draft, sourceKey: source.key, values, count: n });
            }}
            data={[
              ...countChoices(limit?.value).map((c) => ({
                value: String(c.value) as CountChoice,
                label: String(c.value),
                disabled: !c.allowed,
                title: c.allowed ? undefined : `Above your limit of ${limit?.value}`,
              })),
              { value: "custom" as const, label: "Custom" },
            ]}
          />
          {choice === "custom" && (
            <ClampedNumberInput
              aria-label="Custom count"
              className="w-24"
              value={custom}
              min={1}
              max={limit?.value ?? null}
              onChange={(n) => setCustom(n)}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
        <span className="text-xs text-muted-foreground" data-estimate="">
          {estimate ?? "No price yet"}
        </span>
        <Button type="submit" variant="primary" icon={<DownloadCloud className="h-4 w-4" />} disabled={!built.input}>
          Fetch {formatCount(count)}
        </Button>
      </div>
    </form>
  );
}

const elapsed = (startedAt: number, now: number): string => formatDurationMs(Math.max(0, now - startedAt));

function ProgressView({ source, progress, startedAt }: { source: DataSource | null; progress: DataFetchProgress | null; startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const share = progress?.current != null && progress.total ? Math.min(1, progress.current / progress.total) : null;
  return (
    <div className="m-auto flex w-full max-w-sm flex-col items-center gap-3 text-center" aria-live="polite" data-fetch-progress="">
      <Spinner className="h-6 w-6 text-primary" />
      <div className="text-sm font-medium text-foreground">{source?.label ?? "Fetching"}</div>
      <div className="text-xs text-muted-foreground">
        {progress?.label ?? "Starting"}
        {progress?.current != null && progress.total != null ? ` · ${progress.current} of ${progress.total}` : ""}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full origin-left bg-primary", share == null && "animate-pulse")}
          style={{ transform: `scaleX(${share ?? 0.15})` }}
        />
      </div>
      <div className="text-[11px] text-muted-foreground">{elapsed(startedAt, now)} · Keeps going if you leave</div>
    </div>
  );
}
