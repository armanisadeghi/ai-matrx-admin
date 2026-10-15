"use client";

/**
 * File → Page setup, Google Docs' dialog: Pages / Pageless, orientation, paper size, page colour,
 * margins in inches, and "Set as default" for new documents. It edits values only; the host
 * decides how they reach the document (Univer's `docs.command.page-setup`).
 */

import { useEffect, useState } from "react";
import { Button, Field, SegmentedControl, Select } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PAGE_COLORS,
  PAPER_SIZES,
  type PageSetupValues,
  type PaperSizeName,
} from "@/features/documents/document-page-style";

const PAPER_OPTIONS = (Object.keys(PAPER_SIZES) as PaperSizeName[]).map((k) => ({ value: k, label: PAPER_SIZES[k].label }));

type MarginKey = "marginTop" | "marginBottom" | "marginLeft" | "marginRight";
const MARGINS: { key: MarginKey; label: string }[] = [
  { key: "marginTop", label: "Top" },
  { key: "marginBottom", label: "Bottom" },
  { key: "marginLeft", label: "Left" },
  { key: "marginRight", label: "Right" },
];

export function PageSetupDialog({
  open,
  onOpenChange,
  initial,
  onApply,
  onSetDefault,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PageSetupValues;
  onApply: (values: PageSetupValues) => void;
  /** Saves the values as the page every new document starts with. */
  onSetDefault: (values: PageSetupValues) => void;
}) {
  const [v, setV] = useState<PageSetupValues>(initial);
  const [margins, setMargins] = useState<Record<MarginKey, string>>(() => marginText(initial));
  useEffect(() => {
    if (open) {
      setV(initial);
      setMargins(marginText(initial));
    }
  }, [open, initial]);

  const current = (): PageSetupValues => {
    const next = { ...v };
    for (const { key } of MARGINS) {
      const n = Number(margins[key]);
      next[key] = Number.isFinite(n) && n >= 0 && n <= 5 ? n : initial[key];
    }
    return next;
  };
  const apply = () => {
    onApply(current());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-page-setup="">
        <DialogHeader>
          <DialogTitle>Page setup</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <SegmentedControl<"pages" | "pageless">
            aria-label="Layout"
            value={v.pageless ? "pageless" : "pages"}
            onValueChange={(m) => setV((s) => ({ ...s, pageless: m === "pageless" }))}
            data={[
              { value: "pages", label: "Pages" },
              { value: "pageless", label: "Pageless" },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Orientation
              <SegmentedControl<"portrait" | "landscape">
                aria-label="Orientation"
                value={v.orientation}
                onValueChange={(o) => setV((s) => ({ ...s, orientation: o }))}
                data={[
                  { value: "portrait", label: "Portrait" },
                  { value: "landscape", label: "Landscape" },
                ]}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Paper size
              <Select
                aria-label="Paper size"
                value={v.paper}
                onValueChange={(p) => setV((s) => ({ ...s, paper: p as PaperSizeName }))}
                options={PAPER_OPTIONS}
              />
            </label>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground">
            Page color
            <div className="flex gap-2" role="radiogroup" aria-label="Page color">
              {PAGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={v.pageColor === c}
                  aria-label={`Page color ${c}`}
                  onClick={() => setV((s) => ({ ...s, pageColor: c }))}
                  className={`size-7 rounded-full border-2 ${v.pageColor === c ? "border-primary" : "border-border"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-1 text-xs text-muted-foreground">
            Margins (inches)
            <div className="grid grid-cols-4 gap-2">
              {MARGINS.map(({ key, label }) => (
                <label key={key} className="grid min-w-0 gap-1">
                  {label}
                  <Field
                    type="number"
                    min={0}
                    max={5}
                    step={0.25}
                    aria-label={`${label} margin`}
                    className="w-full min-w-0"
                    value={margins[key]}
                    onChange={(e) => setMargins((m) => ({ ...m, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="quiet" onClick={() => onSetDefault(current())}>
            Set as default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={apply}>OK</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function marginText(v: PageSetupValues): Record<MarginKey, string> {
  return {
    marginTop: String(v.marginTop),
    marginBottom: String(v.marginBottom),
    marginLeft: String(v.marginLeft),
    marginRight: String(v.marginRight),
  };
}
