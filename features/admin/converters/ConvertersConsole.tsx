"use client";

/**
 * The converter catalog: every registered converter (source format → target), its version, real
 * samples and last-run figures. Read-only. Contract:
 * common-docs/systems/architecture/converters/FEATURE.md.
 */

import { useQuery } from "@tanstack/react-query";
import { Shuffle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ReadOutcome } from "@ai-matrx/design-system";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getConverterCatalog } from "./api";
import { DefinitionsPanel } from "./DefinitionsPanel";
import type { ConverterCatalog, ConverterEntry } from "./types";

function fileName(sample: string): string {
  const path = sample.split("#")[0] ?? sample;
  return path.slice(path.lastIndexOf("/") + 1);
}

const columns: MatrxColumnDef<ConverterEntry>[] = [
  {
    id: "source",
    header: "Source format",
    accessorKey: "source",
    filter: "select",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate font-mono text-xs">{r.source}</div>
        <div className="truncate text-xs text-muted-foreground">
          {r.source_label}
        </div>
      </div>
    ),
  },
  {
    id: "target",
    header: "Target",
    accessorKey: "target",
    filter: "select",
    cell: (r) => (
      <div className="min-w-0">
        <div className="truncate font-mono text-xs">{r.target}</div>
        {r.target_kind ? (
          <div className="truncate text-xs text-muted-foreground">
            kind {r.target_kind}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    id: "version",
    header: "Version",
    accessorFn: (r) => r.version,
    cell: (r) => (
      <span className="font-mono text-xs">
        v{r.version} · {r.code_sha}
      </span>
    ),
  },
  {
    id: "defined-in",
    header: "Defined in",
    accessorFn: (r) => r.defined_in,
    filter: "select",
    cell: (r) => <Badge variant="outline">{r.defined_in}</Badge>,
  },
  {
    id: "shape",
    header: "Output",
    accessorFn: (r) => (r.many ? "many" : "one"),
    filter: "select",
    cell: (r) => <Badge variant="outline">{r.many ? "many" : "one"}</Badge>,
  },
  {
    id: "samples",
    header: "Samples",
    accessorFn: (r) => r.samples.length,
    copyValue: (r) => r.samples.join("\n"),
    cell: (r) =>
      r.samples.length ? (
        <span className="text-xs" title={r.samples.join("\n")}>
          {formatCount(r.samples.length)} · {fileName(r.samples[0] ?? "")}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">via chain</span>
      ),
  },
  {
    id: "runs",
    header: "Runs",
    accessorFn: (r) => r.runs,
    cell: (r) => <span className="text-xs">{formatCount(r.runs)}</span>,
  },
  {
    id: "last-run",
    header: "Last run",
    sortValue: (r) => r.last_run?.at ?? "",
    filterValue: (r) => r.last_run?.mode ?? "never",
    cell: (r) =>
      r.last_run ? (
        <div className="text-xs">
          <span>{r.last_run.at ? formatRelativeTime(r.last_run.at) : "—"}</span>
          <span className="text-muted-foreground">
            {" "}
            · {r.last_run.mode} · {formatCount(r.last_run.items_out)} out
          </span>
          {r.last_run.stale ? (
            <Badge variant="outline" className="ml-1">
              code changed
            </Badge>
          ) : null}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">never</span>
      ),
  },
];

export function ConvertersConsole() {
  const query = useQuery<ConverterCatalog>({
    queryKey: ["admin", "converters"],
    queryFn: () => getConverterCatalog(),
  });
  const catalog = query.data ?? null;
  const loading = query.isPending;
  const error = query.error;
  const load = () => void query.refetch();

  const rows = catalog?.converters ?? [];
  const read: ReadOutcome = error
    ? {
        status: "error",
        error,
        onRetry: load,
        what: "converters",
        hasData: catalog !== null,
      }
    : {
        status: loading ? "loading" : "ready",
        what: "converters",
        hasData: catalog !== null,
      };

  return (
    <div className="flex h-[calc(100dvh-2.5rem)] min-h-0 flex-col gap-2 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h1 className="flex shrink-0 items-center gap-2 text-lg font-semibold">
          <Shuffle className="h-4 w-4" /> Converters
        </h1>
        {catalog ? (
          <span className="min-w-0 text-xs text-muted-foreground">
            {formatCount(rows.length)} converters ·{" "}
            {formatCount(catalog.formats)} source formats ·{" "}
            {catalog.targets.join(", ")}
          </span>
        ) : null}
      </div>
      <Tabs defaultValue="all" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="self-start">
          <TabsTrigger value="all">All converters</TabsTrigger>
          <TabsTrigger value="database">Database-defined</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="min-h-0 flex-1">
          <MatrxDataTable
            tableId="admin-converters"
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            isLoading={loading}
            stickyHeader
            density="condensed"
            pageSize={100}
            defaultSort={{ id: "target", direction: "asc" }}
            coverage={{
              noun: "converter",
              answeredBy: "client",
              loaded: rows.length,
              total: loading ? undefined : rows.length,
            }}
            toolbar={{ title: "Converters", search: true }}
            read={read}
            emptyState={{
              icon: <Shuffle className="h-5 w-5" />,
              title: "No converters registered",
              description: "None are registered yet.",
            }}
          />
        </TabsContent>
        <TabsContent value="database" className="min-h-0 flex-1">
          <DefinitionsPanel onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
