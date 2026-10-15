// features/admin/applications/attestation/components/AttestationTable.tsx
//
// One row per config key of one application build: the status light SQL decided,
// why, how a change reaches installs, and the honesty columns (reads, installs,
// share read live from the database, invalid reads, read-but-not-applied).
// Every key opens its editor: a knob → Limits & Knobs; an app-config key → the
// application's Configuration editor.
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { KeyRound } from "lucide-react";
import { Badge, type BadgeTone } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { knobHref } from "@/features/admin/limits/knobHref";
import {
  APPLICATIONS_ADMIN_LOCATION,
  applicationConfigHref,
} from "@/features/admin/applications/constants";
import {
  asStatus,
  type AttestationStatus,
  type AttestationStatusRow,
} from "@/features/admin/applications/attestation/types";

const STATUS_TONE: Record<AttestationStatus, BadgeTone> = {
  green: "success",
  amber: "warning",
  red: "destructive",
  info: "neutral",
};

const STATUS_LABEL: Record<AttestationStatus, string> = {
  green: "In use",
  amber: "Check",
  red: "Wrong",
  info: "Shared",
};

const PROPAGATION_LABEL: Record<string, string> = {
  instant: "Live",
  next_load: "Restart",
  next_release: "Next release",
};

export function attestationRowId(row: AttestationStatusRow): string {
  return `${row.kind}:${row.feature ?? ""}:${row.key}`;
}

export function attestationKeyLabel(row: AttestationStatusRow): string {
  return row.feature ? `${row.feature}/${row.key}` : row.key;
}

export function attestationEditorHref(app: string, row: AttestationStatusRow): string {
  return row.kind === "knob" && row.feature
    ? knobHref(`${row.feature}.${row.key}`)
    : applicationConfigHref(app);
}

export function StatusLightBadge({ status }: { status: string | null }) {
  const s = asStatus(status);
  return <Badge tone={STATUS_TONE[s]}>{STATUS_LABEL[s]}</Badge>;
}

function count(value: number | null) {
  return value ? (
    <span className="font-mono text-xs">{value.toLocaleString()}</span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  );
}

interface AttestationTableProps {
  app: string;
  rows: AttestationStatusRow[];
  tableId: string;
  isFetching?: boolean;
  readError?: unknown;
  onRetry?: () => void;
}

export function AttestationTable({
  app,
  rows,
  tableId,
  isFetching,
  readError,
  onRetry,
}: AttestationTableProps) {
  const columns = useMemo((): MatrxColumnDef<AttestationStatusRow>[] => [
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => asStatus(row.status),
      filter: "select",
      cell: (row) => <StatusLightBadge status={row.status} />,
      width: 90,
    },
    {
      id: "key",
      header: "Key",
      accessorFn: (row) => attestationKeyLabel(row),
      cell: (row) => (
        <Link
          href={attestationEditorHref(app, row)}
          className="font-mono text-xs underline-offset-4 hover:underline"
        >
          {attestationKeyLabel(row)}
        </Link>
      ),
      width: 320,
    },
    {
      id: "kind",
      header: "Kind",
      accessorFn: (row) => (row.kind === "knob" ? "Knob" : "App config"),
      filter: "select",
      cell: (row) => (
        <span className="text-xs">{row.kind === "knob" ? "Knob" : "App config"}</span>
      ),
      width: 100,
    },
    {
      id: "reason",
      header: "Why",
      accessorKey: "reason",
      cell: (row) => <span className="text-xs">{row.reason}</span>,
      width: 260,
    },
    {
      id: "propagation",
      header: "Applies",
      accessorFn: (row) => PROPAGATION_LABEL[row.propagation ?? ""] ?? "Unknown",
      filter: "select",
      cell: (row) => (
        <span className="text-xs" title={row.propagation ?? "not stored"}>
          {PROPAGATION_LABEL[row.propagation ?? ""] ?? "—"}
        </span>
      ),
      width: 100,
    },
    {
      id: "reads",
      header: "Reads",
      accessorKey: "reads",
      align: "right",
      cell: (row) => count(row.reads),
      width: 80,
    },
    {
      id: "installs",
      header: "Installs",
      accessorKey: "installs",
      align: "right",
      cell: (row) => count(row.installs),
      width: 80,
    },
    {
      id: "db_share",
      header: "From database",
      accessorFn: (row) => row.db_share ?? -1,
      align: "right",
      cell: (row) =>
        row.db_share === null ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <span
            className="font-mono text-xs"
            title={`${row.fallback_reads ?? 0} read(s) from cache, snapshot or dev override`}
          >
            {Math.round(Number(row.db_share) * 100)}%
          </span>
        ),
      width: 110,
    },
    {
      id: "invalid_reads",
      header: "Invalid",
      accessorKey: "invalid_reads",
      align: "right",
      cell: (row) => count(row.invalid_reads),
      width: 80,
    },
    {
      id: "applied_mismatch",
      header: "Not applied",
      accessorKey: "applied_mismatch",
      align: "right",
      cell: (row) => count(row.applied_mismatch),
      width: 100,
    },
    {
      id: "last_read_at",
      header: "Last read",
      accessorFn: (row) => row.last_read_at ?? "",
      cell: (row) =>
        row.last_read_at ? (
          <span
            className="whitespace-nowrap text-xs"
            title={format(new Date(row.last_read_at), "yyyy-MM-dd HH:mm:ss")}
          >
            {formatDistanceToNow(new Date(row.last_read_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">never</span>
        ),
      width: 130,
    },
  ], [app]);

  return (
    <MatrxDataTable
      urlState={{ id: tableId }}
      data={rows}
      columns={columns}
      getRowId={attestationRowId}
      isFetching={isFetching}
      pageSize={100}
      read={{
        status: readError ? "error" : "ready",
        error: readError,
        onRetry,
        what: "config keys",
      }}
      emptyState={{
        icon: <KeyRound className="h-5 w-5" />,
        title: "No config keys",
        description: "This application stores and declares no config keys.",
      }}
      toolbar={{ search: true, searchPlaceholder: "Search keys…" }}
      detail={{
        title: (row) => attestationKeyLabel(row),
        description: (row) => row.reason ?? "",
      }}
      copy={{
        label: "Config key",
        listLabel: "Config keys (this view)",
        location: `${APPLICATIONS_ADMIN_LOCATION}/attestation`,
        rowKind: "config_attestation_key",
        listKind: "config_attestation_keys",
        rowDescription: "One stored or declared config key and whether installs read it.",
        listDescription: "Filtered config keys with their attestation status.",
        humanRow: (row) =>
          [
            `${attestationKeyLabel(row)} (${row.kind}) — ${row.status}: ${row.reason}`,
            `stored=${row.stored} declared=${row.declared} observed=${row.observed} applies=${row.propagation ?? "?"}`,
            `reads=${row.reads} installs=${row.installs} db_share=${row.db_share ?? "-"} invalid=${row.invalid_reads} not_applied=${row.applied_mismatch}`,
          ].join("\n"),
        rowAttributes: (row) => ({
          app,
          kind: row.kind,
          feature: row.feature,
          key: row.key,
          status: row.status,
        }),
        listAttributes: (visible, all) => ({
          app,
          visible: visible.length,
          total: all.length,
        }),
      }}
    />
  );
}
