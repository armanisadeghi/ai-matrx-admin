"use client";

/**
 * Custom data on a board: a Table and one Record, from the record store (`@ai-matrx/records`,
 * the `custom` schema — the `/data` system; the older `/data` is not built on).
 *
 * - **Table.** The body IS `/data/<table>`'s table page: `useUnifiedTable` + `UnifiedTableBody`
 *   (`features/unified-data/table-page/UnifiedTable.tsx`), the one component the route renders —
 *   `TablePage` inside `RecordsMount`, reading as the table's own organization, with the same
 *   ports, realtime, Sheet layout, merged-grid knob, table-menu extras and the
 *   `matrx-user/data-tables` surface (`RecordStoreTableSurface`, mounted by the body). Only the
 *   route's chrome is left out (back, title switcher, page capture, the address). Share and the
 *   table's one menu stay, in the table's own toolbar row.
 * - **Record.** The body is records-ui's `Peek` under the same mount and gates, with the
 *   `matrx-user/data-tables` surface scoped to that one row (`RecordStoreRecordSurface`).
 *
 * Picking a table lists every table the person can see across ALL her organizations (the data
 * home's own list, with the shell's organization filter defaulting to All organizations — never
 * the active organization); "New table" on the board is the package's making controls
 * (`makingOnly`, filed in the active organization), whose create answers the new table's id.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Database, DownloadCloud, LayoutList, Rows3, Table2 } from "lucide-react";
import { Peek, RecordsMount, RecordsTableCard, SectionCard, TableTokensProvider, TablesHome } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { recordsDataSource, rowName } from "@ai-matrx/records-ui/helpers";
import { useFields, useRecords, useTable } from "@ai-matrx/records/react";

import { readOf } from "@ai-matrx/design-system";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { createClient } from "@/utils/supabase/client";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { OrganizationContextNotice } from "@/features/organizations/components/OrganizationRequiredNotice";
import { countsByOrganization, inOrganization, useTablesEverywhere } from "@/features/unified-data/hub/useTablesEverywhere";
import { EntityOrgFilter } from "@/lib/entity-list/components/EntityOrgFilter";
import { CustomDataRecordsScope } from "@/features/agents/components/variables-management/custom-data/CustomDataRecordsScope";
import { recordsUiHostFor, useAppRecordsConfig, useRecordsUiPorts } from "@/features/data-tables/records-ui-host/recordsUiHost";
import { NO_ADDRESS, UnifiedTableBody, useUnifiedTable } from "@/features/unified-data/table-page/UnifiedTable";
import { RecordStoreRecordSurface } from "@/features/unified-data/grid-agent-context/RecordStoreRecordSurface";
import { DATA_TABLES_SURFACE, RecordStoreTableSurface } from "@/features/unified-data/grid-agent-context/RecordStoreTableSurface";

import type { DataHomeTableRow } from "@/features/unified-data/hub/doors";
import type { NodeSource } from "../board/document";
import type { BoardItemType, ItemBodyProps, PickerProps, TileMenuAction, TileMenuContext } from "./types";
import { titleToAdopt } from "./feature-items.logic";
import { RecordList } from "./feature-items";
import { tablesToPick } from "@/features/unified-data/hub/tablePicking";
import { dataHomeTables, findTables } from "./record-finders";
import { GetDataBody } from "../data-fetch/GetDataBody";
import { FetchedSourceBar } from "../data-fetch/FetchedSourceBar";
import { getDataSource, readDataFetchMeta } from "../data-fetch/tile-meta";
import { TABLE_ENTITY, TABLE_LAYOUT_CARD, TABLE_LAYOUT_SECTION, entityTableOf, tableLookHint, type EntityTileFilter } from "./table-tile";
import { useTileAutoHeight } from "../components/BoardTile";
import { RecordStructure, TableStructure } from "./structures";


function tableSource(id: string | null): NodeSource {
  return { kind: "entity", entity: TABLE_ENTITY, id };
}

/**
 * THE TABLE TILE'S TWO LAYOUTS: the table page (default) or a SECTION — the same table drawn as a
 * titled, grouped, edit-in-place section of a page (records-ui `SectionCard`: a design system's
 * Colors, a case plan's deadlines). Kept on the tile as `meta.layout`; the table is the same record.
 */

export type TableLayout = "table" | "section" | "card";

export function tableLayoutOf(source: NodeSource): TableLayout {
  if (source.kind !== "entity") return "table";
  if (source.meta?.layout === TABLE_LAYOUT_SECTION) return "section";
  // A card is the custom table's own: a registered schema table has no row detail to open inside it.
  if (source.meta?.layout === TABLE_LAYOUT_CARD && source.entity === TABLE_ENTITY && source.id) return "card";
  return "table";
}

function withTableLayout(source: NodeSource, layout: TableLayout): NodeSource {
  if (source.kind !== "entity") return source;
  const rest = Object.fromEntries(Object.entries(source.meta ?? {}).filter(([k]) => k !== "layout"));
  const meta =
    layout === "section" ? { ...rest, layout: TABLE_LAYOUT_SECTION } : layout === "card" ? { ...rest, layout: TABLE_LAYOUT_CARD } : rest;
  const { meta: _old, ...base } = source;
  void _old;
  return Object.keys(meta).length > 0 ? { ...base, meta } : base;
}

function tableIdOf(source: NodeSource): string | null {
  return source.kind === "entity" && source.entity === TABLE_ENTITY ? source.id : null;
}

/**
 * The record store for the organization the person works in — ONLY for MAKING a table (a write:
 * a new table is filed in the active organization). Never for choosing one: the list of tables a
 * person can pick is every table across all her organizations (`TablesAcrossOrganizations`), and
 * a table or record once picked reads as its OWN organization (`useUnifiedTable`). Law:
 * common-docs/policies/access-ladder.md.
 */
function WorkingOrganizationRecords({ children }: { children: ReactNode }) {
  const userId = useAppSelector(selectUserId);
  // org-filter: write-target a new table is filed in the organization the person works in
  const active = useOrganizationRequired();
  const recordsConfig = useAppRecordsConfig(active.organizationId ?? null);
  const ports = useRecordsUiPorts({ organizationId: active.organizationId, dataSource: recordsConfig.dataSource });
  if (active.organizationState !== "ready" || !active.organizationId) {
    return <OrganizationContextNotice state={active.organizationState} what="Data records" />;
  }
  return (
    <RecordsMount // org-filter: write-target the record store only for MAKING a table; choosing one reads across every organization
      letTheStoreDecideRights
      config={recordsConfig}
      host={recordsUiHostFor({ ports, merged: false })}
    >
      {children}
    </RecordsMount>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

/**
 * Every table the person can see, across ALL her organizations — the data home's own list
 * (`useTablesEverywhere`), one flat list with each row naming its organization, and the shell's
 * organization filter (All organizations on every open, never remembered, never the active org).
 */
function TablesAcrossOrganizations({
  onChoose,
  onCancel,
}: {
  onChoose: (row: DataHomeTableRow) => void;
  onCancel: () => void;
}) {
  const tables = useTablesEverywhere();
  const [orgFilter, setOrgFilter] = useState<string | null>(null);
  const rows = tablesToPick(inOrganization(tables.rows, orgFilter));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <EntityOrgFilter
          orgId={orgFilter}
          onChange={setOrgFilter}
          counts={{ byKind: {}, narrow: { all: countsByOrganization(tables.rows) } }}
          countsLoading={tables.loading}
        />
      </div>
      <RecordList
        rows={rows}
        read={readOf(
          { loading: tables.loading, error: tables.error },
          { what: "your tables", onRetry: tables.reload },
        )}
        rowKey={(t) => t.table_id}
        rowText={(t) => `${t.table_name} ${t.organization_name}`}
        onChoose={onChoose}
        onCancel={onCancel}
        emptyState={<>No tables yet. Make one with New table.</>}
        renderRow={(t) => (
          <>
            <span className="min-w-0 flex-1 truncate">{t.table_name}</span>
            <span className="shrink-0 truncate text-xs text-muted-foreground">{t.organization_name}</span>
          </>
        )}
      />
    </div>
  );
}

function TablePicker({ onPick, onCancel }: PickerProps) {
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <TablesAcrossOrganizations
        onCancel={onCancel}
        onChoose={(t) => onPick([{ title: t.table_name, source: tableSource(t.table_id) }])}
      />
    </div>
  );
}

/** "Section from a table": the same table picker; the tile lands drawn as a section card. */
function SectionTablePicker({ onPick, onCancel }: PickerProps) {
  return (
    <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
      <TablesAcrossOrganizations
        onCancel={onCancel}
        onChoose={(t) => onPick([{ title: t.table_name, source: withTableLayout(tableSource(t.table_id), "section") }])}
      />
    </div>
  );
}

/** A new table: the package's own making controls; the table it makes becomes this tile. */
function TableDraftBody({ onSource }: ItemBodyProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto p-4">
      <WorkingOrganizationRecords>
        <TablesHome makingOnly onOpenTable={(tableId: string) => onSource(tableSource(tableId))} />
      </WorkingOrganizationRecords>
    </div>
  );
}

/** Adopt the table's own name as the tile title (inside the mount: it reads through its client). */
function AdoptTableName({ tableId, source, title, onSource }: { tableId: string } & Pick<ItemBodyProps, "source" | "title" | "onSource">) {
  const table = useTable(tableId);
  const next = titleToAdopt(title, tileNameOf(table.data?.name, source));
  useEffect(() => {
    if (next) onSource(source, next);
  }, [next, source, onSource]);
  return null;
}

/**
 * The tile remembers its table's LOOK (`meta.look`: the first plug-in look a column wears — a color pair,
 * a type style, a spacing measure…), so the outline can give the chapter its own icon without reading
 * the table itself. Written only when it changes, outside the undo stack (like the adopted name).
 */
function AdoptTableLook({ tableId, source, onSource }: { tableId: string } & Pick<ItemBodyProps, "source" | "onSource">) {
  const fields = useFields(tableId);
  const hint = fields.data ? tableLookHint(fields.data) : undefined;
  const kept = source.kind === "entity" ? source.meta?.look : undefined;
  useEffect(() => {
    if (hint === undefined || source.kind !== "entity" || (kept ?? null) === hint) return;
    const rest = Object.fromEntries(Object.entries(source.meta ?? {}).filter(([k]) => k !== "look"));
    onSource({ ...source, meta: hint === null ? rest : { ...rest, look: hint } });
  }, [hint, kept, source, onSource]);
  return null;
}

/** The table tile's own "…" entries: switch between the table page and the section card. */
export function tableMenuActions({ source, onSource }: TileMenuContext): TileMenuAction[] {
  if (!tableIdOf(source) && !entityTableOf(source)) return [];
  // A read-only tile has one layout (the section is the card that takes `readOnly`): nothing to switch.
  if (entityTableOf(source)?.readOnly) return [];
  const now = tableLayoutOf(source);
  const next = now === "table" ? "section" : "table";
  return [
    {
      key: "layout",
      label: next === "section" ? "Show as section" : "Show as table",
      icon: next === "section" ? LayoutList : Table2,
      onSelect: () => onSource(withTableLayout(source, next)),
    },
    // A custom table only: a row clicked in the card opens its detail inside the card (records-ui `openRowInCard`).
    ...(tableIdOf(source) && now !== "card"
      ? [{ key: "card", label: "Show as card", icon: LayoutList, onSelect: () => onSource(withTableLayout(source, "card")) }]
      : []),
  ];
}

/**
 * A section drawn in its BOARD'S design system: every component sample in it reads the board's token
 * tables (reading order) as CSS variables. Off a board, or a board with no token
 * tables, it is the plain section (samples keep the app's own tokens).
 */
export function SectionWithBoardTokens({ tableId, title }: { tableId: string; title?: string | undefined }) {
  // The board's tokens are provided once for every tile (`BoardTokensMount`), so the section adds none.
  // The section is titled as its tile is ("Colors"), never the copy's long table name.
  // An empty section on a board is its heading and Add only (a fresh design board is ten of them).
  return <SectionCard source={{ kind: "table", id: tableId }} empty="quiet" {...(title ? { title } : {})} />;
}

/**
 * The name a template table's tile shows: a fresh copy names its tables "<Table> · <board title>" so they
 * stay apart in the data home; on its own board the tile reads just "<Table>". Other tables keep their name.
 */
export function tileNameOf(tableName: string | null | undefined, source: ItemBodyProps["source"]): string | null | undefined {
  const fromPack = source.kind === "entity" && typeof source.meta?.table_token === "string";
  if (!fromPack || !tableName) return tableName;
  const at = tableName.lastIndexOf(" · ");
  return at > 0 ? tableName.slice(0, at) : tableName;
}

/**
 * A BOARD DRAWS IN ITS OWN DESIGN SYSTEM: every component sample on the board (sections, the cover, any
 * html frame) reads the board's token tables as CSS variables, provided ONCE around the whole tile layer.
 * The token tables are read through the record store in the organization the person works in; until that
 * organization is ready the tiles draw as they are, never behind a notice; with no token tables the samples
 * keep the app's own tokens.
 */
export function BoardTokensMount({ tableIds, children }: { tableIds: readonly string[]; children: ReactNode }) {
  const active = useOrganizationRequired();
  const recordsConfig = useAppRecordsConfig(active.organizationId ?? null);
  const ports = useRecordsUiPorts({ organizationId: active.organizationId, dataSource: recordsConfig.dataSource });
  // Mounted whatever the token tables are, so a board gaining its first token table never remounts its tiles.
  if (active.organizationState !== "ready" || !active.organizationId) return <>{children}</>;
  return (
    <RecordsMount letTheStoreDecideRights config={recordsConfig} host={recordsUiHostFor({ ports, merged: false })}>
      <TableTokensProvider tableIds={tableIds}>{children}</TableTokensProvider>
    </RecordsMount>
  );
}

export function TableRecordBody({ id, tileId, source, title, onSource }: ItemBodyProps & { id: string }) {
  const mount = useUnifiedTable({ tableId: id, address: NO_ADDRESS });
  // A table made by "Get data" (anywhere) says where its rows came from, with Refresh and Get more.
  const fetched = (source.kind === "entity" ? readDataFetchMeta(source.meta)?.fetched : undefined) ?? null;
  const section = tableLayoutOf(source) === "section";
  const card = tableLayoutOf(source) === "card";
  // Page layout: the section card IS the tile (no padding, no inner scroll); the tile takes its height.
  const auto = useTileAutoHeight() && section;
  return (
    <div
      className={
        auto
          ? // A wide section scrolls sideways inside its own card only (a phone); it never scrolls down.
            "flex min-w-0 flex-col gap-2 overflow-x-auto"
          : mount.mountsTheTable
            ? "h-full min-h-0 overflow-y-auto px-2 pb-2 pt-1"
            : "h-full min-h-0 overflow-y-auto p-4"
      }
    >
      <UnifiedTableBody
        mount={mount}
        before={
          <>
            <AdoptTableName tableId={id} source={source} title={title} onSource={onSource} />
            <FetchedSourceBar tileId={tileId} tableId={id} source={source} fetched={fetched} onSource={onSource} />
            <AdoptTableLook tableId={id} source={source} onSource={onSource} />
          </>
        }
        // A section or a card is still this table: it mounts the table's surface too (the table page mounts it
        // inside `UnifiedTableBody`), so board_open_item reads its id, name and columns whatever the layout.
        {...(section
          ? {
              content: (
                <RecordStoreTableSurface channel={mount.gridContext} tableId={id}>
                  <SectionWithBoardTokens tableId={id} title={title} />
                </RecordStoreTableSurface>
              ),
            }
          : card
            ? {
                content: (
                  <RecordStoreTableSurface channel={mount.gridContext} tableId={id}>
                    <RecordsTableCard source={{ kind: "table", id }} openRowInCard editable />
                  </RecordStoreTableSurface>
                ),
              }
            : {})}
      />
    </div>
  );
}

/**
 * A table tile over a REAL SCHEMA TABLE (a registered entity token, `meta.token`; optionally one parent's rows,
 * `meta.filter`): records-ui's section card or table card with `source: { kind: "entity" }`, read and written
 * through the platform's entity doors. Mounted in the person's working organization: that is where a row added
 * here is filed (reads are every organization she can see, narrowed only by the tile's own filter).
 */
function EntityTableTileBody({ token, filter, readOnly, source }: { token: string; filter?: EntityTileFilter; readOnly?: boolean; source: NodeSource }) {
  // A read-only tile is always a section: records-ui's SectionCard is the card that takes `readOnly`.
  const section = readOnly === true || tableLayoutOf(source) === "section";
  const auto = useTileAutoHeight() && section;
  const entitySource = { kind: "entity" as const, token, ...(filter ? { filter } : {}) };
  return (
    <div className={auto ? "flex min-w-0 flex-col gap-2 overflow-x-auto" : "h-full min-h-0 overflow-y-auto px-2 pb-2 pt-1"}>
      <WorkingOrganizationRecords>
        {section ? <SectionCard source={entitySource} {...(readOnly ? { readOnly: true } : {})} /> : <RecordsTableCard source={entitySource} />}
      </WorkingOrganizationRecords>
    </div>
  );
}

function TableItemBody(props: ItemBodyProps) {
  const entityTable = entityTableOf(props.source);
  if (entityTable) return <EntityTableTileBody key={entityTable.token} token={entityTable.token} {...(entityTable.filter ? { filter: entityTable.filter } : {})} {...(entityTable.readOnly ? { readOnly: true } : {})} source={props.source} />;
  const id = tableIdOf(props.source);
  if (id) return <TableRecordBody key={id} id={id} {...props} />;
  // "Get data": the tile is the fetch panel until the server answers with the table.
  if (props.source.kind === "entity" && readDataFetchMeta(props.source.meta)) return <GetDataBody {...props} />;
  return <TableDraftBody {...props} />;
}


// ─── Record ──────────────────────────────────────────────────────────────────

function recordIdsOf(source: NodeSource): { tableId: string; recordId: string } | null {
  return source.kind === "record" ? { tableId: source.tableId, recordId: source.recordId } : null;
}

/** The chosen table's records, read through the store's own page read and named its own way. */
function RecordChoices({
  tableId,
  onPick,
  onBack,
}: {
  tableId: string;
  onPick: PickerProps["onPick"];
  onBack: () => void;
}) {
  const table = useTable(tableId);
  const records = useRecords(tableId);
  const titleField = table.data?.title_field ?? null;
  const tableName = table.data?.name?.trim() || "this table";
  return (
    <RecordList
      rows={records.data?.rows ?? []}
      read={readOf(
        { loading: records.loading && !records.data, error: records.error },
        { what: `the records in ${tableName}`, onRetry: records.reload },
      )}
      rowKey={(r) => r.id}
      rowText={(r) => rowName(r, titleField)}
      onChoose={(r) =>
        onPick([{ title: rowName(r, titleField), source: { kind: "record", tableId, recordId: r.id } }])
      }
      onCancel={onBack}
      emptyState={<>{tableName} has no records yet. Bring the table in and add one there.</>}
      renderRow={(r) => <span className="min-w-0 flex-1 truncate">{rowName(r, titleField)}</span>}
    />
  );
}

function RecordPicker({ onPick, onCancel }: PickerProps) {
  const [table, setTable] = useState<{ id: string; organizationId: string } | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {table ? "Choose the record." : "Choose the table the record is in."}
      </p>
      <div className="max-h-[min(560px,70dvh)] overflow-y-auto">
        {table ? (
          // The record store, bound to the organization the TABLE lives in — never the active one.
          <CustomDataRecordsScope tableId={table.id} organizationId={table.organizationId}>
            <RecordChoices tableId={table.id} onPick={onPick} onBack={() => setTable(null)} />
          </CustomDataRecordsScope>
        ) : (
          <TablesAcrossOrganizations
            onCancel={onCancel}
            onChoose={(t) => setTable({ id: t.table_id, organizationId: t.organization_id })}
          />
        )}
      </div>
    </div>
  );
}

function RecordBody({ source }: ItemBodyProps) {
  const ids = recordIdsOf(source);
  const mount = useUnifiedTable({ tableId: ids?.tableId ?? "", address: NO_ADDRESS });
  if (!ids) return null;
  return (
    <div className="h-full min-h-0 overflow-y-auto p-2">
      <UnifiedTableBody
        mount={mount}
        content={
          <RecordStoreRecordSurface tableId={ids.tableId} recordId={ids.recordId}>
            <Peek tableId={ids.tableId} recordId={ids.recordId} />
          </RecordStoreRecordSurface>
        }
      />
    </div>
  );
}

export const DATA_ITEMS: readonly BoardItemType[] = [
  {
    key: TABLE_ENTITY,
    surface: { name: DATA_TABLES_SURFACE },
    // A data table is not a registered entity type, so it has no thread of its own: the tile's
    // comments go on the board (the door says so).
    comments: null,
    label: "Table",
    kindLabel: "data table",
    icon: Database,
    group: "work",
    section: "data",
    accent: "emerald",
    structure: TableStructure,
    status: { none: "Its load state lives in the grid's own mount, which an idle tile does not run." },
    defaultSize: { w: 960, h: 860 },
    matches: (s) => s.kind === "entity" && s.entity === TABLE_ENTITY,
    // The Get data tile is the source picker until its table exists: one click opens it.
    opensOnClick: (s) => s.kind === "entity" && !tableIdOf(s) && Boolean(readDataFetchMeta(s.meta)),
    Body: TableItemBody,
    menuActions: tableMenuActions,
    // A section card carries its own title (its h2) and lays out at its natural height.
    namesItself: (s) => (Boolean(tableIdOf(s)) || Boolean(entityTableOf(s))) && tableLayoutOf(s) !== "table",
    autoHeight: (s) => (Boolean(tableIdOf(s)) || Boolean(entityTableOf(s))) && tableLayoutOf(s) === "section",
    // Wakes with its grid, scroll, selection and open cell intact: the gates keep their answers
    // (lib/kept-answer), so a wake never drops to "Opening the table…" (lane REMOUNT-SAFETY).
    sleeps: true,
    startNew: [
      { label: "New table", create: () => ({ title: "New table", source: tableSource(null) }) },
      { label: "Get data", icon: DownloadCloud, create: () => ({ title: "Get data", source: getDataSource() }), openAtOnce: true },
      { label: "Section from a table", icon: LayoutList, Picker: SectionTablePicker },
    ],
    bringIn: { label: "Table", Picker: TablePicker },
    // Tables are not in the search projection: the table picker's own list, matched on the name.
    record: {
      place: (id, title) => ({ title: title?.trim() || "Table", source: tableSource(id) }),
      find: (query, limit) =>
        findTables(TABLE_ENTITY, query, limit, () => dataHomeTables(recordsDataSource(createClient()), null)),
    },
    href: (s) => {
      const id = tableIdOf(s);
      return id ? `/data/${id}` : null;
    },
  },
  {
    key: "record",
    surface: { name: DATA_TABLES_SURFACE },
    comments: (s) => (s.kind === "record" ? { token: "record", id: s.recordId } : null),
    label: "Record",
    kindLabel: "data record",
    icon: Rows3,
    group: "work",
    section: "data",
    accent: "emerald",
    structure: RecordStructure,
    status: { none: "A record has no lifecycle of its own; its table holds it." },
    defaultSize: { w: 560, h: 900 },
    matches: (s) => s.kind === "record",
    Body: RecordBody,
    sleeps: true,
    bringIn: { label: "Record", Picker: RecordPicker },
    href: (s) => {
      const ids = recordIdsOf(s);
      return ids ? `/data/${ids.tableId}?record=${ids.recordId}` : null;
    },
  },
];

