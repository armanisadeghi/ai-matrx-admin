"use client";

/**
 * One record from a data source, at once: the shared hook for a card or
 * an autofill that wants a single page's facts (a company's LinkedIn page, a Google Maps place)
 * instead of a table. It is the same `/data-sources/fetch` door as Get data - the record also lands
 * in the person's own table - and nothing runs until `start` is called from a click.
 */

import { clearRun, startRun, useRun, type RunState } from "./runs";
import { fetchData } from "./server";
import { useDataSources } from "./hooks";
import type { DataFetchResult, DataSource } from "./contract";
import type { DataRecord } from "./records";

export interface SourceLookup {
  source: DataSource | null;
  run: RunState;
  start: (url: string, onRecord: (record: DataRecord | null, result: DataFetchResult) => void) => void;
  dismiss: () => void;
}

export function useSourceLookup(args: {
  organizationId: string | null;
  sourceKey: string;
  /** One run per key; a remount re-attaches to it. */
  runKey: string;
  /** The table the record is also stored in (reused across lookups so they upsert, not pile up). */
  tableName: string;
}): SourceLookup {
  const { organizationId, sourceKey, runKey, tableName } = args;
  const catalog = useDataSources(organizationId);
  const run = useRun(runKey);
  const source = catalog.data?.sources.find((s) => s.key === sourceKey) ?? null;
  return {
    source,
    run,
    dismiss: () => clearRun(runKey),
    start: (url, onRecord) => {
      if (!organizationId) return;
      startRun(
        runKey,
        (onProgress) =>
          fetchData({ sourceKey, input: { url }, maxRecords: 1, tableName, includeRecords: true }, { organizationId, onProgress }),
        (result) => {
          onRecord(result.records?.[0] ?? null, result);
          clearRun(runKey);
        },
      );
    },
  };
}
