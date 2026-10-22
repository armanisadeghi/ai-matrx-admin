"use client";

/**
 * Platform features on a board: a Schedule, a Knowledge source, a Visual map, a Report and a Sandbox.
 * Each tile body IS the feature's own component for one record, not a look-alike:
 *
 * - **Schedule** — `ScheduleDetail embedded` (`features/scheduling/components/detail`), the very
 *   component `/schedules/[id]` renders: spec, trigger, run history, copy, custom fields, and the
 *   page's actions (Run now, Pause / Enable, Delete) in a bar on the tile, with View / Edit — Edit is
 *   the page's own `ScheduleForm`, saving in place. It mounts `matrx-user/schedules` for this one
 *   schedule. Start new shows the same form; nothing is made until the person presses Create.
 * - **Knowledge source** — `DataStoreRecord` (`features/rag/components/data-stores`), the right pane
 *   of `/knowledge/data-stores`: members, files, edit, share, publish, with `matrx-user/knowledge-data-stores`.
 * - **Visual map** — `MapEditor embedded`, the very editor `/maps/[id]` renders, with `matrx-user/maps`.
 * - **Report** — `AgentDriftReport embedded`, `/reports/agent-drift`; its id is the report's slug.
 *   Reports are made by the platform, so there is Bring in only.
 * - **Sandbox** — `SandboxRecord embedded`, `/sandbox/[id]`: status, TTL, files and the live terminal,
 *   with `matrx-user/sandboxes`. A sandbox is a running machine that costs compute, so a tile
 *   refers to one that exists (Bring in); making one stays on the Sandbox page's create flow.
 *
 * Pure helpers: ./platform-items.logic.ts.
 */

import { useCallback, useEffect, useState } from "react";
import { Boxes, CalendarClock, ChartColumn, Database, Network } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { DEFAULT_ENTITY_LIST_QUERY } from "@/lib/entity-list/types";
import type { EntityListSort } from "@/lib/entity-list/types";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createClient } from "@/utils/supabase/client";
import { ScheduleDetail } from "@/features/scheduling/components/detail/ScheduleDetail";
import { ScheduleForm } from "@/features/scheduling/components/form/ScheduleForm";
import { selectTaskById } from "@/features/scheduling/redux/tasks/selectors";
import { useScheduledTasks } from "@/features/scheduling/hooks/useScheduledTasks";
import { listAgentTasks } from "@/features/scheduling/service/queries";
import { DataStoreRecord, NewDataStoreRecord } from "@/features/rag/components/data-stores/DataStoresPage";
import { useDataStores } from "@/features/rag/hooks/useDataStores";
import { listDataStoreCandidates } from "@/features/rag/service/dataStoreCandidates";
import { MapEditor } from "@/features/canvas/maps/MapEditor";
import { createMap, fetchMapListPage } from "@/features/canvas/maps/service";
import { AgentDriftReport } from "@/features/reports/components/agent-drift/AgentDriftReport";
import { REPORTS } from "@/features/reports/registry";
import { SandboxRecord } from "@/features/code/views/sandboxes/SandboxRecord";
import { sandboxDisplayName } from "@/lib/sandbox/format";
import { requireUserId } from "@/utils/auth/getUserId";
import { entityComments, type BoardItemType, type ItemBodyProps, type PickerProps } from "./types";
import { RecordDraftBody, type CreateRecord } from "./RecordDraftBody";
import { RecordList } from "./feature-items";
import { titleToAdopt } from "./feature-items.logic";
import { KnowledgeSourceStructure, MapStructure, ReportStructure, SandboxStructure, ScheduleStructure } from "./platform-structures";
import {
  KNOWLEDGE_SOURCE_ITEM_KEY,
  MAP_ITEM_KEY,
  NEW_MAP_NAME,
  NEW_SCHEDULE_NAME,
  NEW_KNOWLEDGE_SOURCE_NAME,
  REPORT_ITEM_KEY,
  SANDBOX_ITEM_KEY,
  SCHEDULE_ITEM_KEY,
  findPlatformRecords,
  knowledgeSourceHref,
  mapRecordHref,
  platformIdOf,
  platformSource,
  reportHref,
  sandboxHref,
  sandboxStatusOf,
  scheduleHref,
  scheduleStatusOf,
} from "./platform-items.logic";

// ─── Shared: a picker over one async list ────────────────────────────────────

type Rows<T> = { phase: "reading" } | { phase: "read"; rows: T[] } | { phase: "failed"; why: string };

function useRows<T>(load: () => Promise<T[]>, again: number): Rows<T> {
  const [read, setRead] = useState<Rows<T>>({ phase: "reading" });
  useEffect(() => {
    let alive = true;
    setRead({ phase: "reading" });
    load().then(
      (rows) => alive && setRead({ phase: "read", rows }),
      (err: unknown) => alive && setRead({ phase: "failed", why: err instanceof Error ? err.message : String(err) }),
    );
    return () => {
      alive = false;
    };
    // `load` is a module-level reader; a retry bumps `again`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [again]);
  return read;
}

function RowsPicker<T>({
  load,
  what,
  rowKey,
  rowText,
  renderRow,
  emptyState,
  onChoose,
  onCancel,
}: {
  load: () => Promise<T[]>;
  what: string;
  rowKey: (row: T) => string;
  rowText: (row: T) => string;
  renderRow: (row: T) => React.ReactNode;
  emptyState: React.ReactNode;
  onChoose: (row: T) => void;
  onCancel: () => void;
}) {
  const [again, setAgain] = useState(0);
  const read = useRows(load, again);
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <RecordList
        rows={read.phase === "read" ? read.rows : []}
        read={readOf(
          { loading: read.phase === "reading", error: read.phase === "failed" ? new Error(read.why) : null },
          { what, onRetry: () => setAgain((n) => n + 1) },
        )}
        rowKey={rowKey}
        rowText={rowText}
        onChoose={onChoose}
        onCancel={onCancel}
        emptyState={emptyState}
        renderRow={renderRow}
      />
    </div>
  );
}

const nameRow = (name: string, detail?: string | null) => (
  <>
    <span className="min-w-0 flex-1 truncate">{name}</span>
    {detail ? <span className="shrink-0 text-xs text-muted-foreground">{detail}</span> : null}
  </>
);

// ─── Schedule ────────────────────────────────────────────────────────────────

const pickedSchedule = (s: { id: string; title: string }) => ({ title: s.title.trim() || NEW_SCHEDULE_NAME, source: platformSource(SCHEDULE_ITEM_KEY, s.id) });

function SchedulePicker({ onPick, onCancel }: PickerProps) {
  const { tasks, status, error, refetch } = useScheduledTasks();
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <RecordList
        rows={tasks}
        read={readOf({ loading: status === "loading" || status === "idle", error: status === "error" ? new Error(error ?? "The read failed") : null }, { what: "your schedules", onRetry: () => void refetch() })}
        rowKey={(t) => t.id}
        rowText={(t) => `${t.title} ${t.description ?? ""}`}
        onChoose={(t) => onPick([pickedSchedule(t)])}
        onCancel={onCancel}
        emptyState={<>No schedules yet. Make one with New schedule.</>}
        renderRow={(t) => nameRow(t.title, t.enabled ? "On" : "Paused")}
      />
    </div>
  );
}

function ScheduleBody({ source, title, onSource }: ItemBodyProps) {
  const id = platformIdOf(SCHEDULE_ITEM_KEY, source);
  const name = useAppSelector((s) => selectTaskById(s, id)?.title ?? null);
  const next = titleToAdopt(title, name);
  useEffect(() => {
    if (next) onSource(source, next);
  }, [next, source, onSource]);
  if (!id) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-card p-3" data-board-scroll-root>
        <ScheduleForm onDone={(newId) => onSource(platformSource(SCHEDULE_ITEM_KEY, newId))} />
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 bg-card">
      <ScheduleDetail key={id} taskId={id} embedded />
    </div>
  );
}

// ─── Knowledge source ────────────────────────────────────────────────────────

const pickedStore = (s: { id: string; name: string }) => ({ title: s.name.trim() || NEW_KNOWLEDGE_SOURCE_NAME, source: platformSource(KNOWLEDGE_SOURCE_ITEM_KEY, s.id) });

function KnowledgeSourcePicker({ onPick, onCancel }: PickerProps) {
  const { stores, loading, error, refresh } = useDataStores();
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <RecordList
        rows={stores}
        read={readOf({ loading: loading && stores.length === 0, error: error ? new Error(error) : null }, { what: "your knowledge sources", onRetry: refresh })}
        rowKey={(s) => s.id}
        rowText={(s) => `${s.name} ${s.kind ?? ""} ${s.description ?? ""}`}
        onChoose={(s) => onPick([pickedStore(s)])}
        onCancel={onCancel}
        emptyState={<>No knowledge sources yet. Make one with New knowledge source.</>}
        renderRow={(s) => nameRow(s.name, `${s.memberCount} ${s.memberCount === 1 ? "item" : "items"}`)}
        isArchived={(s) => !s.isActive}
      />
    </div>
  );
}

function KnowledgeSourceBody({ source, title, onSource }: ItemBodyProps) {
  const id = platformIdOf(KNOWLEDGE_SOURCE_ITEM_KEY, source);
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) {
    return <NewDataStoreRecord onCreated={(newId, name) => onSource(platformSource(KNOWLEDGE_SOURCE_ITEM_KEY, newId), name)} />;
  }
  return <DataStoreRecord key={id} storeId={id} onName={follow} />;
}

// ─── Visual map ──────────────────────────────────────────────────────────────

const MAP_SORT = { sort: "updated_at", direction: "desc", pageSize: 200 } as unknown as EntityListSort;
const loadMaps = async () => (await fetchMapListPage({ ...DEFAULT_ENTITY_LIST_QUERY, archived: "active" }, MAP_SORT)).rows;

const pickedMap = (m: { id: string; title: string }) => ({ title: m.title.trim() || NEW_MAP_NAME, source: platformSource(MAP_ITEM_KEY, m.id) });

function MapPicker({ onPick, onCancel }: PickerProps) {
  return (
    <RowsPicker
      load={loadMaps}
      what="your maps"
      rowKey={(m) => m.id}
      rowText={(m) => `${m.title} ${m.description ?? ""}`}
      renderRow={(m) => nameRow(m.title, `${m.box_count} ${m.box_count === 1 ? "box" : "boxes"}`)}
      emptyState={<>No maps yet. Make one with New map.</>}
      onChoose={(m) => onPick([pickedMap(m)])}
      onCancel={onCancel}
    />
  );
}

// The map library's own create path (`createMap`); the organization gate is the draft body's.
const makeMap: CreateRecord = async () => {
  const made = await createMap(NEW_MAP_NAME);
  if (made.error || !made.id) throw new Error(made.error ?? "The map could not be created.");
  return { id: made.id, name: NEW_MAP_NAME };
};

function MapBody({ source, title, onSource }: ItemBodyProps) {
  const id = platformIdOf(MAP_ITEM_KEY, source);
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) {
    return (
      <RecordDraftBody
        noun="map"
        hint="A picture of how something works, saved to Maps and editable here and at its own page."
        icon={<Network />}
        create={makeMap}
        onMade={(made) => onSource(platformSource(MAP_ITEM_KEY, made.id), made.name)}
      />
    );
  }
  return (
    <div className="h-full min-h-0 bg-card">
      <MapEditor key={id} mapId={id} embedded onTitle={follow} />
    </div>
  );
}

// ─── Report ──────────────────────────────────────────────────────────────────

const LIVE_REPORTS = REPORTS.filter((r) => r.status === "live");
const pickedReport = (r: { slug: string; title: string }) => ({ title: r.title, source: platformSource(REPORT_ITEM_KEY, r.slug) });

function ReportPicker({ onPick, onCancel }: PickerProps) {
  return (
    <RecordList
      rows={LIVE_REPORTS}
      read={readOf({ loading: false, error: null }, { what: "the reports" })}
      rowKey={(r) => r.slug}
      rowText={(r) => `${r.title} ${r.description}`}
      onChoose={(r) => onPick([pickedReport(r)])}
      onCancel={onCancel}
      emptyState={<>No reports are available.</>}
      renderRow={(r) => nameRow(r.title)}
    />
  );
}

function ReportBody({ source }: ItemBodyProps) {
  const slug = platformIdOf(REPORT_ITEM_KEY, source);
  if (slug !== "agent-drift") return null;
  return (
    <div className="h-full min-h-0 bg-card">
      <AgentDriftReport mode="user" embedded />
    </div>
  );
}

// ─── Sandbox ─────────────────────────────────────────────────────────────────

type SandboxPickRow = { id: string; name: string | null; sandbox_id: string; status: string | null; created_at: string };

async function loadSandboxes(userId: string): Promise<SandboxPickRow[]> {
  const { data, error } = await createClient()
    .from("sandbox_instances")
    .select("id,name,sandbox_id,status,created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Your sandboxes could not be listed: ${error.message}`);
  return (data ?? []) as SandboxPickRow[];
}

const sandboxName = (r: SandboxPickRow) => sandboxDisplayName({ name: r.name, sandbox_id: r.sandbox_id } as Parameters<typeof sandboxDisplayName>[0]);
const pickedSandbox = (r: SandboxPickRow) => ({ title: sandboxName(r), source: platformSource(SANDBOX_ITEM_KEY, r.id) });

function SandboxPicker({ onPick, onCancel }: PickerProps) {
  const userId = useAppSelector(selectUserId);
  const load = useCallback(() => (userId ? loadSandboxes(userId) : Promise.resolve([])), [userId]);
  return (
    <RowsPicker
      key={userId ?? "none"}
      load={load}
      what="your sandboxes"
      rowKey={(r) => r.id}
      rowText={(r) => `${sandboxName(r)} ${r.status ?? ""}`}
      renderRow={(r) => nameRow(sandboxName(r), r.status)}
      emptyState={<>No sandboxes yet. Start one from the Sandbox page.</>}
      onChoose={(r) => onPick([pickedSandbox(r)])}
      onCancel={onCancel}
    />
  );
}

function SandboxBody({ source, title, tier, onSource }: ItemBodyProps) {
  const id = platformIdOf(SANDBOX_ITEM_KEY, source);
  const follow = useCallback(
    (name: string) => {
      const next = titleToAdopt(title, name);
      if (next) onSource(source, next);
    },
    [title, source, onSource],
  );
  if (!id) return null;
  return (
    <div className="h-full min-h-0 bg-card">
      <SandboxRecord key={id} id={id} embedded paused={tier === "offscreen"} onTitle={follow} />
    </div>
  );
}

// ─── The types ───────────────────────────────────────────────────────────────

const matchesKey = (key: string) => (s: ItemBodyProps["source"]) => s.kind === "entity" && s.entity === key;

export const PLATFORM_ITEMS: readonly BoardItemType[] = [
  {
    key: SCHEDULE_ITEM_KEY,
    surface: { name: "matrx-user/schedules" },
    comments: entityComments("sch_task"),
    label: "Schedule",
    sleeps: true, // LOCAL-SLEEP-TEST
    kindLabel: "schedule",
    icon: CalendarClock,
    group: "work",
    section: "work",
    accent: "cyan",
    structure: ScheduleStructure,
    status: {
      useStatus: function useScheduleStatus(source, basics) {
        const id = platformIdOf(SCHEDULE_ITEM_KEY, source);
        const enabled = useAppSelector((s) => (id ? selectTaskById(s, id)?.enabled : undefined));
        const suspended = useAppSelector((s) => (id ? Boolean(selectTaskById(s, id)?.metadata.auto_suspended) : false));
        return scheduleStatusOf(enabled === undefined ? null : { enabled, suspended }, basics);
      },
    },
    // The spec and trigger cards side by side over a long run history: tall.
    defaultSize: { w: 860, h: 960 },
    matches: matchesKey(SCHEDULE_ITEM_KEY),
    Body: ScheduleBody,
    startNew: { label: "New schedule", create: () => ({ title: NEW_SCHEDULE_NAME, source: platformSource(SCHEDULE_ITEM_KEY, null) }) },
    bringIn: { label: "Schedule", Picker: SchedulePicker },
    record: {
      place: (id, title) => pickedSchedule({ id, title: title ?? NEW_SCHEDULE_NAME }),
      // Not in the search projection: the schedules list the page reads (every schedule the person owns).
      find: (query, limit) =>
        findPlatformRecords(SCHEDULE_ITEM_KEY, query, limit, async () =>
          (await listAgentTasks()).map((t) => ({ id: t.id, name: t.title, detail: t.enabled ? "On" : "Paused", updated_at: t.updatedAt })),
        ),
    },
    href: (s) => {
      const id = platformIdOf(SCHEDULE_ITEM_KEY, s);
      return id ? scheduleHref(id) : null;
    },
  },
  {
    key: KNOWLEDGE_SOURCE_ITEM_KEY,
    surface: { name: "matrx-user/knowledge-data-stores" },
    comments: entityComments("data_store"),
    label: "Knowledge source",
    kindLabel: "knowledge source",
    icon: Database,
    group: "features",
    section: "ai",
    accent: "teal",
    structure: KnowledgeSourceStructure,
    status: { none: "A knowledge source has no running state; indexing shows on its files." },
    // Header, switches and a member table with file statuses: tall.
    defaultSize: { w: 900, h: 960 },
    matches: matchesKey(KNOWLEDGE_SOURCE_ITEM_KEY),
    Body: KnowledgeSourceBody,
    startNew: { label: "New knowledge source", create: () => ({ title: NEW_KNOWLEDGE_SOURCE_NAME, source: platformSource(KNOWLEDGE_SOURCE_ITEM_KEY, null) }) },
    bringIn: { label: "Knowledge source", Picker: KnowledgeSourcePicker },
    record: {
      place: (id, title) => pickedStore({ id, name: title ?? NEW_KNOWLEDGE_SOURCE_NAME }),
      // The association pickers' own candidate list (`fn_list_user_data_stores`: own, organization and granted stores).
      find: (query, limit) =>
        findPlatformRecords(KNOWLEDGE_SOURCE_ITEM_KEY, query, limit, async () => {
          const res = await listDataStoreCandidates({ limit: 500 });
          if (!res.ok) throw new Error(`Your knowledge sources could not be listed: ${res.error}`);
          return res.data.map((s) => ({ id: s.id, name: s.title, updated_at: null }));
        }),
    },
    href: (s) => {
      const id = platformIdOf(KNOWLEDGE_SOURCE_ITEM_KEY, s);
      return id ? knowledgeSourceHref(id) : null;
    },
  },
  {
    key: MAP_ITEM_KEY,
    surface: { name: "matrx-user/maps" },
    comments: entityComments("canvas_item"),
    label: "Visual map",
    kindLabel: "visual map",
    icon: Network,
    group: "features",
    section: "notes",
    accent: "indigo",
    structure: MapStructure,
    status: { none: "Its save state lives in the editor's own strip, not in a store the board can read." },
    // A canvas needs room for boxes and arrows: wide and tall.
    defaultSize: { w: 1100, h: 900 },
    matches: matchesKey(MAP_ITEM_KEY),
    Body: MapBody,
    startNew: { label: "New map", create: () => ({ title: NEW_MAP_NAME, source: platformSource(MAP_ITEM_KEY, null) }) },
    bringIn: { label: "Visual map", Picker: MapPicker },
    record: {
      place: (id, title) => pickedMap({ id, title: title ?? NEW_MAP_NAME }),
      // Not in the search projection: the map library's own list (every map the person can open).
      find: (query, limit) =>
        findPlatformRecords(MAP_ITEM_KEY, query, limit, async () =>
          (await loadMaps()).map((m) => ({ id: m.id, name: m.title, detail: m.description, updated_at: m.updated_at })),
        ),
    },
    href: (s) => {
      const id = platformIdOf(MAP_ITEM_KEY, s);
      return id ? mapRecordHref(id) : null;
    },
  },
  {
    key: REPORT_ITEM_KEY,
    surface: { name: "matrx-user/reports" },
    // A report is a view over the person's records, not a record with a thread: its door posts on the board.
    comments: null,
    label: "Report",
    sleeps: true, // LOCAL-SLEEP-TEST
    kindLabel: "report",
    icon: ChartColumn,
    group: "features",
    section: "data",
    accent: "amber",
    structure: ReportStructure,
    status: { none: "A report has no running state of its own; it reads the records it is about." },
    // The rollup table beside the agent usages detail: wide and tall.
    defaultSize: { w: 1100, h: 900 },
    matches: matchesKey(REPORT_ITEM_KEY),
    Body: ReportBody,
    bringIn: { label: "Report", Picker: ReportPicker },
    record: {
      place: (slug) => {
        const report = LIVE_REPORTS.find((r) => r.slug === slug) ?? LIVE_REPORTS[0];
        return pickedReport(report);
      },
      find: (query, limit) =>
        findPlatformRecords(
          REPORT_ITEM_KEY,
          query,
          limit,
          async () => LIVE_REPORTS.map((r) => ({ id: r.slug, name: r.title, detail: r.description, updated_at: null })),
        ).then((rows) => rows.slice(0, limit)),
    },
    href: (s) => {
      const slug = platformIdOf(REPORT_ITEM_KEY, s);
      return slug ? reportHref(slug) : null;
    },
  },
  {
    key: SANDBOX_ITEM_KEY,
    surface: { name: "matrx-user/sandboxes" },
    comments: entityComments("sandbox_instance"),
    label: "Sandbox",
    kindLabel: "sandbox",
    icon: Boxes,
    group: "features",
    section: "ai",
    accent: "slate",
    structure: SandboxStructure,
    status: {
      useStatus: function useSandboxStatus(_source, basics) {
        return sandboxStatusOf(null, basics);
      },
    },
    // Status cards over the files and a live terminal: tall.
    defaultSize: { w: 960, h: 960 },
    matches: matchesKey(SANDBOX_ITEM_KEY),
    Body: SandboxBody,
    bringIn: { label: "Sandbox", Picker: SandboxPicker },
    record: {
      place: (id, title) => ({ title: title?.trim() || "Sandbox", source: platformSource(SANDBOX_ITEM_KEY, id) }),
      find: (query, limit) =>
        findPlatformRecords(SANDBOX_ITEM_KEY, query, limit, async () =>
          (await loadSandboxes(requireUserId())).map((r) => ({ id: r.id, name: sandboxName(r), detail: r.status, updated_at: r.created_at })),
        ),
    },
    href: (s) => {
      const id = platformIdOf(SANDBOX_ITEM_KEY, s);
      return id ? sandboxHref(id) : null;
    },
  },
];
