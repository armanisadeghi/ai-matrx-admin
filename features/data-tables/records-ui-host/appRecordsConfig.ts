"use client";

/**
 * THE ONE RECORDS CONFIG, kept LIGHT on purpose (first-load campaign). It lives apart from
 * `recordsUiHost.tsx`, whose ports import the sharing modal, the connections UI and the whole
 * records-ui root: the signed-in shell mounts a `RecordsProvider` on EVERY route and only needs
 * this config, so importing it from the host file put that cluster in every page's first load
 * (`check:shell-eager-graph`). Import the config from HERE; `recordsUiHost.tsx` re-exports it.
 */
import { useLayoutEffect, useMemo } from "react";
import { personActor, setPersonTimeZone } from "@ai-matrx/records-ui/helpers";
import { createRecordsRealtimePort } from "@ai-matrx/records/realtime";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { usePersonTimeZone } from "@/hooks/usePersonTimeZone";
import { useRecordsDataSource, type RecordsDataSource } from "./recordsDataSource";

type DataSource = RecordsDataSource;

/**
 * ONE PORT PER ORGANIZATION, SO THE SAME ORGANIZATION IS THE SAME PORT (lane PANEL-REMOUNT,
 * 2026-09-24). `<RecordsProvider>` rebuilds its records client when `config.realtime` changes
 * identity, and the /data pages build `config` on every render of the page, so a fresh port
 * per call re-read the whole grid on any `?panels=` / `?view=` write. The package's port
 * (`@ai-matrx/records/realtime`) binds the AMBIENT manager `providers/RealtimeHost.tsx` mounts.
 */
const realtimePortsByOrganization = new Map<string, ReturnType<typeof createRecordsRealtimePort>>();

function realtimePortFor(organizationId: string): ReturnType<typeof createRecordsRealtimePort> {
  let port = realtimePortsByOrganization.get(organizationId);
  if (!port) {
    port = createRecordsRealtimePort();
    realtimePortsByOrganization.set(organizationId, port);
  }
  return port;
}

/** The `config` every records-ui mount takes (`RecordsMount` / `RecordsProvider`). */
export interface AppRecordsConfig {
  dataSource: DataSource;
  actor: ReturnType<typeof personActor>;
  organizationId: string | null;
  /** Live updates for the organization's tables; absent only while there is no organization. */
  realtime?: ReturnType<typeof createRecordsRealtimePort>;
}

/**
 * THE ONE RECORDS CONFIG. Every records-ui mount in the app takes its `config` from here:
 * the data seam, the signed-in person as actor, the organization, and the live-updates port
 * (one per organization, so the same organization is the same port). Never hand-build one.
 */
export function useAppRecordsConfig(organizationId: string | null): AppRecordsConfig {
  const dataSource = useRecordsDataSource();
  const userId = useAppSelector(selectUserId);
  // THE PERSON'S ZONE reaches every records-ui screen (calendar today, now-line, date picker) here: every
  // records mount builds its config through this hook, so the saved zone is mirrored once, in one place.
  const personZone = usePersonTimeZone();
  useLayoutEffect(() => {
    setPersonTimeZone(personZone);
  }, [personZone]);
  return useMemo(
    () => ({
      dataSource,
      actor: personActor(userId),
      organizationId,
      ...(organizationId ? { realtime: realtimePortFor(organizationId) } : {}),
    }),
    [dataSource, userId, organizationId],
  );
}
