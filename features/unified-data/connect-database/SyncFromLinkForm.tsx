"use client";

// features/unified-data/connect-database/SyncFromLinkForm.tsx — LANE SYNC-AIRTABLE (2026-10-10).
//
// "Sync from a link": a Google Sheets link (shared "anyone with the link") or any https CSV link
// becomes a synced table in the organization new things are saved to, and opens. Header row, name
// and auto-refresh (Manual / Hourly / Daily) are the knobs; the server reads the sheet's CSV export
// and lands it through custom.table_sync (aidream /synced-tables/link).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Select } from "@ai-matrx/design-system/controls";
import { extractErrorMessage } from "@/utils/errors";

import { connectSyncedLink } from "./service";

type Interval = "off" | "hourly" | "daily";
const INTERVALS: { value: Interval; label: string }[] = [
  { value: "off", label: "Manual" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
];

export function SyncFromLinkForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [headerRow, setHeaderRow] = useState("1");
  const [interval, setInterval] = useState<Interval>("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const made = await connectSyncedLink(organizationId, {
        url: url.trim(),
        tableName: name.trim() || undefined,
        headerRow: Math.max(1, Number.parseInt(headerRow, 10) || 1),
        autoRefresh: interval,
      });
      router.push(`/data/${made.table_id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-2 border-t border-border pt-5"
      data-sync-from-link=""
      onSubmit={(e) => {
        e.preventDefault();
        void sync();
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
        onChange={(e) => setUrl(e.target.value)}
        disabled={busy}
      />
      <div className="flex flex-wrap items-center gap-2">
        {/* ui-exception: a table name value */}
        <Input aria-label="Table name" placeholder="Table name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        {/* ui-exception: a number value */}
        <Input aria-label="Header row" type="number" min={1} value={headerRow} onChange={(e) => setHeaderRow(e.target.value)} disabled={busy} className="w-20" />
        <Select<Interval> aria-label="Auto-refresh" value={interval} options={INTERVALS} onValueChange={setInterval} />
        <Button
          icon={busy ? <Loader2 className="animate-spin" aria-hidden /> : <Link2 aria-hidden />}
          variant="primary"
          type="submit"
          disabled={!url.trim() || busy}
          data-sync-from-link-submit=""
        >
          <span className="ml-1.5">Sync</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Sheet shared &quot;Anyone with the link&quot;, or any CSV link</p>
      {error ? (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive-ink" data-sync-from-link-error="">
          {error}
        </p>
      ) : null}
    </form>
  );
}
