"use client";

/**
 * File → Page setup for a spreadsheet — Google Sheets' print settings: paper, orientation, scale,
 * margins, what to print, gridlines, repeated frozen panes, page order and alignment. It edits
 * values only; the editor saves them on the workbook, and Print and PDF read them from there.
 */

import { useState } from "react";
import { Field, SegmentedControl, SettingRow, Select, Switch } from "@ai-matrx/design-system/controls";

import { PageSetupDialogShell } from "@/components/page-setup/PageSetupDialogShell";
import { PAPER_SIZES, type PaperSizeName } from "@/features/documents/document-page-style";
import {
  MARGIN_PRESET_INCHES,
  type SheetAlignH,
  type SheetAlignV,
  type SheetMarginPreset,
  type SheetPageOrder,
  type SheetPageSetup,
  type SheetPrintScope,
  type SheetScale,
} from "@/features/workbooks/sheet-page-setup";

const PAPER_OPTIONS = (Object.keys(PAPER_SIZES) as PaperSizeName[]).map((k) => ({ value: k, label: PAPER_SIZES[k].label }));
const SCALE_OPTIONS: { value: SheetScale; label: string }[] = [
  { value: "normal", label: "Normal (100%)" },
  { value: "width", label: "Fit to width" },
  { value: "height", label: "Fit to height" },
  { value: "page", label: "Fit to page" },
];
const MARGIN_OPTIONS: { value: SheetMarginPreset; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "narrow", label: "Narrow" },
  { value: "wide", label: "Wide" },
  { value: "custom", label: "Custom" },
];
const SCOPE_OPTIONS: { value: SheetPrintScope; label: string }[] = [
  { value: "sheet", label: "Current sheet" },
  { value: "workbook", label: "Workbook" },
  { value: "selection", label: "Selected cells" },
];

type MarginKey = "top" | "bottom" | "left" | "right";
const MARGIN_KEYS: { key: MarginKey; label: string }[] = [
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
];

export function SheetPageSetupDialog({
  open,
  onOpenChange,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SheetPageSetup;
  onApply: (values: SheetPageSetup) => void;
}) {
  const [v, setV] = useState<SheetPageSetup>(initial);
  const [custom, setCustom] = useState<Record<MarginKey, string>>(() => customText(initial));
  // Each opening starts from the saved values (adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setV(initial);
      setCustom(customText(initial));
    }
  }

  const patch = (p: Partial<SheetPageSetup>) => setV((s) => ({ ...s, ...p }));
  const current = (): SheetPageSetup => {
    const customMargins = { ...v.customMargins };
    for (const { key } of MARGIN_KEYS) {
      const n = Number(custom[key]);
      if (Number.isFinite(n) && n >= 0 && n <= 5) customMargins[key] = n;
    }
    return { ...v, customMargins };
  };
  const shownMargins = v.margins === "custom" ? null : MARGIN_PRESET_INCHES[v.margins];

  return (
    <PageSetupDialogShell open={open} onOpenChange={onOpenChange} size="lg" dataAttr="data-sheet-page-setup" onApply={() => onApply(current())}>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Paper size
          <Select aria-label="Paper size" value={v.paper} onValueChange={(p) => patch({ paper: p as PaperSizeName })} options={PAPER_OPTIONS} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Orientation
          <SegmentedControl<"portrait" | "landscape">
            aria-label="Orientation"
            value={v.orientation}
            onValueChange={(orientation) => patch({ orientation })}
            data={[
              { value: "portrait", label: "Portrait" },
              { value: "landscape", label: "Landscape" },
            ]}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Scale
          <Select aria-label="Scale" value={v.scale} onValueChange={(scale) => patch({ scale: scale as SheetScale })} options={SCALE_OPTIONS} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Print
          <Select aria-label="What to print" value={v.scope} onValueChange={(scope) => patch({ scope: scope as SheetPrintScope })} options={SCOPE_OPTIONS} />
        </label>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground">
        Margins
        <Select aria-label="Margins" value={v.margins} onValueChange={(margins) => patch({ margins: margins as SheetMarginPreset })} options={MARGIN_OPTIONS} />
        <div className="grid grid-cols-4 gap-2">
          {MARGIN_KEYS.map(({ key, label }) => (
            <label key={key} className="grid min-w-0 gap-1">
              {label} (in)
              <Field
                type="number"
                min={0}
                max={5}
                step={0.05}
                aria-label={`${label} margin`}
                className="w-full min-w-0"
                disabled={v.margins !== "custom"}
                value={shownMargins ? String(shownMargins[key]) : custom[key]}
                onChange={(e) => setCustom((m) => ({ ...m, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-1">
        <SettingRow label="Show gridlines">
          <Switch checked={v.gridlines} onCheckedChange={(gridlines) => patch({ gridlines })} aria-label="Show gridlines" />
        </SettingRow>
        <SettingRow label="Repeat frozen rows">
          <Switch checked={v.repeatFrozenRows} onCheckedChange={(repeatFrozenRows) => patch({ repeatFrozenRows })} aria-label="Repeat frozen rows" />
        </SettingRow>
        <SettingRow label="Repeat frozen columns">
          <Switch checked={v.repeatFrozenColumns} onCheckedChange={(repeatFrozenColumns) => patch({ repeatFrozenColumns })} aria-label="Repeat frozen columns" />
        </SettingRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Page order
          <SegmentedControl<SheetPageOrder>
            aria-label="Page order"
            value={v.pageOrder}
            onValueChange={(pageOrder) => patch({ pageOrder })}
            data={[
              { value: "down-over", label: "Down, then over" },
              { value: "over-down", label: "Over, then down" },
            ]}
          />
        </label>
        <div className="grid gap-1 text-xs text-muted-foreground">
          Alignment
          <div className="grid grid-cols-2 gap-2">
            <Select
              aria-label="Horizontal alignment"
              value={v.alignH}
              onValueChange={(alignH) => patch({ alignH: alignH as SheetAlignH })}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" },
              ]}
            />
            <Select
              aria-label="Vertical alignment"
              value={v.alignV}
              onValueChange={(alignV) => patch({ alignV: alignV as SheetAlignV })}
              options={[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
            />
          </div>
        </div>
      </div>
    </PageSetupDialogShell>
  );
}

function customText(v: SheetPageSetup): Record<MarginKey, string> {
  return {
    top: String(v.customMargins.top),
    bottom: String(v.customMargins.bottom),
    left: String(v.customMargins.left),
    right: String(v.customMargins.right),
  };
}
