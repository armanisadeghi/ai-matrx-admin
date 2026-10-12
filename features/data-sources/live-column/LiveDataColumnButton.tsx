"use client";

/**
 * "From live data" — add a table column that fills itself from a data source, one metered fetch per
 * row (plug-in wave 2). The person picks the source, the column that holds each row's page address
 * and the record fields to keep; every kept field becomes a column. The dialog quotes the fill in
 * points BEFORE anything is fetched (a preview fetches nothing), then fills the first N rows.
 * Refusals (points, limits) come back in the server's words; the limits are visible settings.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Database } from "lucide-react";
import { useFields, useRecordsClient } from "@ai-matrx/records/react";
import { Button, Select } from "@ai-matrx/design-system/controls";
import { formatPoints } from "@ai-matrx/kit/format";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProInput } from "@/components/official/ProInput";
import { useBackendApi } from "@/hooks/useBackendApi";
import { runAiColumn } from "@/features/data-tables/records-ui-host/enrichPort";

import { limitSettingHref, useDataSources } from "../hooks";
import {
  KEEP_OPTIONS,
  addressColumns,
  columnLabelFor,
  columnTypeFor,
  companyLevelSources,
  declareSpec,
  fieldLabel,
  isNumericField,
  parseRun,
  totalPoints,
  type LiveKeep,
  type LiveQuote,
} from "./liveColumn";
import { useSelectedRowIds } from "./selectedRows";

interface Made {
  fieldId: string;
  label: string;
  outputField: string;
  quote: LiveQuote | null;
  says: string;
}

export function LiveDataColumnButton({ tableId, organizationId }: { tableId: string; organizationId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="quiet" icon={<Database className="h-4 w-4" />} onClick={() => setOpen(true)} data-live-column-open="">
        From live data
      </Button>
      {open && <LiveDataColumnDialog tableId={tableId} organizationId={organizationId} onClose={() => setOpen(false)} />}
    </>
  );
}

function LiveDataColumnDialog({ tableId, organizationId, onClose }: { tableId: string; organizationId: string | null; onClose: () => void }) {
  const client = useRecordsClient();
  const backend = useBackendApi();
  const catalog = useDataSources(organizationId);
  const fields = useFields(tableId);
  const sources = useMemo(
    () => (catalog.data?.sources ?? []).filter((s) => s.input.kind === "url" && (s.output_fields?.length ?? 0) > 0),
    [catalog.data],
  );
  const inputs = useMemo(() => addressColumns(fields.data ?? []), [fields.data]);

  const [sourceKey, setSourceKey] = useState("");
  const [inputField, setInputField] = useState("");
  const [kept, setKept] = useState<string[]>([]);
  const [rows, setRows] = useState("10");
  const [keeps, setKeeps] = useState<Record<string, LiveKeep>>({});
  const [perRow, setPerRow] = useState("10");
  const [rowsFrom, setRowsFrom] = useState<"first" | "selected">("selected");
  const selected = useSelectedRowIds(tableId);
  const [made, setMade] = useState<Made[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const source = sources.find((s) => s.key === sourceKey) ?? null;
  const isItems = source?.records_are === "items";
  const recordsPerRow = Math.max(1, Math.min(25, Number.parseInt(perRow, 10) || 1));
  const useSelected = selected.length > 0 && rowsFrom === "selected";
  const recordIds = useSelected ? [...selected] : undefined;
  const rowCount = useSelected ? selected.length : Math.max(1, Math.min(500, Number.parseInt(rows, 10) || 1));
  const keepOf = (f: string): LiveKeep => (isItems ? ((keeps[f] === "average" && !isNumericField(f) ? "first" : keeps[f]) ?? "first") : "first");
  const suggestions = isItems ? kept.flatMap((f) => companyLevelSources(f, sources).map((x) => ({ ...x, from: f }))).slice(0, 3) : [];
  const labelOfInput = (key: string) => inputs.find((f) => f.key === key)?.label ?? key;

  const create = async () => {
    if (!source || !inputField || kept.length === 0) return;
    setBusy(true);
    setMessage(null);
    const out: Made[] = [];
    for (const outputField of kept) {
      const keep = keepOf(outputField);
      const label = columnLabelFor(source.label, outputField, keep, recordsPerRow);
      const declared = await client.fieldDeclare({ table_id: tableId, spec: { label, plain: columnTypeFor(outputField, keep) } });
      if (!declared.ok) {
        setMessage(`Could not add "${label}": ${declared.error.message}`);
        break;
      }
      const set = await client.enrichDeclare({
        field_id: declared.data,
        spec: declareSpec(
          { sourceKey: source.key, inputField, outputField, ...(isItems ? { keep, recordsPerRow } : {}) },
          source.label,
          labelOfInput(inputField),
        ),
      });
      if (!set.ok) {
        setMessage(`"${label}" was added but could not be set up: ${set.error.message}`);
        break;
      }
      const quoted = await runAiColumn((e, b) => backend.post(e, b), { tableId, fieldId: declared.data, rows: rowCount, preview: true, recordIds });
      const run = quoted.ok ? parseRun(quoted.run) : null;
      out.push({ fieldId: declared.data, label, outputField, quote: run?.quote ?? null, says: quoted.ok ? (run?.says ?? "") : quoted.message });
    }
    setMade(out);
    setBusy(false);
  };

  const fill = async () => {
    if (!made) return;
    setBusy(true);
    const says: string[] = [];
    for (const m of made) {
      const result = await runAiColumn((e, b) => backend.post(e, b), { tableId, fieldId: m.fieldId, rows: rowCount, preview: false, recordIds });
      if (!result.ok) {
        says.push(`${m.label}: ${result.message}`);
        break;
      }
      const run = parseRun(result.run);
      says.push(`${m.label}: filled ${run.rowsWritten} of ${run.rowsSeen}. ${run.says}`.trim());
    }
    setMessage(says.join(" "));
    setBusy(false);
  };

  const total = made ? totalPoints(made.map((m) => m.quote)) : 0;
  const quote = made?.find((m) => m.quote)?.quote ?? null;
  const settings = quote ? limitSettingHref(organizationId, quote.recordsPerRowSetting) : null;
  const rowsSetting = quote ? limitSettingHref(organizationId, quote.maxRowsSetting) : null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent data-live-column-dialog="">
        <DialogHeader>
          <DialogTitle>From live data</DialogTitle>
        </DialogHeader>
        {!made ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Source</span>
              <Select
                aria-label="Source"
                value={sourceKey}
                options={[{ value: "", label: "Choose a source" }, ...sources.map((s) => ({ value: s.key, label: `${s.label} (${s.group})` }))]}
                onValueChange={(v) => {
                  setSourceKey(v);
                  setKept([]);
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">Page address comes from this column</span>
              <Select
                aria-label="Address column"
                value={inputField}
                options={[{ value: "", label: "Choose a column" }, ...inputs.map((f) => ({ value: f.key, label: f.label }))]}
                onValueChange={setInputField}
              />
            </label>
            {source && (
              <fieldset className="flex flex-col gap-1">
                <legend className="text-xs font-medium text-muted-foreground">Keep these fields (one column each)</legend>
                <div className="flex max-h-48 flex-col gap-1 overflow-auto">
                  {(source.output_fields ?? []).map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={kept.includes(f)}
                          onChange={(e) => setKept(e.target.checked ? [...kept, f] : kept.filter((k) => k !== f))}
                        />
                        {fieldLabel(f)}
                      </label>
                      {isItems && kept.includes(f) && (
                        <Select
                          aria-label={`Keep for ${fieldLabel(f)}`}
                          value={keepOf(f)}
                          options={KEEP_OPTIONS.filter((k) => k.value !== "average" || isNumericField(f)).map((k) => ({ value: k.value, label: k.label }))}
                          onValueChange={(v) => setKeeps({ ...keeps, [f]: v as LiveKeep })}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1" data-live-column-company-level="">
                    <span className="text-xs text-muted-foreground">Company's own figure:</span>
                    {suggestions.map((x) => (
                      <Button
                        key={`${x.source.key}:${x.field}`}
                        variant="quiet"
                        onClick={() => {
                          setSourceKey(x.source.key);
                          setKept([x.field]);
                        }}
                      >
                        {x.source.label} ({fieldLabel(x.field)})
                      </Button>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
            {isItems && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Records per row</span>
                <ProInput value={perRow} onChange={(e) => setPerRow(e.target.value)} inputMode="numeric" data-live-column-per-row="" />
              </label>
            )}
            {selected.length > 0 && (
              <fieldset className="flex flex-col gap-1" data-live-column-rows-from="">
                <legend className="text-xs font-medium text-muted-foreground">Fill</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="rows-from" checked={rowsFrom === "selected"} onChange={() => setRowsFrom("selected")} />
                  Selected rows ({selected.length})
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="rows-from" checked={rowsFrom === "first"} onChange={() => setRowsFrom("first")} />
                  First rows not yet filled
                </label>
              </fieldset>
            )}
            {!useSelected && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Rows to fill</span>
                <ProInput value={rows} onChange={(e) => setRows(e.target.value)} inputMode="numeric" />
              </label>
            )}
            <Button variant="primary" disabled={busy || !source || !inputField || kept.length === 0} onClick={() => void create()} data-live-column-add="">
              {kept.length > 1 ? `Add ${kept.length} columns` : "Add column"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-live-column-fill="">
            <ul className="text-sm">
              {made.map((m) => (
                <li key={m.fieldId}>
                  {m.label}
                  {m.quote ? ` - ${formatPoints(m.quote.pointsTotal)}` : ""}
                </li>
              ))}
            </ul>
            {quote && (
              <p className="text-sm" data-live-column-quote="">
                {quote.rows} {quote.rows === 1 ? "row" : "rows"} x {quote.recordsPerRow} {quote.recordsPerRow === 1 ? "record" : "records"} per row:{" "}
                <strong>{formatPoints(total)}</strong> in all.{" "}
                {settings && <Link className="underline" href={settings}>Records per row (max)</Link>}
                {" · "}
                {rowsSetting && <Link className="underline" href={rowsSetting}>Rows per fill (max {quote.maxRowsPerRun})</Link>}
              </p>
            )}
            {quote && quote.rowsKept > 0 && (
              <p className="text-sm" data-live-column-kept="">
                {quote.rowsKept} {quote.rowsKept === 1 ? "row holds" : "rows hold"} records already paid for: filling them costs nothing.
              </p>
            )}
            {!quote && made[0]?.says && <p className="text-sm">{made[0].says}</p>}
            <Button variant="primary" disabled={busy || made.length === 0} onClick={() => void fill()} data-live-column-run="">
              {quote && quote.rowsKept > 0 && total === 0
                ? "Retry without paying again"
                : `Fill ${quote?.rows ?? rowCount} ${(quote?.rows ?? rowCount) === 1 ? "row" : "rows"}`}
            </Button>
          </div>
        )}
        {message && (
          <p className="text-sm" data-live-column-message="">
            {message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
