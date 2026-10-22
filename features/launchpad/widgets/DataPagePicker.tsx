"use client";

// features/launchpad/widgets/DataPagePicker.tsx — choose one of the person's data pages (or tables) for a widget.
// Reads the same corpus /data/pages lists (`createDataHomeCorpus`, kind "page"; every organization the
// person reaches) — no second list service. Their own pages first.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRecordsClient } from "@ai-matrx/records/react";
import { clientInOrganization } from "@ai-matrx/records/core";
import type { DashboardSummary } from "@ai-matrx/records";
import { isInterface, isPage } from "@ai-matrx/records-ui/helpers";
import { useObjectOrganization } from "@/features/unified-data/objectOrganization";
import { OptionCombobox, Select } from "@ai-matrx/design-system/controls";
import { useRecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";
import { createDataHomeCorpus } from "@/features/unified-data/home/dataHomeCorpus";
import type { DataHomeRow } from "@/features/unified-data/home/dataHomeRows";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
/** Pages only, the person's own first, then by name. */
export function dataPageChoices(rows: readonly DataHomeRow[]): { value: string; label: string; meta?: string }[] {
  return rows
    .filter((r) => r.kind === "page")
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name))
    .map((r) => ({ value: r.itemId, label: r.name || "Untitled page", ...(r.organizationName ? { meta: r.organizationName } : {}) }));
}

/** Tables only (no pick lists' plain tables twice: a kept list is a table too), the person's own first. */
export function dataTableChoices(rows: readonly DataHomeRow[]): { value: string; label: string; meta?: string }[] {
  return rows
    .filter((r) => r.kind === "table")
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name))
    .map((r) => ({ value: r.itemId, label: r.name || "Untitled table", ...(r.organizationName ? { meta: r.organizationName } : {}) }));
}

function useDataHomeRows() {
  const client = useRecordsClient();
  const dataSource = useRecordsDataSource();
  const [state, setState] = useState<{ rows: DataHomeRow[] | null; error: string | null }>({ rows: null, error: null });
  useEffect(() => {
    let live = true;
    createDataHomeCorpus(client, dataSource)
      .load()
      .then(
        (rows) => live && setState({ rows, error: null }),
        (e: unknown) => live && setState({ rows: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      live = false;
    };
  }, [client, dataSource]);
  return state;
}

export function DataTablePicker({ value, onChange }: { value: string; onChange: (tableId: string) => void }) {
  const state = useDataHomeRows();
  if (state.error) return <p className="text-xs text-destructive">{state.error}<ErrorAlchemyMenu error={state.error} /></p>;
  const choices = dataTableChoices(state.rows ?? []);
  if (state.rows && choices.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No tables yet ·{" "}
        <Link href="/make" className="underline">
          Make a table
        </Link>
      </p>
    );
  }
  const options = value && !choices.some((c) => c.value === value) ? [{ value, label: "Current table" }, ...choices] : choices;
  const byId = new Map(options.map((o) => [o.value, o]));
  // A person reaches hundreds of tables (1,391 for the test admin): searchable, never a scrolled menu.
  return (
    <OptionCombobox
      ariaLabel="Table"
      value={value}
      disabled={!state.rows}
      options={options.map((o) => o.value)}
      getLabel={(id) => byId.get(id)?.label ?? "Current table"}
      getHint={(id) => byId.get(id)?.meta}
      placeholder={state.rows ? "Choose a table" : "Loading tables"}
      searchPlaceholder="Search tables"
      onChange={onChange}
    />
  );
}

export function DataPagePicker({ value, onChange }: { value: string; onChange: (pageId: string) => void }) {
  const client = useRecordsClient();
  const dataSource = useRecordsDataSource();
  const [state, setState] = useState<{ rows: DataHomeRow[] | null; error: string | null }>({ rows: null, error: null });
  useEffect(() => {
    let live = true;
    createDataHomeCorpus(client, dataSource)
      .load()
      .then(
        (rows) => live && setState({ rows, error: null }),
        (e: unknown) => live && setState({ rows: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      live = false;
    };
  }, [client, dataSource]);
  if (state.error) return <p className="text-xs text-destructive">{state.error}<ErrorAlchemyMenu error={state.error} /></p>;
  const choices = dataPageChoices(state.rows ?? []);
  if (state.rows && choices.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No data pages yet ·{" "}
        <Link href="/make" className="underline">
          Make a page
        </Link>
      </p>
    );
  }
  const options = value && !choices.some((c) => c.value === value) ? [{ value, label: "Current page" }, ...choices] : choices;
  return (
    <Select
      aria-label="Page"
      value={value}
      disabled={!state.rows}
      options={state.rows ? options : [{ value, label: "Loading pages" }]}
      onValueChange={onChange}
    />
  );
}

/** A table's dashboards a dashboard widget can open: not its Pages or Interfaces (each opens on its own screen). */
export function tableDashboardChoices(rows: readonly Pick<DashboardSummary, "dashboard_id" | "name" | "presentation">[]): { value: string; label: string }[] {
  return rows
    .filter((d) => !isPage(d) && !isInterface(d))
    .map((d) => ({ value: d.dashboard_id, label: d.name || "Untitled dashboard" }));
}

/** The value meaning "whichever dashboard the table opens on" (its first). */
export const FIRST_DASHBOARD = "";

/**
 * Choose one of a table's dashboards (the table's own `dashboards` read, in the table's organization — the
 * same read its Dashboards screen makes). Empty = the table's first dashboard.
 */
export function TableDashboardPicker({ tableId, value, onChange }: { tableId: string; value: string; onChange: (dashboardId: string) => void }) {
  const client = useRecordsClient();
  const dataSource = useRecordsDataSource();
  const where = useObjectOrganization(dataSource, tableId || null);
  const organizationId = "organizationId" in where ? where.organizationId : null;
  const [state, setState] = useState<{ key: string; choices: { value: string; label: string }[] | null; error: string | null } | null>(null);
  const key = `${tableId}:${organizationId ?? ""}`;
  useEffect(() => {
    if (!tableId || !organizationId) return;
    let live = true;
    clientInOrganization(client, organizationId)
      .dashboards({ table_id: tableId })
      .then(
        (r) => live && setState(r.ok ? { key, choices: tableDashboardChoices(r.data), error: null } : { key, choices: [], error: r.error.message }),
        (e: unknown) => live && setState({ key, choices: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      live = false;
    };
  }, [client, tableId, organizationId, key]);
  if (!tableId) return <p className="text-xs text-muted-foreground">Choose a table first</p>;
  if (where.state === "not-given") return <p className="text-xs text-muted-foreground">This table has not been shared with you</p>;
  const failure = where.state === "unavailable" ? where.why : state?.key === key ? state.error : null;
  if (failure) return <p className="text-xs text-destructive">{failure}<ErrorAlchemyMenu error={failure} /></p>;
  const choices = state?.key === key ? state.choices : null;
  const options = [
    { value: FIRST_DASHBOARD, label: "First dashboard" },
    ...(value && choices && !choices.some((c) => c.value === value) ? [{ value, label: "Current dashboard" }] : []),
    ...(choices ?? []),
  ];
  return (
    <Select
      aria-label="Dashboard"
      value={value}
      disabled={!choices}
      options={choices ? options : [{ value, label: "Loading dashboards" }]}
      onValueChange={onChange}
    />
  );
}
