"use client";

/**
 * RunsComparisonTable — the comparison the Runs window draws.
 *
 * Standings first (overall place, wins, average place, and who leads each
 * scored metric), then every metric section with the best value green, the
 * worst red, and each column's place on that metric — the shared comparison
 * matrix (`MatrxComparisonTable`). Every table carries the platform's own
 * tools: Copy / Copy for AI / Export (the table's Alchemy menu, raw numbers as
 * data) and Save to (a custom data table, a workbook, a Google Sheet). The data and its masking
 * come from `runsComparisonData`; the rankings from `runsRanking`; the report
 * shapes (Markdown, rows, HTML) from `runsComparisonReport`.
 */

import { EyeOff, Trophy } from "lucide-react";
import { Badge } from "@ai-matrx/design-system/controls";
import {
  MatrxComparisonTable,
  MatrxDataTable,
  type ComparisonRow,
  type ComparisonSubject,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { TableSaveToMenu } from "@ai-matrx/rich-content/display/tables/TableSaveToMenu";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCatalogBoundSelector } from "../shared/useCatalogBoundSelector";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { selectBlindActive } from "../redux/selectors";
import { selectMountedBattleName } from "../shared/activeBattleColumns";
import {
  selectVisibleRunsComparison,
  type ColumnStats,
  type MetricSection,
} from "./runsComparisonData";
import {
  computeRanking,
  ordinal,
  type RunsRanking,
  type Standing,
} from "./runsRanking";
import { rowsWithData, sectionDataGrid, standingsDataGrid } from "./runsComparisonReport";

export function RunsComparisonTable() {
  const { stats, sections } = useCatalogBoundSelector(selectVisibleRunsComparison);
  const blindActive = useAppSelector(selectBlindActive);
  const { unit: costUnit } = useCostDisplay();

  const battleName = useAppSelector(selectMountedBattleName);

  if (stats.length === 0) return null;
  const ranking = computeRanking(stats, sections, costUnit);
  // A saved table is named after its battle, never a bare "Summary".
  const tableName = (section: string) =>
    battleName ? `${battleName} — ${section}` : `Runs comparison — ${section}`;
  // Sections nobody has data for yet are named in one line, not drawn as
  // tables of dashes — the window matches what prints and publishes.
  const withData = sections.filter((sec) => rowsWithData(sec, stats).length > 0);
  const empty = sections.filter((sec) => rowsWithData(sec, stats).length === 0);

  return (
    <div className="space-y-3 p-3">
      <ColumnHeaderStrip stats={stats} />
      {blindActive && (
        <div className="flex items-center gap-2 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2">
          <EyeOff className="w-3.5 h-3.5 text-violet-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Blind test: metrics hidden until you reveal.
          </span>
        </div>
      )}
      <StandingsCard ranking={ranking} name={tableName("Standings")} />
      {withData.map((section) => (
        <SectionTable
          key={section.title}
          section={section}
          stats={stats}
          name={tableName(section.title)}
        />
      ))}
      {empty.length > 0 && (
        <p className="text-[10px] text-muted-foreground px-1">
          {/* read-gate-exempt: these sections are computed from this session's runs in the store, not a read */}
          No data yet: {empty.map((sec) => sec.title).join(", ")}
        </p>
      )}
    </div>
  );
}

function ColumnHeaderStrip({ stats }: { stats: ColumnStats[] }) {
  return (
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
      Comparing {stats.length} column{stats.length === 1 ? "" : "s"} ·
      <span className="ml-1 text-emerald-500 font-semibold">green</span> = best,
      {/* Best/worst is computed per row across the columns that have a value. */}
      <span className="ml-1 text-rose-500 font-semibold">red</span> = worst ·
      badge = place
    </div>
  );
}

function PlaceBadge({ place }: { place: number }) {
  return (
    <Badge tone={place === 1 ? "success" : "neutral"} title={`${ordinal(place)} place overall`}>
      {ordinal(place)}
    </Badge>
  );
}

function StandingsCard({ ranking, name }: { ranking: RunsRanking; name: string }) {
  if (!ranking.standings.some((s) => s.ranked > 0)) return null;
  const data = standingsDataGrid(ranking);
  const columns: MatrxColumnDef<Standing>[] = [
    {
      id: "place",
      header: "Place",
      width: 80,
      accessorFn: (s) => (s.place > 0 ? s.place : null),
      copyValue: (s) => (s.place > 0 ? ordinal(s.place) : "—"),
      cell: (s) => (s.place > 0 ? <PlaceBadge place={s.place} /> : "—"),
    },
    {
      id: "column",
      header: "Column",
      accessorFn: (s) => s.name,
      tone: (s) => (s.place === 1 ? "success" : undefined),
    },
    { id: "wins", header: "Wins", align: "right", width: 90, accessorFn: (s) => s.wins, format: { id: "integer" } },
    {
      id: "average",
      header: "Average place",
      align: "right",
      width: 130,
      accessorFn: (s) => s.averagePlace,
      copyValue: (s) => (s.averagePlace != null ? s.averagePlace.toFixed(1) : "—"),
      cell: (s) => (s.averagePlace != null ? s.averagePlace.toFixed(1) : "—"),
    },
    { id: "ranked", header: "Metrics ranked", align: "right", width: 130, accessorFn: (s) => s.ranked, format: { id: "integer" } },
  ];
  return (
    <div className="space-y-2">
      <MatrxDataTable<Standing>
        data={ranking.standings}
        columns={columns}
        getRowId={(s) => s.columnId}
        appearance="embedded"
        frameHeight="content"
        density="condensed"
        hidePagination
        pageSize={Math.max(ranking.standings.length, 1)}
        selection={false}
        actionsColumn="none"
        detail={{ enabled: false }}
        window={{ enabled: false }}
        toolbar={{
          title: "Standings",
          leading: <Trophy className="w-3.5 h-3.5 text-warning" aria-hidden />,
          search: false,
          actions: <TableSaveToMenu headers={data.headers} rows={data.rows} title={name} />,
        }}
      />
      {ranking.leaders.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {ranking.leaders.map((l) => (
            <span
              key={l.label}
              className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title={`${l.label}: ${l.leaders.join(", ")} (${l.value})`}
            >
              {l.label}:{" "}
              <span className="font-semibold text-success">{l.leaders.join(", ")}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTable({
  section,
  stats,
  name,
}: {
  section: MetricSection;
  stats: ColumnStats[];
  name: string;
}) {
  const { unit: costUnit } = useCostDisplay();
  const data = sectionDataGrid(section, stats, costUnit);
  const byId = new Map(stats.map((s) => [s.columnId, s] as const));
  const subjects: ComparisonSubject[] = stats.map((s) => ({
    id: s.columnId,
    label: s.agentName,
    title: `${s.agentName} · ${s.versionLabel}`,
    header: (
      <span className="inline-flex flex-col items-end">
        {s.agentId ? (
          <EntityRef
            token="agent"
            id={s.agentId}
            name={s.agentName}
            showIcon={false}
            openInNewTab
            className="max-w-[180px] justify-end"
            nameClassName="max-w-[180px]"
          />
        ) : (
          <span className="truncate max-w-[180px]">{s.agentName}</span>
        )}
        <span className="text-[10px] font-mono font-normal text-muted-foreground">{s.versionLabel}</span>
      </span>
    ),
  }));
  const rows: ComparisonRow[] = section.rows.map((row) => ({
    id: row.label,
    label: row.label,
    ...(row.emphasized ? { emphasized: true } : {}),
    ...(row.direction !== "none" ? { better: row.direction } : {}),
    cell: (subject) => {
      const s = byId.get(subject.id);
      const v = s ? row.pick(s) : null;
      return { text: row.format(v, costUnit), score: v };
    },
  }));
  return (
    <MatrxComparisonTable
      title={section.title}
      location={name}
      cornerLabel="Metric"
      subjects={subjects}
      rows={rows}
      align="right"
      aiContext={`The "${section.title}" metrics for each column of an Agent Battle, side by side.`}
      copyData={() => data}
      actions={<TableSaveToMenu headers={data.headers} rows={data.rows} title={name} />}
    />
  );
}
