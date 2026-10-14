"use client";

/**
 * "Ways to make an agent" — one row per agent-creating door: where a person goes, which builder
 * runs there right now (the door's platform knob), and what it made lately. Factory counts come
 * from the builds themselves, split into real people and our own test/admin accounts (a door set
 * to the old builder can still show factory builds when only our tests forced it). Old-builder
 * counts come from the runs the old path records: browser doors by their mandate key, server
 * doors by the door the server stamps on each run (recorded since FACTORY_DOOR_STAMP_SINCE).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { readOf } from "@ai-matrx/design-system";
import {
  DOORS,
  FACTORY_DOOR_STAMP_SINCE,
  GENERATOR_SHORTCUT_MANDATE,
  HOLDER_DRAFT_MANDATE,
  STRUCTURE_BUILDER_MANDATE,
  VIA_STUDIO_PLACES,
  factoryDoorCounts,
  loadDoorBuilders,
  loadOldBuilderRuns,
  loadTestUserIds,
  oldCountsForDoor,
  type Builder,
  type DoorFactoryCounts,
  type OldRunCounts,
  type RunCounts,
} from "../overview";
import type { FactoryBuildRow } from "../types";

interface DoorRow {
  id: string;
  place: string;
  href: string | null;
  builder: Builder | "mixed";
  factory: DoorFactoryCounts | null;
  old: { counts: RunCounts; recordedSince: string | null } | null;
  last: string | null;
}

const SINCE_LABEL = new Date(`${FACTORY_DOOR_STAMP_SINCE}T00:00:00`).toLocaleDateString(
  undefined,
  { month: "short", day: "numeric" },
);

/** An old-builder count; a window that starts before the door stamp says "since <date>". */
function OldCount({
  old,
  days,
}: {
  old: DoorRow["old"];
  days: 7 | 30;
}) {
  if (!old) {
    return <span className="type-secondary text-muted-foreground">—</span>;
  }
  const n = days === 7 ? old.counts.d7 : old.counts.d30;
  const partial =
    old.recordedSince !== null &&
    Date.now() - days * 86_400_000 < new Date(`${old.recordedSince}T00:00:00`).getTime();
  return (
    <span className="type-secondary tabular-nums">
      {n}
      {partial ? (
        <span className="text-muted-foreground"> since {SINCE_LABEL}</span>
      ) : null}
    </span>
  );
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
  const [oldRuns, setOldRuns] = useState<OldRunCounts | null>(null);
  const [testUserIds, setTestUserIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([
        loadDoorBuilders(),
        loadOldBuilderRuns([
          STRUCTURE_BUILDER_MANDATE,
          MANDATE_KEYS.agent_studio__chat_brief,
          HOLDER_DRAFT_MANDATE,
          GENERATOR_SHORTCUT_MANDATE,
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

  const buildUserKey = useMemo(
    () =>
      [...new Set(builds.map((b) => b.userId).filter((u): u is string => !!u))]
        .sort()
        .join(","),
    [builds],
  );
  useEffect(() => {
    if (!buildUserKey) return;
    let live = true;
    loadTestUserIds(buildUserKey.split(","))
      .then((ids) => {
        if (live) setTestUserIds(ids);
      })
      .catch((e) => {
        console.error("[agent-factory] could not tell test accounts apart", e);
      });
    return () => {
      live = false;
    };
  }, [buildUserKey]);

  const rows = useMemo((): DoorRow[] => {
    const factory = factoryDoorCounts(builds, testUserIds);
    const doorRows: DoorRow[] = DOORS.map((d) => {
      const f = buildsLoaded
        ? (factory[d.key] ?? {
            people: { d7: 0, d30: 0, last: null },
            test: { d7: 0, d30: 0, last: null },
          })
        : null;
      const o = oldCountsForDoor(d, oldRuns);
      const lasts = [f?.people.last, f?.test.last, o?.counts.last]
        .filter((x): x is string => Boolean(x))
        .sort();
      return {
        id: d.key,
        place: d.place,
        href: d.href,
        builder: builders?.[d.key] ?? "unknown",
        factory: f,
        old: o,
        last: lasts.length ? lasts[lasts.length - 1] : null,
      };
    });
    for (const v of VIA_STUDIO_PLACES) {
      doorRows.splice(
        1,
        0,
        {
          id: v.id,
          place: v.place,
          href: v.href,
          builder: "factory",
          factory: null,
          old: null,
          last: null,
        },
      );
    }
    const sb = oldRuns?.byMandate[STRUCTURE_BUILDER_MANDATE];
    doorRows.push({
      id: "__structure_builder",
      place: "Old builder runs, all places",
      href: null,
      builder: "mixed",
      factory: null,
      old: sb ? { counts: sb, recordedSince: null } : null,
      last: sb?.last ?? null,
    });
    return doorRows;
  }, [builds, buildsLoaded, builders, oldRuns, testUserIds]);

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
        accessorFn: (r) => r.factory?.people.d7 ?? -1,
        header: "People on factory 7d",
        width: 110,
        cell: (r) => <Count value={r.factory?.people.d7} />,
      },
      {
        id: "factory_30",
        accessorFn: (r) => r.factory?.people.d30 ?? -1,
        header: "People on factory 30d",
        width: 115,
        cell: (r) => <Count value={r.factory?.people.d30} />,
      },
      {
        id: "factory_test_30",
        accessorFn: (r) => r.factory?.test.d30 ?? -1,
        header: "Our test runs 30d",
        width: 110,
        cell: (r) => <Count value={r.factory?.test.d30} />,
      },
      {
        id: "old_7",
        accessorFn: (r) => r.old?.counts.d7 ?? -1,
        header: "Old builder 7d",
        width: 120,
        cell: (r) => <OldCount old={r.old} days={7} />,
      },
      {
        id: "old_30",
        accessorFn: (r) => r.old?.counts.d30 ?? -1,
        header: "Old builder 30d",
        width: 120,
        cell: (r) => <OldCount old={r.old} days={30} />,
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
          `${r.place}: ${BUILDER_LABEL[r.builder]}; people on factory ${r.factory?.people.d7 ?? "—"}/7d ${r.factory?.people.d30 ?? "—"}/30d; our test runs ${r.factory?.test.d30 ?? "—"}/30d; old builder ${r.old?.counts.d7 ?? "—"}/7d ${r.old?.counts.d30 ?? "—"}/30d`,
        rowAttributes: (r) => ({ id: r.id }),
      }}
    />
  );
}
