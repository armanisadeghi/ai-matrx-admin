"use client";

/**
 * File → Page setup for a deck — Google Slides' dialog: a slide size (widescreen 16:9, 16:10,
 * standard 4:3, or custom inches). It edits the size only; the editor stores it on the deck, and
 * every view and export reads it from there.
 */

import { useState } from "react";
import { Field, Select } from "@ai-matrx/design-system/controls";

import { PageSetupDialogShell } from "@/components/page-setup/PageSetupDialogShell";
import {
  SLIDE_SIZE_MAX_INCHES,
  SLIDE_SIZE_MIN_INCHES,
  SLIDE_SIZE_PRESETS,
  normalizeSlideSize,
  slideAspect,
  type SlideSize,
  type SlideSizePreset,
} from "@/components/mardown-display/blocks/presentations/slide-size";

const OPTIONS: { value: SlideSizePreset; label: string }[] = [
  ...SLIDE_SIZE_PRESETS.map((p) => ({ value: p.preset as SlideSizePreset, label: p.label })),
  { value: "custom", label: "Custom" },
];

export function SlideSizeDialog({
  open,
  onOpenChange,
  initial,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SlideSize;
  onApply: (size: SlideSize) => void;
}) {
  const [preset, setPreset] = useState<SlideSizePreset>(initial.preset);
  const [width, setWidth] = useState(String(initial.width));
  const [height, setHeight] = useState(String(initial.height));
  // Each opening starts from the deck's size (adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPreset(initial.preset);
      setWidth(String(initial.width));
      setHeight(String(initial.height));
    }
  }

  const named = SLIDE_SIZE_PRESETS.find((p) => p.preset === preset);
  const current = (): SlideSize =>
    named ? normalizeSlideSize({ preset: named.preset }) : normalizeSlideSize({ preset: "custom", width: Number(width), height: Number(height) });
  const shown = current();
  const customInvalid = !named && shown.preset !== "custom";

  return (
    <PageSetupDialogShell open={open} onOpenChange={onOpenChange} title="Page setup" dataAttr="data-slide-size-setup" onApply={() => onApply(current())}>
      <Select aria-label="Slide size" value={preset} onValueChange={(p) => setPreset(p as SlideSizePreset)} options={OPTIONS} />
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["Width (in)", named ? String(named.width) : width, setWidth],
            ["Height (in)", named ? String(named.height) : height, setHeight],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            {label}
            <Field
              type="number"
              min={SLIDE_SIZE_MIN_INCHES}
              max={SLIDE_SIZE_MAX_INCHES}
              step={0.125}
              aria-label={label}
              className="w-full min-w-0"
              disabled={Boolean(named)}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="flex h-24 items-center justify-center rounded-md bg-muted/40">
        <div
          data-slide-size-preview={slideAspect(customInvalid ? initial : shown)}
          className="max-h-20 max-w-[8rem] rounded-sm border border-border bg-card"
          style={{ aspectRatio: slideAspect(customInvalid ? initial : shown), height: "5rem" }}
        />
      </div>
    </PageSetupDialogShell>
  );
}
