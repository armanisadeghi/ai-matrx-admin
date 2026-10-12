"use client";

/**
 * One data source, in full: what you get (every column), what to enter (with examples), how many
 * (capped by the organization's limit, shown with its Change link) and what it costs at THIS
 * source's own price, then Get data — the same fetch flow as the board's Get data tile
 * (`../server.fetchData` held by `../runs`, so leaving never loses it; a reload reconnects to the
 * newest open job for this source through `GET /data-sources/jobs/{id}`; refusals through the shared
 * `RefusalView`). Done → Open table · Add to a board.
 *
 * Rendered inside the `dataSourceWindow` window panel (desktop: floating; phone: full screen).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, DownloadCloud, Table2 } from "lucide-react";
import {
  Badge,
  Button,
  Chip,
  ChipSet,
  ClampedNumberInput,
  EmptyState,
  RegionSkeleton,
  SegmentedControl,
} from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";

import { createClient } from "@/utils/supabase/client";

import { buildInput, capCount, countChoices } from "../contract";
import { AddToBoard } from "../AddToBoard";
import { SourceInputFields, modeOf } from "../SourceInputFields";
import { limitSettingHref, fetchedTablesKey } from "../hooks";
import { RefusalView } from "../RefusalView";
import { FetchProgress } from "../FetchProgress";
import { clearRun, resumeRun, runState, startRun, useRun } from "../runs";
import { fetchData, getJob } from "../server";
import type { Library, LibrarySource } from "./catalog";
import { GroupMark } from "./groupMark";
import {
  libraryKey,
  useLibrary,
  useLibraryOrganizationId,
  usePriceText,
} from "./hooks";

const OPEN_STATUSES = ["queued", "fetching", "waiting_for_provider", "storing"];

export const libraryRunKey = (sourceKey: string) => `library:${sourceKey}`;

/** The window body: reads the library (cached) and shows the one source. */
export function SourceDetail({ sourceKey, initialValues }: { sourceKey: string; initialValues?: Record<string, string> }) {
  const organizationId = useLibraryOrganizationId();
  const library = useLibrary(organizationId);
  if (library.isLoading) {
    return (
      <div className="p-4">
        <RegionSkeleton shape="rows" count={6} aria-label="Loading source" />
      </div>
    );
  }
  if (library.error || !library.data) {
    return (
      <div className="p-4">
        <ReadFailure
          error={library.error}
          what="the data source"
          onRetry={() => void library.refetch()}
        />
      </div>
    );
  }
  const source = library.data.sources.find((s) => s.key === sourceKey);
  if (!source || !organizationId) {
    return (
      <EmptyState
        icon={<DownloadCloud className="h-5 w-5" />}
        title="Source not available"
        line="It is no longer in the library."
      />
    );
  }
  return (
    <SourceRun
      key={source.key}
      source={source}
      library={library.data}
      organizationId={organizationId}
      initialValues={initialValues}
    />
  );
}

/** The newest open fetch of this source by this person (read client-direct under RLS), for reconnect. */
function useOpenJob(sourceKey: string) {
  return useQuery({
    queryKey: ["data-sources", "open-job", sourceKey],
    queryFn: async (): Promise<string | null> => {
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data, error } = await createClient()
        .schema("scraper")
        .from("data_fetch_job")
        .select("id")
        .eq("source_key", sourceKey)
        .in("status", OPEN_STATUSES)
        .gte("created_at", since)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as { id?: string } | null)?.id ?? null;
    },
    staleTime: 0,
  });
}

function SourceRun({
  source,
  library,
  organizationId,
  initialValues,
}: {
  source: LibrarySource;
  library: Library;
  organizationId: string;
  initialValues?: Record<string, string>;
}) {
  const key = libraryRunKey(source.key);
  const run = useRun(key);
  const queryClient = useQueryClient();
  const openJob = useOpenJob(source.key);

  // A fetch still running on the server with nothing in memory (a reload): reconnect to it.
  const savedJob = openJob.data ?? null;
  useEffect(() => {
    if (!savedJob || runState(key).status !== "idle") return;
    return resumeRun(key, (signal) =>
      getJob(savedJob, { organizationId, signal }),
    );
  }, [savedJob, organizationId, key]);

  const done = run.status === "done" ? run.result : null;
  useEffect(() => {
    if (done)
      void queryClient.invalidateQueries({ queryKey: fetchedTablesKey });
  }, [done, queryClient]);

  if (run.status === "failed") {
    return (
      <div className="flex min-h-full p-4">
        <RefusalView
          refusal={run.refusal}
          organizationId={organizationId}
          onBack={() => clearRun(key)}
        />
      </div>
    );
  }
  if (run.status === "running") {
    return (
      <div className="flex min-h-full p-4">
        <FetchProgress
          label={source.label}
          progress={run.progress}
          startedAt={run.startedAt}
        />
      </div>
    );
  }
  if (done) {
    const rows = done.rows_created + done.rows_updated;
    return (
      <div className="flex min-h-full p-4">
        <div
          className="m-auto flex max-w-sm flex-col items-center gap-3 p-2 text-center"
          data-fetch-done={done.table_id}
        >
          <CheckCircle2 className="h-7 w-7 text-success" />
          <div className="text-sm font-semibold text-foreground">
            {formatCount(rows)} {rows === 1 ? "record" : "records"} in{" "}
            {done.table_name}
          </div>
          {done.limit_applied && (
            <div className="text-xs text-muted-foreground">
              Lowered to your limit of {formatCount(done.limit_applied.value)}
            </div>
          )}
          {(done.notices ?? []).map((n) => (
            <p key={n} className="text-xs text-warning" data-fetch-notice="">
              {n}
            </p>
          ))}
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button
              asChild
              variant="primary"
              icon={<Table2 className="h-4 w-4" />}
            >
              <Link href={`/data/${encodeURIComponent(done.table_id)}`}>
                Open table
              </Link>
            </Button>
            <AddToBoard tableId={done.table_id} tableName={done.table_name} />
          </div>
          <Button variant="quiet" onClick={() => clearRun(key)}>
            Get more
          </Button>
        </div>
      </div>
    );
  }
  return (
    <SourceForm
      source={source}
      library={library}
      organizationId={organizationId}
      initialValues={initialValues}
      onFetch={(input, count) =>
        startRun(
          key,
          (onProgress) =>
            fetchData(
              { sourceKey: source.key, input, maxRecords: count },
              { organizationId, onProgress },
            ),
          () => {
            void queryClient.invalidateQueries({
              queryKey: libraryKey(organizationId),
            });
          },
        )
      }
    />
  );
}

type CountChoice = "10" | "50" | "100" | "500" | "custom";

function Section({
  title,
  end,
  children,
}: {
  title: string;
  end?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {end && (
          <div className="ml-auto text-xs text-muted-foreground">{end}</div>
        )}
      </div>
      {children}
    </section>
  );
}

function SourceForm({
  source,
  library,
  organizationId,
  initialValues,
  onFetch,
}: {
  source: LibrarySource;
  library: Library;
  organizationId: string;
  initialValues?: Record<string, string>;
  onFetch: (
    input: NonNullable<ReturnType<typeof buildInput>["input"]>,
    count: number,
  ) => void;
}) {
  const limit = library.limits.max_records_per_fetch;
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [option, setOption] = useState<string | null>(null);
  const [choice, setChoice] = useState<CountChoice>(
    limit && limit.value < 10 ? "custom" : "10",
  );
  const [custom, setCustom] = useState(capCount(10, limit?.value));
  const count = capCount(
    choice === "custom" ? custom : Number(choice),
    limit?.value,
  );
  const price = usePriceText();
  const unit = price(source, 1);
  const total = price(source, count);
  const built = buildInput(source, values, modeOf(source, option).option);
  const settingHref = limit
    ? limitSettingHref(organizationId, limit.setting)
    : null;

  return (
    <form
      className="flex min-h-full flex-col gap-5 p-4"
      data-source-detail={source.key}
      onSubmit={(e) => {
        e.preventDefault();
        if (built.input) onFetch(built.input, count);
      }}
    >
      <div className="flex items-start gap-3">
        <GroupMark group={source.group} subgroup={source.subgroup} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {source.confirmed ? (
              <Badge tone="success">Confirmed</Badge>
            ) : (
              <Badge tone="neutral">Not confirmed yet</Badge>
            )}
            {source.knownIssue && (
              <Badge tone="warning" title={source.knownIssue}>
                Known issue
              </Badge>
            )}
            {unit && (
              <span
                className="text-xs text-muted-foreground"
                data-unit-price=""
              >
                {unit} / record
              </span>
            )}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {[source.group, source.subgroup].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>
      {source.description && (
        <p className="-mt-2 text-sm text-foreground">{source.description}</p>
      )}
      {source.knownIssue && (
        <p className="-mt-2 text-xs text-warning">{source.knownIssue}</p>
      )}

      <Section
        title="What you get"
        end={
          source.outputFields.length
            ? `${source.outputFields.length} columns`
            : undefined
        }
      >
        {source.outputFields.length ? (
          <ChipSet>
            {source.outputFields.map((f) => (
              <Chip key={f} label={f} />
            ))}
          </ChipSet>
        ) : (
          <p className="text-xs text-muted-foreground">
            Every column the source returns becomes a table column
          </p>
        )}
      </Section>

      <Section title="What to enter">
        <SourceInputFields
          source={source}
          values={values}
          option={option}
          onValues={setValues}
          onOption={setOption}
        />
      </Section>

      <Section
        title="How many"
        end={
          limit ? (
            <span data-limit={limit.value}>
              Up to {formatCount(limit.value)}
              {settingHref && (
                <>
                  {" · "}
                  <Link
                    href={settingHref}
                    className="text-primary hover:underline"
                    target="_blank"
                  >
                    Change
                  </Link>
                </>
              )}
            </span>
          ) : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl<CountChoice>
            aria-label="How many records"
            value={choice}
            onValueChange={setChoice}
            data={[
              ...countChoices(limit?.value).map((c) => ({
                value: String(c.value) as CountChoice,
                label: String(c.value),
                disabled: !c.allowed,
                title: c.allowed
                  ? undefined
                  : `Above your limit of ${limit?.value}`,
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
      </Section>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex items-center justify-end gap-3 border-t border-border bg-card px-4 py-3">
        <span
          className="mr-auto text-xs text-muted-foreground"
          data-estimate=""
        >
          {formatCount(count)} {count === 1 ? "record" : "records"} ·{" "}
          {total ?? "No price yet"}
        </span>
        <Button
          type="submit"
          variant="primary"
          icon={<DownloadCloud className="h-4 w-4" />}
          disabled={!built.input}
        >
          Get data
        </Button>
      </div>
    </form>
  );
}
