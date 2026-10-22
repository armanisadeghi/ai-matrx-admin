"use client";

/**
 * The Sheets menu's saved and live extras in one hook: Spreadsheet settings (and the recalculation timer
 * they drive), saved macros, filter views, data connectors, Tools preferences (Autocomplete, Suggestion
 * controls) and the painted View → Show modes. The editor wires the returned pieces into its menu host and
 * its panels; everything saved lives on the workbook (`sheet_extras`, see `sheet-extras-service.ts`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocaleService } from "@univerjs/core";

import { toast } from "@/lib/toast";
import { promptForValues } from "@ai-matrx/chat/ui/valuePromptsOpener";
import type { SheetChromeHost, SheetPanel } from "@/features/workbooks/chrome/sheet-commands";
import {
  applyFilterView,
  captureFilterView,
  defaultSettings,
  normalizeConnectors,
  normalizeFilterViews,
  normalizeMacros,
  normalizePrefs,
  protectPanelTitle,
  normalizeSettings,
  recalcIntervalMs,
  type FilterSheetLike,
  type ProtectTarget,
  type FilterView,
  type SheetConnector,
  type SheetMacro,
  type SheetPrefs,
  type SheetSettings,
} from "@/features/workbooks/chrome/sheet-row-extras";
import { cancelMacroRecording, finishMacroRecording, isRecording, replayMacro, startMacroRecording } from "@/features/workbooks/chrome/sheet-macros";
import { installColumnAutocomplete } from "@/features/workbooks/chrome/sheet-autocomplete";
import { installFormulaPopupControls } from "@/features/workbooks/chrome/sheet-formula-popups";
import { installViewOverlays, type ViewOverlayState } from "@/features/workbooks/chrome/sheet-view-overlays";
import { readAllSheetExtras, writeSheetExtra, type SheetExtraKey } from "@/features/workbooks/sheet-extras-service";

interface InjectorLike {
  get<T>(token: unknown): T;
}
interface ApiLike {
  getActiveWorkbook(): { getActiveSheet(): unknown } | null;
  getFormula?(): { executeCalculation(): void };
  addEvent(name: string, cb: (e: { id: string; params?: { visible?: boolean }; cancel?: boolean }) => void): { dispose(): void };
  Event: { BeforeCommandExecute: string };
}

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

/** Opens the Protect sheets and ranges side panel (every entry point goes through it). */
export const PERMISSION_PANEL_OPERATION = "sheet-permission.operation.openPanel";
const PROTECT_TITLE_KEY = ["sheets-ui", "permission", "panel", "title"];

export function useSheetExtras({
  apiRef,
  injector,
  workbookId,
  editable,
  ready,
  bumpChrome,
}: {
  apiRef: { current: unknown };
  injector: () => InjectorLike | null;
  workbookId: string;
  editable: boolean;
  ready: boolean;
  bumpChrome: () => void;
}) {
  const [panel, setPanel] = useState<SheetPanel | null>(null);
  const [settings, setSettings] = useState<SheetSettings>(() => defaultSettings());
  const [macros, setMacros] = useState<SheetMacro[]>([]);
  const [filterViews, setFilterViews] = useState<FilterView[]>([]);
  const [connectors, setConnectors] = useState<SheetConnector[]>([]);
  const [prefs, setPrefs] = useState<SheetPrefs>(() => normalizePrefs(null));
  const [recording, setRecording] = useState(false);
  const overlaysRef = useRef<ViewOverlayState>({ formulas: false, protectedRanges: false });
  const [overlays, setOverlays] = useState<ViewOverlayState>(overlaysRef.current);
  const prefsRef = useRef(prefs);
  useEffect(() => {
    prefsRef.current = prefs;
  }, [prefs]);

  // Load what the workbook saved.
  useEffect(() => {
    if (!ready) return undefined;
    let live = true;
    void readAllSheetExtras(workbookId).then((res) => {
      if (!live || !res.ok) return;
      setSettings(normalizeSettings(res.data.settings));
      setMacros(normalizeMacros(res.data.macros));
      setFilterViews(normalizeFilterViews(res.data.filter_views));
      setConnectors(normalizeConnectors(res.data.connectors));
      setPrefs(normalizePrefs(res.data.prefs));
    });
    return () => {
      live = false;
    };
  }, [workbookId, ready]);

  const persist = useCallback(
    async (key: SheetExtraKey, value: unknown, what: string) => {
      const res = await writeSheetExtra(workbookId, key, value);
      if (!res.ok) toast.error(`Could not save ${what}: ${res.error}`);
    },
    [workbookId],
  );

  // View → Show: painted modes over Univer's cell interceptor.
  useEffect(() => {
    if (!ready) return undefined;
    const inj = injector();
    if (!inj) return undefined;
    try {
      return installViewOverlays(inj, () => overlaysRef.current);
    } catch (err) {
      console.warn("[workbook] View → Show modes unavailable", err);
      return undefined;
    }
    // injector() reads a ref; the instance is fixed per workbook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, workbookId]);
  const toggleOverlay = useCallback(
    (key: keyof ViewOverlayState) => {
      overlaysRef.current = { ...overlaysRef.current, [key]: !overlaysRef.current[key] };
      setOverlays(overlaysRef.current);
      const sheet = (apiRef.current as ApiLike | null)?.getActiveWorkbook()?.getActiveSheet() as { refreshCanvas?: () => unknown } | null | undefined;
      sheet?.refreshCanvas?.();
    },
    [apiRef],
  );

  // Tools → Suggestion controls: the formula popups read the live setting (see sheet-formula-popups.ts).
  useEffect(() => {
    const inj = injector();
    if (!ready || !inj) return undefined;
    try {
      return installFormulaPopupControls(inj, () => prefsRef.current);
    } catch (err) {
      console.warn("[workbook] Suggestion controls unavailable", err);
      return undefined;
    }
    // injector() reads a ref; the instance is fixed per workbook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, workbookId]);
  // Tools → Autocomplete: a column value is offered as text is typed.
  useEffect(() => {
    const api = apiRef.current as ApiLike | null;
    if (!ready || !api) return undefined;
    try {
      return installColumnAutocomplete(api as never, () => prefsRef.current.columnAutocomplete);
    } catch (err) {
      console.warn("[workbook] Autocomplete unavailable", err);
      return undefined;
    }
  }, [apiRef, ready, workbookId]);
  // Protect panel: Univer titles it "Protect Rows and Columns" whatever is protected; say what it is.
  const retitleProtectPanel = (params?: { rule?: { unitType?: number; ranges?: ProtectTarget["range"][] } }) => {
    try {
      const locales = injector()?.get<LocaleService>(LocaleService)?.getLocales() as Record<string, unknown> | undefined;
      let node = locales;
      for (const key of PROTECT_TITLE_KEY.slice(0, -1)) node = node?.[key] as Record<string, unknown> | undefined;
      if (!node) return;
      const rule = params?.rule;
      const selected = (apiRef.current as { getActiveWorkbook(): { getActiveSheet(): { getSelection(): { getActiveRange(): { getRange(): ProtectTarget["range"] } | null } | null } | null } | null } | null)
        ?.getActiveWorkbook()?.getActiveSheet()?.getSelection()?.getActiveRange()?.getRange();
      node.title = protectPanelTitle({ unitType: rule?.unitType, range: rule ? rule.ranges?.[0] ?? null : selected });
    } catch (err) {
      console.warn("[workbook] Protect panel title unavailable", err);
    }
  };
  // Protect panel title: see retitleProtectPanel.
  useEffect(() => {
    const api = apiRef.current as ApiLike | null;
    if (!ready || !api) return undefined;
    const d = api.addEvent(api.Event.BeforeCommandExecute, (e) => {
      if (e.id === PERMISSION_PANEL_OPERATION) retitleProtectPanel(e.params as { rule?: { unitType?: number; ranges?: ProtectTarget["range"][] } } | undefined);
    });
    return () => d.dispose();
    // retitleProtectPanel reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiRef, ready, workbookId]);
  const togglePref = useCallback(
    (key: keyof SheetPrefs) => {
      const next = { ...prefsRef.current, [key]: !prefsRef.current[key] };
      setPrefs(next);
      void persist("prefs", next, "the suggestion setting");
    },
    [persist],
  );

  // Spreadsheet settings → Calculation: recalculate on a timer.
  useEffect(() => {
    const ms = recalcIntervalMs(settings.recalculation);
    const api = apiRef.current as ApiLike | null;
    if (!ready || !ms || !api) return undefined;
    const t = setInterval(() => api.getFormula?.().executeCalculation(), ms);
    return () => clearInterval(t);
  }, [apiRef, ready, settings.recalculation]);
  const saveSettings = useCallback(
    (s: SheetSettings) => {
      setSettings(s);
      void persist("settings", s, "the spreadsheet settings");
    },
    [persist],
  );

  // Macros.
  const startMacro = useCallback(() => {
    const inj = injector();
    if (!inj) return;
    startMacroRecording(inj);
    setRecording(true);
    toast("Recording. Do the steps, then Extensions → Macros → Stop and save.");
    // injector() reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stopMacro = useCallback(() => {
    const inj = injector();
    if (!inj || !isRecording(inj)) {
      setRecording(false);
      return;
    }
    void (async () => {
      const answers = await promptForValues({
        title: "Save macro",
        submitLabel: "Save",
        fields: [{ name: "name", prompt: "Name the macro", defaultValue: `Macro ${macros.length + 1}`, required: true }],
      });
      const name = answers?.name?.trim();
      if (!name) return; // the recording keeps running until it is saved or discarded
      const macro = finishMacroRecording(inj, name, newId());
      setRecording(false);
      if (!macro) {
        toast("Nothing was recorded");
        return;
      }
      const next = [...macros, macro];
      setMacros(next);
      void persist("macros", next, "the macro");
      toast.success(`Saved macro "${name}"`);
    })();
    // injector() reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macros, persist]);
  const cancelMacro = useCallback(() => {
    const inj = injector();
    if (inj) cancelMacroRecording(inj);
    setRecording(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const runMacro = useCallback(
    (id: string) => {
      const inj = injector();
      const macro = macros.find((m) => m.id === id);
      if (!inj || !macro) return;
      void replayMacro(inj, macro).then((ok) => {
        if (ok) toast.success(`Ran "${macro.name}"`);
        else toast.error(`"${macro.name}" stopped part-way: a step in it could not run on this sheet`);
        bumpChrome();
      });
    },
    [macros, bumpChrome],
  );
  const deleteMacro = useCallback(
    (id: string) => {
      const next = macros.filter((m) => m.id !== id);
      setMacros(next);
      void persist("macros", next, "the macro list");
    },
    [macros, persist],
  );

  // Filter views.
  const saveFilterViews = useCallback(
    (list: FilterView[]) => {
      setFilterViews(list);
      void persist("filter_views", list, "the filter views");
    },
    [persist],
  );
  const activeSheet = () => (apiRef.current as ApiLike | null)?.getActiveWorkbook()?.getActiveSheet() as FilterSheetLike | null | undefined;
  const saveCurrentFilterView = useCallback(() => {
    void (async () => {
      const sheet = activeSheet();
      if (!sheet?.getFilter()) {
        toast.error("Create a filter on this sheet first");
        return;
      }
      const answers = await promptForValues({
        title: "Save filter view",
        submitLabel: "Save",
        fields: [{ name: "name", prompt: "Name the view", defaultValue: `View ${filterViews.length + 1}`, required: true }],
      });
      const name = answers?.name?.trim();
      if (!name) return;
      const view = captureFilterView(sheet, name, newId());
      if (view) saveFilterViews([...filterViews, view]);
    })();
    // activeSheet reads a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterViews, saveFilterViews]);
  const applyView = useCallback(
    (id: string) => {
      const sheet = activeSheet();
      const view = filterViews.find((v) => v.id === id);
      if (!sheet || !view) return;
      if (sheet.getSheetId() !== view.sheetId) toast.error("Open the sheet this view was saved on first");
      else if (!applyFilterView(sheet, view)) toast.error("The view could not be applied");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterViews],
  );

  const saveConnectors = useCallback(
    (list: SheetConnector[]) => {
      setConnectors(list);
      void persist("connectors", list, "the data connectors");
    },
    [persist],
  );

  const host = useMemo<Pick<SheetChromeHost, "openPanel" | "viewOverlays" | "macros" | "filterViews" | "prefs">>(
    () => ({
      openPanel: setPanel,
      viewOverlays: { state: () => overlays, toggle: toggleOverlay },
      macros: { list: () => macros, recording: () => recording, start: startMacro, stop: stopMacro, cancel: cancelMacro, replay: runMacro },
      filterViews: { list: () => filterViews, saveCurrent: saveCurrentFilterView, apply: applyView },
      prefs: { get: () => prefs, toggle: togglePref },
    }),
    [overlays, toggleOverlay, macros, recording, startMacro, stopMacro, cancelMacro, runMacro, filterViews, saveCurrentFilterView, applyView, prefs, togglePref],
  );

  return {
    host,
    panelProps: {
      panel,
      onClose: () => setPanel(null),
      editable,
      workbookId,
      settings,
      onSaveSettings: saveSettings,
      macros,
      onReplayMacro: runMacro,
      onDeleteMacro: deleteMacro,
      filterViews,
      onFilterViews: saveFilterViews,
      connectors,
      onConnectors: saveConnectors,
    },
    openSettings: () => setPanel("settings"),
    settings,
  };
}
