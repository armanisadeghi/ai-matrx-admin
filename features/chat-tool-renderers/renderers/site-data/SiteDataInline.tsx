"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Database, ExternalLink, Save } from "lucide-react";
import type { ToolRendererProps } from "@ai-matrx/chat/tool-call-visualization/types";
import { EntityCard, type EntityAction } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared-entity/EntityCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { formatCount } from "@ai-matrx/kit/format";
import { displayLabel } from "@ai-matrx/kit/text-case";

import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { RefusalView } from "@/features/data-sources/RefusalView";
import { useDataSources, useFetchEstimate } from "@/features/data-sources/hooks";
import { clearRun, startRun, useRun } from "@/features/data-sources/runs";
import { fetchData } from "@/features/data-sources/server";
import { fetchInputFromToolSpec } from "@/features/data-sources/toolSpec";

import { parseSiteData } from "./parseSiteData";

const PREVIEW_ROWS = 5;

function cell(v: unknown): string {
  const t = typeof v === "boolean" ? (v ? "Yes" : "No") : v == null ? "" : String(v);
  return t.length > 90 ? `${t.slice(0, 88)}…` : t;
}

/**
 * The agent's `site_data` result: how many records came back with a compact preview, and the way
 * to keep them — "Open table" when the call already saved them, else "Save as table", which runs
 * the same fetch the Get data panel runs (its points quoted first). The data vendor is never named.
 */
export function SiteDataInline({ entry, expanded, onToggleExpanded }: ToolRendererProps) {
  const data = useMemo(() => parseSiteData(entry), [entry]);
  const { organizationId } = useOrganizationRequired();
  const catalog = useDataSources(organizationId ?? null);
  const estimate = useFetchEstimate();
  const [confirming, setConfirming] = useState(false);
  const runKey = `site-data:${entry.callId}`;
  const run = useRun(runKey);

  if (!data) return null;

  const source = catalog.data?.sources.find((s) => s.key === data.siteKey) ?? null;
  const input = source ? fetchInputFromToolSpec(source, data.spec) : null;
  const count = Math.max(1, data.spec.maxRecords ?? data.recordCount);
  const saved = run.status === "done" ? run.result : null;
  const tableId = data.tableId ?? saved?.table_id ?? null;
  const tableName = data.tableName ?? saved?.table_name ?? null;
  const title = data.label ?? "Live data";
  const shown = data.records.slice(0, PREVIEW_ROWS);
  const quote = estimate(source, count);

  const actions: EntityAction[] = tableId ? [{ label: "Open table", icon: ExternalLink, href: `/data/${tableId}` }] : [];

  const save = () => {
    if (!source || !input || !organizationId) return;
    setConfirming(false);
    startRun(runKey, (onProgress) =>
        // org-filter: server-call the data fetch executes in the selected organization
        fetchData({ sourceKey: source.key, input, maxRecords: count, tableName: tableName ?? title }, { organizationId, onProgress }),
    );
  };

  return (
    <EntityCard
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
      icon={Database}
      accent="cyan"
      title={title}
      subtitle={`${formatCount(data.recordCount)} ${data.recordCount === 1 ? "record" : "records"} · Live data`}
      actions={actions}
    >
      <div className="space-y-2 px-3 py-2.5" data-site-data-card="">
        {shown.length > 0 && data.columns.length > 0 && (
          <Table size="sm">
            <TableHeader>
              <TableRow>
                {data.columns.map((c) => (
                  <TableHead key={c}>{displayLabel(undefined, c)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r, i) => (
                <TableRow key={i}>
                  {data.columns.map((c) => (
                    <TableCell key={c} className="max-w-56 truncate">
                      {cell(r[c])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {data.recordCount > shown.length && (
          <div className="text-[11px] text-muted-foreground">
            Showing {shown.length} of {formatCount(data.recordCount)}
          </div>
        )}
        {run.status === "failed" ? (
          <RefusalView refusal={run.refusal} organizationId={organizationId ?? null} onBack={() => clearRun(runKey)} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {tableId ? (
              <Button variant="primary" icon={<ExternalLink className="h-4 w-4" />} asChild>
                <Link href={`/data/${tableId}`} target="_blank" data-site-data-open="">
                  Open table
                </Link>
              </Button>
            ) : run.status === "running" ? (
              <span className="text-xs text-muted-foreground" data-site-data-saving="">
                {run.progress?.label ?? "Saving as a table"}
              </span>
            ) : confirming ? (
              <>
                <span className="text-xs text-muted-foreground">
                  Fetches {formatCount(count)} again{quote ? ` · ${quote}` : ""}
                </span>
                <Button variant="primary" onClick={save} data-site-data-confirm="">
                  Save as table
                </Button>
                <Button variant="quiet" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                icon={<Save className="h-4 w-4" />}
                meta={quote ?? undefined}
                disabled={!source || !input || !organizationId}
                onClick={() => setConfirming(true)}
                data-site-data-save=""
              >
                Save as table
              </Button>
            )}
          </div>
        )}
      </div>
    </EntityCard>
  );
}
