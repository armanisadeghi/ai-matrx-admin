"use client";

/**
 * "Ways to make an agent" — one row per agent-creating door: where a person goes, which builder
 * runs there right now (the door's platform knob), and what it made lately. Factory counts come
 * from the builds themselves; old-builder counts from the mandate runs the old path records
 * (only "from chat" is attributable to one door; the structure builder row covers the rest).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import {
  DOORS,
  STRUCTURE_BUILDER_MANDATE,
  factoryDoorCounts,
  loadDoorBuilders,
  loadMandateRunCounts,
  type Builder,
  type RunCounts,
} from "../overview";
import type { FactoryBuildRow } from "../types";

interface DoorRow {
  id: string;
  place: string;
  href: string | null;
  builder: Builder | "mixed";
  factory: RunCounts | null;
  old: RunCounts | "not_recorded";
  last: string | null;
}

const BUILDER_LABEL: Record<DoorRow["builder"], string> = {
  factory: "Agent Factory",
  old: "Old builder",
  unknown: "Unknown",
  mixed: "—",
};

function Count({ value }: { value: number | null | undefined }) {
  return (
    <span className="type-secondary tabular-nums">
      {value == null ? "—" : value}
    </span>
  );
}

export function FactoryDoorsTable({
  builds,
  buildsLoaded,
}: {
  builds: FactoryBuildRow[];
  buildsLoaded: boolean;
}) {
  const [builders, setBuilders] = useState<Record<string, Builder> | null>(
    null,
  );
  const [oldRuns, setOldRuns] = useState<Record<string, RunCounts> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([
        loadDoorBuilders(),
        loadMandateRunCounts([
          STRUCTURE_BUILDER_MANDATE,
          "agent_studio.chat_brief",
        ]),
      ]);
      setBuilders(b);
      setOldRuns(r);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not load the ways to make an agent",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo((): DoorRow[] => {
    const factory = factoryDoorCounts(builds);
    const doorRows: DoorRow[] = DOORS.map((d) => {
      const f = buildsLoaded
        ? (factory[d.key] ?? { d7: 0, d30: 0, last: null })
        : null;
      const o = d.oldBuilderMandate
        ? (oldRuns?.[d.oldBuilderMandate] ?? null)
        : null;
      const lasts = [f?.last, o?.last]
        .filter((x): x is string => Boolean(x))
        .sort();
      return {
        id: d.key,
        place: d.place,
        href: d.href,
        builder: builders?.[d.key] ?? "unknown",
        factory: f,
        old: d.oldBuilderMandate ? (o ?? "not_recorded") : "not_recorded",
        last: lasts.length ? lasts[lasts.length - 1] : null,
      };
    });
    const sb = oldRuns?.[STRUCTURE_BUILDER_MANDATE];
    doorRows.push({
      id: "__structure_builder",
      place: "Old builder runs, all places",
      href: null,
      builder: "mixed",
      factory: null,
      old: sb ?? "not_recorded",
      last: sb?.last ?? null,
    });
    return doorRows;
  }, [builds, buildsLoaded, builders, oldRuns]);

  const columns = useMemo(
    (): MatrxColumnDef<DoorRow>[] => [
      {
        id: "place",
        accessorKey: "place",
        header: "Place",
        width: 260,
        cell: (r) =>
          r.href ? (
            <Link
              href={r.href}
              className="truncate type-secondary font-medium underline-offset-2 hover:underline"
            >
              {r.place}
            </Link>
          ) : (
            <span className="truncate type-secondary font-medium">
              {r.place}
            </span>
          ),
      },
      {
        id: "builder",
        accessorFn: (r) => BUILDER_LABEL[r.builder],
        header: "Runs on",
        filter: "select",
        width: 130,
        cell: (r) => (
          <span
            className={
              r.builder === "factory"
                ? "type-secondary font-semibold"
                : "type-secondary text-muted-foreground"
            }
          >
            {BUILDER_LABEL[r.builder]}
          </span>
        ),
      },
      {
        id: "factory_7",
        accessorFn: (r) => r.factory?.d7 ?? -1,
        header: "Factory 7d",
        width: 85,
        cell: (r) => <Count value={r.factory?.d7} />,
      },
      {
        id: "factory_30",
        accessorFn: (r) => r.factory?.d30 ?? -1,
        header: "Factory 30d",
        width: 90,
        cell: (r) => <Count value={r.factory?.d30} />,
      },
      {
        id: "old_7",
        accessorFn: (r) => (r.old === "not_recorded" ? -1 : r.old.d7),
        header: "Old 7d",
        width: 75,
        cell: (r) =>
          r.old === "not_recorded" ? (
            <span className="type-secondary text-muted-foreground">
              Not recorded
            </span>
          ) : (
            <Count value={r.old.d7} />
          ),
      },
      {
        id: "old_30",
        accessorFn: (r) => (r.old === "not_recorded" ? -1 : r.old.d30),
        header: "Old 30d",
        width: 75,
        cell: (r) =>
          r.old === "not_recorded" ? (
            <span className="type-secondary text-muted-foreground">
              Not recorded
            </span>
          ) : (
            <Count value={r.old.d30} />
          ),
      },
      {
        id: "last",
        accessorFn: (r) => r.last ?? "",
        header: "Last use",
        width: 130,
        cell: (r) =>
          r.last ? (
            <span
              className="whitespace-nowrap type-secondary text-muted-foreground"
              title={new Date(r.last).toLocaleString()}
            >
              {formatDistanceToNow(new Date(r.last), { addSuffix: true })}
            </span>
          ) : (
            <span className="type-secondary text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <MatrxDataTable
      urlState={{ id: "agent-factory-doors" }}
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      isLoading={loading}
      pageSize={20}
      read={readOf(
        { loading, error },
        { what: "ways to make an agent", onRetry: () => void load() },
      )}
      emptyState={{ title: "No ways listed", description: "" }}
      toolbar={{ title: "Ways to make an agent", refresh: { onRefresh: load } }}
      copy={{
        label: "Way to make an agent",
        listLabel: "Ways to make an agent",
        location: "/administration/agents/factory",
        rowKind: "agent-factory-door",
        listKind: "agent-factory-doors",
        listDescription:
          "One row per agent-creating door, with the builder it runs on now.",
        humanRow: (r) =>
          `${r.place}: ${BUILDER_LABEL[r.builder]}; factory ${r.factory?.d7 ?? "—"}/7d ${r.factory?.d30 ?? "—"}/30d`,
        rowAttributes: (r) => ({ id: r.id }),
      }}
    />
  );
}
