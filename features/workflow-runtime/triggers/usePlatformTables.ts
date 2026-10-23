"use client";

/**
 * The platform-table catalog (`GET /workflow/platform-tables`) — the same
 * list the studio's data-step pickers offer. Read-only; a failed read is a
 * stated `error` and the pane falls back to typing the table by hand.
 */

import { useEffect, useState } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { callApi, type ApiCallConfig } from "@/lib/api/call-api";

export interface PlatformTable {
  /** schema.table */
  table: string;
  label: string;
  columns: string[];
}

export interface PlatformTablesState {
  tables: PlatformTable[];
  loading: boolean;
  error: string | null;
}

function parseTables(raw: unknown): PlatformTable[] {
  if (!Array.isArray(raw)) return [];
  const out: PlatformTable[] = [];
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.table !== "string" || !r.table) continue;
    out.push({
      table: r.table,
      label: typeof r.label === "string" && r.label ? r.label : r.table,
      columns: Array.isArray(r.columns)
        ? r.columns.filter((c): c is string => typeof c === "string")
        : [],
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}

export function usePlatformTables(): PlatformTablesState {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<PlatformTablesState>({
    tables: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const config: ApiCallConfig<"/workflow/platform-tables", "GET"> = {
      path: "/workflow/platform-tables",
      method: "GET",
    };
    void dispatch(callApi(config)).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setState({
          tables: [],
          loading: false,
          error: "We couldn't load the table list. Type the table instead.",
        });
        return;
      }
      setState({ tables: parseTables(result.data), loading: false, error: null });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  return state;
}
