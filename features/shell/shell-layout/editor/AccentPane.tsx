"use client";

// features/shell/shell-layout/editor/AccentPane.tsx — choose the Layout's accent color (custom-experience
// P4, 2026-10-20; PLAN §5.7). The curated swatches are the design system's ONE set
// (`@ai-matrx/design-system/accents` ACCENTS); beside them a custom #rrggbb. A weak custom color gets a
// one-line WCAG AA warning for light or dark — it offers, never blocks: the color still saves.
// "Default" removes the layout's own accent: a person then follows the organization's brand color
// (`inherited`), an organization the built-in blue. Used by the editor's Look tab (person and
// organization) and by Settings › Layout.
import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Field } from "@ai-matrx/design-system/controls";
import { ACCENTS, accentContrastWarning, accentHex, normalizeHex } from "@ai-matrx/design-system/accents";
import { cn } from "@/lib/utils";
import type { ShellAccentRef } from "../contract";

/** The built-in primary (the design system's default accent). */
const STANDARD_HEX = ACCENTS[0]?.hex ?? "#1773cf";

function Swatch({
  color,
  label,
  on,
  disabled,
  onPick,
}: {
  color: string;
  label: string;
  on: boolean;
  disabled?: boolean | undefined;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      title={label}
      disabled={disabled}
      data-clickable
      onClick={onPick}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
        on ? "ring-2 ring-foreground" : "",
      )}
      // A swatch IS the color it offers (data, not styling).
      style={{ backgroundColor: color }}
    >
      {on ? <Check className="h-4 w-4 text-white mix-blend-difference" aria-hidden /> : null}
    </button>
  );
}

export function AccentPane({
  value,
  inherited,
  inheritedLabel,
  onChange,
  disabled,
}: {
  /** The layout's own accent (null = none of its own). */
  value: ShellAccentRef | null;
  /** What "Default" shows: the organization's brand color for a person; null = the built-in blue. */
  inherited?: ShellAccentRef | null;
  /** The Default swatch's name ("Organization color" / "Standard"). */
  inheritedLabel?: string;
  onChange: (next: ShellAccentRef | null) => void;
  disabled?: boolean;
}) {
  const customHex = value && "hex" in value ? value.hex : null;
  const [draft, setDraft] = useState(customHex ?? "");
  const shown = accentHex(value) ?? accentHex(inherited ?? null) ?? STANDARD_HEX;
  // The warning follows what is being typed, before it is used (it offers; the color still applies).
  const typedHex = normalizeHex(draft);
  const judged = typedHex ?? customHex;
  const warning = judged ? accentContrastWarning(judged) : null;
  const defaultColor = accentHex(inherited ?? null) ?? STANDARD_HEX;

  // A custom color is used on Enter or when the field is left — never per keystroke (each use may save a version).
  const commit = () => {
    if (typedHex && typedHex !== customHex) onChange({ hex: typedHex });
  };

  return (
    <div className="space-y-2 p-3">
      <span className="block text-sm font-medium text-foreground">Accent color</span>
      <div role="radiogroup" aria-label="Accent color" className="flex flex-wrap gap-2">
        <Swatch color={defaultColor} label={inheritedLabel ?? "Standard"} on={value === null} disabled={disabled} onPick={() => onChange(null)} />
        {ACCENTS.map((accent) => (
          <Swatch
            key={accent.id}
            color={accent.hex}
            label={accent.label}
            on={value !== null && "id" in value && value.id === accent.id}
            disabled={disabled}
            onPick={() => onChange({ id: accent.id })}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-7 shrink-0 rounded-full border border-border" style={{ backgroundColor: typedHex ?? customHex ?? shown }} />
        {/* ui-exception: a hex color is a raw value */}
        <Field
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          placeholder="Custom, e.g. #1773cf"
          aria-label="Custom color"
          disabled={disabled}
          width="md"
        />
      </div>
      {warning ? (
        <p role="status" className="flex items-center gap-1.5 type-secondary text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-warning-ink" aria-hidden />
          {warning}
        </p>
      ) : null}
    </div>
  );
}
