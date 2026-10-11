"use client";

// features/unified-data/connect-database/SyncFromLinkForm.tsx — LANE SYNC-AIRTABLE (2026-10-10).
//
// "Sync from a link": a Google Sheets link (shared "anyone with the link") or any https CSV link
// becomes a synced table in the organization new things are saved to, and opens. Two steps:
// paste → Columns (the server reads the link and infers each column's kind; the person changes a
// kind, skips a column or renames one) → Sync. The column step is kept on the table, so every
// refresh maps the same way (aidream /synced-tables/link/preview + /synced-tables/link).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Columns3, Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select, Switch } from "@ai-matrx/design-system/controls";
import { extractErrorMessage } from "@/utils/errors";

import { connectSyncedLink, previewSyncedLink, type ColumnKind, type ColumnPick } from "./service";

type Interval = "off" | "hourly" | "daily";
const INTERVALS: { value: Interval; label: string }[] = [
  { value: "off", label: "Manual" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
];
const KINDS: { value: ColumnKind; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Checkbox" },
  { value: "datetime", label: "Date" },
];

interface ColumnRow {
  source: string;
  detected: ColumnKind;
  type: ColumnKind;
  keep: boolean;
  name: string;
}

export function SyncFromLinkForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [interval, setInterval] = useState<Interval>("off");
  const [columns, setColumns] = useState<ColumnRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = Math.max(1, Number.parseInt(headerRow, 10) || 1);

  async function detect() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const found = await previewSyncedLink(organizationId, { url: url.trim(), headerRow: row });
      setColumns(found.columns.map((c) => ({ source: c.name, detected: c.type, type: c.type, keep: true, name: c.name })));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    if (!columns) return;
    setBusy(true);
    setError(null);
    const mapping: Record<string, ColumnPick> = {};
    for (const c of columns) {
      const pick: ColumnPick = {};
      if (!c.keep) pick.skip = true;
      if (c.type !== c.detected) pick.type = c.type;
      if (c.name.trim() && c.name.trim() !== c.source) pick.name = c.name.trim();
      if (Object.keys(pick).length) mapping[c.source] = pick;
    }
    try {
      const made = await connectSyncedLink(organizationId, {
        url: url.trim(),
        tableName: name.trim() || undefined,
        headerRow: row,
        autoRefresh: interval,
        mapping,
      });
      router.push(`/data/${made.table_id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  const setColumn = (i: number, patch: Partial<ColumnRow>) =>
    setColumns((held) => (held ? held.map((c, j) => (j === i ? { ...c, ...patch } : c)) : held));

  return (
    <form
      className="flex flex-col gap-2 border-t border-border pt-5"
      data-sync-from-link=""
      onSubmit={(e) => {
        e.preventDefault();
        void (columns ? sync() : detect());
      }}
    >
      <label htmlFor="sync-link-url" className="text-sm font-medium text-foreground">
        Google Sheet or CSV link
      </label>
      {/* ui-exception: a raw URL value, not prose */}
      <Input
        id="sync-link-url"
        type="url"
        spellCheck={false}
        placeholder="https://docs.google.com/spreadsheets/d/…"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setColumns(null);
        }}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* ui-exception: a table name value */}
        <Input aria-label="Table name" placeholder="Table name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        {/* ui-exception: a number value */}
        <Input
          aria-label="Header row"
          type="number"
          min={1}
          value={headerRow}
          onChange={(e) => {
            setHeaderRow(e.target.value);
            setColumns(null);
          }}
          disabled={busy}
          className="w-20"
        />
        <Select<Interval> aria-label="Auto-refresh" value={interval} options={INTERVALS} onValueChange={setInterval} />
        <Button
          icon={busy ? <Loader2 className="animate-spin" aria-hidden /> : columns ? <Link2 aria-hidden /> : <Columns3 aria-hidden />}
          variant="primary"
          type="submit"
          disabled={!url.trim() || busy || (columns !== null && !columns.some((c) => c.keep))}
          data-sync-from-link-submit={columns ? "sync" : "columns"}
        >
          <span className="ml-1.5">{columns ? "Sync" : "Columns"}</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Sheet shared &quot;Anyone with the link&quot;, or any CSV link</p>
      {columns ? (
        <div className="flex flex-col gap-1.5" data-sync-columns="">
          {columns.map((c, i) => (
            <div key={c.source} className="flex items-center gap-2" data-sync-column={c.source}>
              <Switch checked={c.keep} onCheckedChange={(keep) => setColumn(i, { keep })} aria-label={`Sync ${c.source}`} />
              {/* ui-exception: a column name value */}
              <Input aria-label={`Name for ${c.source}`} value={c.name} onChange={(e) => setColumn(i, { name: e.target.value })} disabled={!c.keep} />
              <Select<ColumnKind> aria-label={`Kind of ${c.source}`} value={c.type} options={KINDS} onValueChange={(type) => setColumn(i, { type })} />
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive-ink" data-sync-from-link-error="">
          {error}
        </p>
      ) : null}
    </form>
  );
}
