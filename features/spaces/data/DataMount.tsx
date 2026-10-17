"use client";

// features/spaces/data/DataMount.tsx — the record store a data block reads through.
//
// Sample: the agency installed into memory (`templatePreview`), read-only. Live: the app's own records
// config (the /data page's: session-carrying client, the person as actor, realtime, the app's host
// ports), bound to the TABLE's own organization — never the active one (access ladder).

import { RecordsMount } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import type { RecordsConfig } from "@ai-matrx/records";
import { useRef, type ReactNode } from "react";

import { recordsUiHostFor, useAppRecordsConfig, useRecordsUiPorts } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { useRecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";
import { primeObjectOrganization, readObjectOrganizationAnswer, useObjectOrganization } from "@/features/unified-data/objectOrganization";

import { useSeededWhere } from "../page/space-seed-context";

import { usePublishedRows } from "./published-rows";
import { sampleWorld } from "./sources";

/**
 * The sample's live port. The in-memory world lives in this tab only: nothing outside it can change
 * a row, and a change made here re-reads through the store already. So the port is truthful with
 * nothing to forward — the sample's lists ARE live, and say so.
 */
const SAMPLE_REALTIME: NonNullable<RecordsConfig["realtime"]> = { subscribeRecords: () => () => undefined };

const sampleConfigs = new Map<string, RecordsConfig>();
function sampleRecordsConfig(id: string): RecordsConfig | null {
  const world = sampleWorld(id);
  if (!world) return null;
  let config = sampleConfigs.get(id);
  if (!config) {
    config = { ...world.config, realtime: SAMPLE_REALTIME };
    sampleConfigs.set(id, config);
  }
  return config;
}

function SampleMount({ sample, children, held }: { sample: string; children: ReactNode; held: (line: string) => ReactNode }) {
  const config = sampleRecordsConfig(sample);
  if (!config) return <>{held("This sample isn’t loaded on this page.")}</>;
  return (
    <RecordsMount config={config} letTheStoreDecideRights>
      {children}
    </RecordsMount>
  );
}

/** A real table: the app's one records config (session, the person as actor, realtime) bound to
 *  the table's own organization, with the app's host ports — the same mount /data uses. */
function LiveBound({ organizationId, children }: { organizationId: string; children: ReactNode }) {
  const config = useAppRecordsConfig(organizationId);
  const ports = useRecordsUiPorts({ organizationId, dataSource: config.dataSource });
  return (
    // org-filter: write-target a data block reads and writes as the table's own organization
    <RecordsMount letTheStoreDecideRights config={config} host={recordsUiHostFor({ ports, merged: true })}>
      {children}
    </RecordsMount>
  );
}

function LiveMount({ tableId, children, held }: { tableId: string; children: ReactNode; held: (line: string, retry?: () => void) => ReactNode }) {
  // Round 34: the server already asked where this table opens (the page's seed) — drawn in the first
  // pass, and handed to the kept store so the browser asks nothing.
  const seeded = useSeededWhere(tableId);
  const primed = useRef<string | null>(null);
  // Never on the server: the kept store is module state there, shared by every request.
  if (seeded && primed.current !== tableId && typeof window !== "undefined") {
    primed.current = tableId;
    primeObjectOrganization(tableId, Promise.resolve(readObjectOrganizationAnswer(seeded, tableId)));
  }
  const asked = useObjectOrganization(useRecordsDataSource(), tableId);
  const opens = asked.state === "resolving" && seeded ? { ...readObjectOrganizationAnswer(seeded, tableId), retry: asked.retry } : asked;
  if (opens.state === "found") return <LiveBound organizationId={opens.organizationId}>{children}</LiveBound>;
  if (opens.state === "resolving") return <>{held("")}</>;
  return <>{held(opens.state === "unavailable" ? "This database can’t be opened right now." : "This database isn’t shared with you.", opens.retry)}</>;
}

export function DataMount({
  sample,
  tableId,
  children,
  held,
}: {
  /** The in-memory world the table lives in (`props.sample`); null = a real table. */
  sample: string | null;
  tableId: string;
  children: ReactNode;
  held: (line: string, retry?: () => void) => ReactNode;
}) {
  const published = usePublishedRows();
  if (sample)
    return (
      <SampleMount sample={sample} held={held}>
        {children}
      </SampleMount>
    );
  // A page on the web: the rows the page itself published (content.space_public_view), never a live read.
  if (published) {
    const config = published.get(tableId);
    if (!config) return <>{held("This database isn’t published with this page.")}</>;
    return (
      <RecordsMount config={config} letTheStoreDecideRights>
        {children}
      </RecordsMount>
    );
  }
  return (
    <LiveMount tableId={tableId} held={held}>
      {children}
    </LiveMount>
  );
}
