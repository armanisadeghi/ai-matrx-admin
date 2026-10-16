"use client";

/**
 * The Sheets menu's own panels: Spreadsheet settings, Timeline, Filter views, Named functions, Data
 * extraction, Data connectors, Create a new form and Manage macros. One component, one dialog at a time;
 * the editor owns the saved state and hands each panel the live Univer facade.
 */

import { useMemo, useState } from "react";
import { Button, Field, Select, SettingRow, Switch } from "@ai-matrx/design-system/controls";
import { FormBuilder } from "@ai-matrx/records-ui";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import type { SheetPanel } from "@/features/workbooks/chrome/sheet-commands";
import { hasHeaderRow } from "@/features/workbooks/chrome/sheet-extras";
import { csvLinkMessage, readCsvLink, writeRowsGrowing, type GrowableSheet } from "@/features/workbooks/chrome/sheet-csv-link";
import {
  EXTRACTORS,
  RECALCULATION_OPTIONS,
  SETTINGS_LOCALES,
  SETTINGS_TIME_ZONES,
  applyFilterView,
  buildTimeline,
  captureFilterView,
  extractFields,
  formatDay,
  lambdaFormula,
  namedFunctionNameProblem,
  namedFunctionsFrom,
  type ExtractorId,
  type FilterLike,
  type FilterView,
  type Recalculation,
  type SheetConnector,
  type SheetMacro,
  type SheetSettings,
} from "@/features/workbooks/chrome/sheet-row-extras";

interface PanelRange {
  getRange(): { startRow: number; endRow: number; startColumn: number; endColumn: number };
  getValues(): unknown[][];
  getDisplayValues(): string[][];
  setValues(values: unknown[][]): unknown;
  activate?(): unknown;
}
interface PanelSheet extends GrowableSheet {
  getSheetId(): string;
  getFilter(): FilterLike | null;
  getSheetName(): string;
  getLastRow(): number;
  getLastColumn(): number;
  getRange(row: number, col: number, rows: number, cols: number): PanelRange & { createFilter(): FilterLike | null };
  getSelection(): { getActiveRange(): PanelRange | null } | null;
}
export interface PanelApi {
  getActiveWorkbook(): {
    getActiveSheet(): PanelSheet | null;
    getDefinedNames(): { getName(): string; getFormulaOrRefString(): string }[];
    insertDefinedName(name: string, formula: string): unknown;
    deleteDefinedName(name: string): unknown;
  } | null;
}

export interface SheetToolPanelsProps {
  panel: SheetPanel | null;
  onClose: () => void;
  api: PanelApi | null;
  editable: boolean;
  workbookId: string;
  settings: SheetSettings;
  onSaveSettings: (s: SheetSettings) => void;
  macros: SheetMacro[];
  onReplayMacro: (id: string) => void;
  onDeleteMacro: (id: string) => void;
  filterViews: FilterView[];
  onFilterViews: (views: FilterView[]) => void;
  connectors: SheetConnector[];
  onConnectors: (list: SheetConnector[]) => void;
  /** The table the active sheet is linked to, and the door that makes one. */
  linkedTableId: string | null;
  makeTable: (() => void) | null;
}

const TITLES: Record<SheetPanel, string> = {
  settings: "Spreadsheet settings",
  timeline: "Timeline",
  "filter-views": "Filter views",
  "named-functions": "Named functions",
  "data-extraction": "Data extraction",
  "data-connectors": "Data connectors",
  "create-form": "Create a new form",
  macros: "Macros",
};

const sheetOf = (api: PanelApi | null) => api?.getActiveWorkbook()?.getActiveSheet() ?? null;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

/** The selection, or the whole used area when one cell (or nothing) is selected. */
function sourceRange(api: PanelApi | null): PanelRange | null {
  const sheet = sheetOf(api);
  if (!sheet) return null;
  const sel = sheet.getSelection()?.getActiveRange() ?? null;
  const r = sel?.getRange();
  if (sel && r && (r.endRow > r.startRow || r.endColumn > r.startColumn)) return sel;
  const rows = sheet.getLastRow() + 1;
  const cols = sheet.getLastColumn() + 1;
  return rows > 0 && cols > 0 ? sheet.getRange(0, 0, rows, cols) : null;
}

export function SheetToolPanels(props: SheetToolPanelsProps) {
  const { panel, onClose } = props;
  return (
    <Dialog open={panel !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={panel === "create-form" ? "sm:max-w-3xl" : "sm:max-w-lg"} data-sheet-panel={panel ?? ""}>
        <DialogHeader>
          <DialogTitle>{panel ? TITLES[panel] : ""}</DialogTitle>
        </DialogHeader>
        {panel === "settings" && <SettingsPanel {...props} />}
        {panel === "timeline" && <TimelinePanel {...props} />}
        {panel === "filter-views" && <FilterViewsPanel {...props} />}
        {panel === "named-functions" && <NamedFunctionsPanel {...props} />}
        {panel === "data-extraction" && <ExtractionPanel {...props} />}
        {panel === "data-connectors" && <ConnectorsPanel {...props} />}
        {panel === "create-form" && <FormPanel {...props} />}
        {panel === "macros" && <MacrosPanel {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

// ─── Spreadsheet settings ───

function SettingsPanel({ settings, onSaveSettings, onClose, editable }: SheetToolPanelsProps) {
  const [v, setV] = useState(settings);
  const zones = SETTINGS_TIME_ZONES.includes(v.timeZone) ? SETTINGS_TIME_ZONES : [v.timeZone, ...SETTINGS_TIME_ZONES];
  return (
    <div className="grid gap-4" data-sheet-settings="">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Locale
        <Select aria-label="Locale" value={v.locale} onValueChange={(locale) => setV({ ...v, locale })} options={SETTINGS_LOCALES} disabled={!editable} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Time zone
        <Select aria-label="Time zone" value={v.timeZone} onValueChange={(timeZone) => setV({ ...v, timeZone })} options={zones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))} disabled={!editable} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Calculation
        <Select aria-label="Calculation" value={v.recalculation} onValueChange={(recalculation) => setV({ ...v, recalculation: recalculation as Recalculation })} options={RECALCULATION_OPTIONS} disabled={!editable} />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!editable}
          onClick={() => {
            onSaveSettings(v);
            onClose();
          }}
        >
          Save and apply
        </Button>
      </div>
    </div>
  );
}

// ─── Timeline ───

function TimelinePanel({ api, settings }: SheetToolPanelsProps) {
  const timeline = useMemo(() => {
    const range = sourceRange(api);
    return range ? buildTimeline(range.getValues(), range.getDisplayValues(), settings.locale) : null;
  }, [api, settings.locale]);
  if (!timeline) return <Empty>No column of dates found. Select rows with a date column, or put dates in the sheet.</Empty>;
  const goTo = (row: number) => {
    const range = sourceRange(api)?.getRange();
    const sheet = sheetOf(api);
    sheet?.getRange((range?.startRow ?? 0) + row, range?.startColumn ?? 0, 1, 1).activate?.();
  };
  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1" data-sheet-timeline="">
      {timeline.months.map((m) => (
        <section key={m.month} className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.month}</h3>
          <ol className="relative ml-2 border-l border-border pl-4">
            {m.items.map((it) => (
              <li key={`${it.row}`} className="relative mb-2">
                <span className="absolute -left-[1.4rem] top-1.5 size-2 rounded-full bg-primary" aria-hidden />
                <button type="button" className="text-left text-sm hover:underline" onClick={() => goTo(it.row)} data-timeline-item="">
                  <span className="mr-2 tabular-nums text-muted-foreground">{formatDay(it.day, settings.locale)}</span>
                  {it.title}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

// ─── Filter views ───

function FilterViewsPanel({ api, filterViews, onFilterViews, editable }: SheetToolPanelsProps) {
  const [name, setName] = useState("");
  const sheet = sheetOf(api);
  const hasFilter = !!sheet?.getFilter();
  const save = () => {
    if (!sheet) return;
    const view = captureFilterView(sheet, name.trim() || `View ${filterViews.length + 1}`, newId());
    if (!view) {
      toast.error("Create a filter on this sheet first");
      return;
    }
    onFilterViews([...filterViews, view]);
    setName("");
  };
  return (
    <div className="grid gap-3" data-sheet-filter-views="">
      {editable && (
        <div className="flex gap-2">
          <Field aria-label="View name" placeholder="View name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button onClick={save} disabled={!hasFilter}>
            Save current filter
          </Button>
        </div>
      )}
      {filterViews.length === 0 ? (
        <Empty>No saved views yet.</Empty>
      ) : (
        <ul className="grid gap-1">
          {filterViews.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm" data-filter-view="">
              <span className="truncate">{v.name}</span>
              <span className="flex gap-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    const target = api?.getActiveWorkbook()?.getActiveSheet();
                    if (!target || target.getSheetId() !== v.sheetId) toast.error("Open the sheet this view was saved on first");
                    else if (!applyFilterView(target, v)) toast.error("The view could not be applied");
                  }}
                >
                  Apply
                </Button>
                {editable && (
                  <Button variant="quiet" onClick={() => onFilterViews(filterViews.filter((x) => x.id !== v.id))}>
                    Delete
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Named functions ───

function NamedFunctionsPanel({ api, editable }: SheetToolPanelsProps) {
  const [tick, setTick] = useState(0);
  const [name, setName] = useState("");
  const [args, setArgs] = useState("");
  const [body, setBody] = useState("");
  const wb = api?.getActiveWorkbook() ?? null;
  // `tick` re-reads the workbook's defined names after an add or a delete.
  const names = useMemo(() => (tick >= 0 ? (wb?.getDefinedNames() ?? []).map((d) => ({ name: d.getName(), formula: d.getFormulaOrRefString() })) : []), [wb, tick]);
  const functions = namedFunctionsFrom(names);
  const problem = name ? namedFunctionNameProblem(name, names.map((n) => n.name)) : null;
  const add = () => {
    const bad = namedFunctionNameProblem(name, names.map((n) => n.name));
    if (bad || !body.trim() || !wb) {
      toast.error(bad ?? "Write what the function calculates");
      return;
    }
    wb.insertDefinedName(name.trim(), lambdaFormula(args.split(","), body));
    setName("");
    setArgs("");
    setBody("");
    setTick((t) => t + 1);
  };
  return (
    <div className="grid gap-3" data-sheet-named-functions="">
      {functions.length === 0 ? (
        <Empty>No named functions yet.</Empty>
      ) : (
        <ul className="grid gap-1">
          {functions.map((f) => (
            <li key={f.name} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 font-mono text-xs" data-named-function="">
              <span className="truncate">
                {f.name}({f.args.join(", ")}) = {f.body}
              </span>
              {editable && (
                <Button
                  variant="quiet"
                  onClick={() => {
                    wb?.deleteDefinedName(f.name);
                    setTick((t) => t + 1);
                  }}
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="grid gap-2">
          <Field aria-label="Function name" placeholder="Name, e.g. DOUBLE" value={name} onChange={(e) => setName(e.target.value)} />
          <Field aria-label="Arguments" placeholder="Arguments, e.g. x, y" value={args} onChange={(e) => setArgs(e.target.value)} />
          <Field aria-label="Formula" placeholder="Formula, e.g. x*2" value={body} onChange={(e) => setBody(e.target.value)} />
          {problem && <p className="text-xs text-destructive">{problem}</p>}
          <div className="flex justify-end">
            <Button onClick={add} disabled={!name.trim() || !body.trim() || !!problem}>
              Add function
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Data extraction ───

function ExtractionPanel({ api, onClose, editable }: SheetToolPanelsProps) {
  const [kinds, setKinds] = useState<ExtractorId[]>(["email", "url"]);
  const toggle = (id: ExtractorId) => setKinds((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));
  const run = () => {
    const sheet = sheetOf(api);
    const sel = sheet?.getSelection()?.getActiveRange() ?? null;
    const r = sel?.getRange();
    if (!sheet || !sel || !r) {
      toast.error("Select the column with the text first");
      return;
    }
    const grid = sel.getValues();
    const header = hasHeaderRow(grid);
    const dataRows = header ? grid.slice(1) : grid;
    const result = extractFields(dataRows.map((row) => row.join(" ")), kinds);
    const firstRow = r.startRow + (header ? 1 : 0);
    const target = r.endColumn + 1;
    if (header) sheet.getRange(r.startRow, target, 1, result.headers.length).setValues([result.headers]);
    if (dataRows.length) sheet.getRange(firstRow, target, dataRows.length, result.headers.length).setValues(result.rows);
    toast.success(`${result.matched} of ${dataRows.length} rows had something to extract`);
    onClose();
  };
  return (
    <div className="grid gap-3" data-sheet-extraction="">
      <div className="grid gap-1">
        {EXTRACTORS.map((e) => (
          <SettingRow key={e.id} label={e.label}>
            <Switch checked={kinds.includes(e.id)} onCheckedChange={() => toggle(e.id)} aria-label={e.label} />
          </SettingRow>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={run} disabled={!editable || kinds.length === 0}>
          Extract to the columns on the right
        </Button>
      </div>
    </div>
  );
}

// ─── Data connectors ───

function ConnectorsPanel({ api, connectors, onConnectors, editable, linkedTableId, makeTable }: SheetToolPanelsProps) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const sheet = sheetOf(api);
  const add = async () => {
    if (!sheet) return;
    const anchor = sheet.getSelection()?.getActiveRange()?.getRange();
    const row = anchor?.startRow ?? 0;
    const col = anchor?.startColumn ?? 0;
    setBusy(true);
    try {
      const rows = await readCsvLink(url.trim());
      const n = writeRowsGrowing(sheet, row, col, rows);
      onConnectors([...connectors, { id: newId(), kind: "csv-url", label: url.trim(), source: url.trim(), sheetId: sheet.getSheetId(), row, column: col, refreshedAt: new Date().toISOString() }]);
      toast.success(`${n} rows from the link are in the sheet`);
      setUrl("");
    } catch (e) {
      toast.error(csvLinkMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const refresh = async (c: SheetConnector) => {
    const wb = api?.getActiveWorkbook();
    const target = wb?.getActiveSheet();
    if (!target || target.getSheetId() !== c.sheetId) {
      toast.error("Open the sheet this connector writes to first");
      return;
    }
    setBusy(true);
    try {
      const n = writeRowsGrowing(target, c.row, c.column, await readCsvLink(c.source));
      onConnectors(connectors.map((x) => (x.id === c.id ? { ...x, refreshedAt: new Date().toISOString() } : x)));
      toast.success(`Refreshed: ${n} rows`);
    } catch (e) {
      toast.error(csvLinkMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-4" data-sheet-connectors="">
      <section className="grid gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Table</h3>
        {linkedTableId ? (
          <p className="text-sm">
            This sheet is linked to a table. Update it, refresh from it or open it from Extensions.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">Keep this sheet and a table in step.</span>
            <Button variant="outline" disabled={!editable || !makeTable} onClick={() => makeTable?.()}>
              Make table
            </Button>
          </div>
        )}
      </section>
      <section className="grid gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CSV from a link</h3>
        {editable && (
          <div className="flex gap-2">
            <Field aria-label="CSV link" placeholder="https://example.com/data.csv" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
            <Button onClick={() => void add()} disabled={busy || !/^https?:\/\//i.test(url.trim())}>
              Import
            </Button>
          </div>
        )}
        {connectors.length === 0 ? (
          <Empty>No linked files yet. They land at the selected cell and can be refreshed here.</Empty>
        ) : (
          <ul className="grid gap-1">
            {connectors.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm" data-connector="">
                <span className="truncate" title={c.source}>
                  {c.label}
                </span>
                <span className="flex gap-1">
                  <Button variant="outline" disabled={busy || !editable} onClick={() => void refresh(c)}>
                    Refresh
                  </Button>
                  {editable && (
                    <Button variant="quiet" onClick={() => onConnectors(connectors.filter((x) => x.id !== c.id))}>
                      Remove
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Create a new form ───

function FormPanel({ linkedTableId, makeTable, editable, onClose }: SheetToolPanelsProps) {
  if (linkedTableId) {
    return (
      <div className="max-h-[70vh] overflow-y-auto" data-sheet-form="">
        <FormBuilder tableId={linkedTableId as never} activeFormId={null as never} startWithOne />
      </div>
    );
  }
  return (
    <div className="grid gap-3" data-sheet-form="">
      <p className="text-sm">Answers to a form arrive as rows of a table. Make a table from this sheet, then build the form on it.</p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={!editable || !makeTable}
          onClick={() => {
            onClose();
            makeTable?.();
          }}
        >
          Make table
        </Button>
      </div>
    </div>
  );
}

// ─── Macros ───

function MacrosPanel({ macros, onReplayMacro, onDeleteMacro, editable, onClose }: SheetToolPanelsProps) {
  if (macros.length === 0) return <Empty>No macros yet. Extensions → Macros → Record macro, do the steps, then Stop and save.</Empty>;
  return (
    <ul className="grid gap-1" data-sheet-macros="">
      {macros.map((m) => (
        <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm" data-macro="">
          <span className="truncate">{m.name}</span>
          <span className="flex gap-1">
            <Button
              variant="outline"
              disabled={!editable}
              onClick={() => {
                onClose();
                onReplayMacro(m.id);
              }}
            >
              Replay
            </Button>
            {editable && (
              <Button variant="quiet" onClick={() => onDeleteMacro(m.id)}>
                Delete
              </Button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
