"use client";

/**
 * NumericStepper
 *
 * A compact number input with − / + stepper buttons on either side.
 * The input auto-sizes to its content in `ch` units so it always fits
 * exactly — no fixed width needed, works for 1 digit or 10 000+.
 *
 * Features:
 *  - Auto-sizing input: width tracks the current draft string length in `ch`
 *  - No browser-native spinner arrows (uses type="text" + inputMode="numeric")
 *  - Validates only on blur or Enter — never interrupts mid-type editing
 *  - Clearing the field is allowed; the committed value falls back to `fallback`
 *  - Arrow-key stepping (↑ / ↓) works while the input is focused
 *  - Buttons use onMouseDown + preventDefault so focus stays in the input
 *  - Fully theme-aware: uses bg-background / text-foreground / border-input tokens
 *  - Height controlled via `className` (e.g. "h-6"); width is automatic
 *
 * Props:
 *   value     – controlled numeric value
 *   onChange  – called with the new committed value
 *   min       – optional minimum (clamped on commit)
 *   max       – optional maximum (clamped on commit)
 *   fallback  – value to use when the field is empty or non-numeric (default 0)
 *   step      – amount to increment / decrement per button click (default 1)
 *   minChars  – minimum visible character width of the input area (default 2)
 *   className – applied to the outer wrapper
 */

import { useState, useEffect } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  fallback?: number;
  step?: number;
  minChars?: number;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  fallback = 0,
  step = 1,
  minChars = 2,
  className,
}: NumberStepperProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (override?: number) => {
    const parsed = override !== undefined ? override : parseInt(draft, 10);
    let next = isNaN(parsed) ? fallback : parsed;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const nudge = (delta: number) => {
    const current = parseInt(draft, 10);
    const base = isNaN(current) ? (fallback ?? 0) : current;
    commit(base + delta);
  };

  const btnCls =
    "flex items-center justify-center border border-input bg-background " +
    "text-muted-foreground hover:text-foreground hover:bg-muted " +
    "transition-colors select-none shrink-0 " +
    "h-full aspect-square leading-none";

  return (
    <div
      className={cn(
        "flex items-stretch rounded-md overflow-hidden shrink-0",
        className,
      )}
    >
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          nudge(-step);
        }}
        className={cn(btnCls, "rounded-l-md border-r-0")}
        tabIndex={-1}
        aria-label="Decrease"
      >
        <Minus size={9} strokeWidth={2.5} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            nudge(step);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            nudge(-step);
          }
        }}
        style={{ width: `${Math.max(minChars, draft.length) + 3}ch` }}
        className={cn(
          "border-y border-input bg-background text-foreground",
          "px-1.5 font-mono text-[11px] text-center outline-none",
          "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          nudge(step);
        }}
        className={cn(btnCls, "rounded-r-md border-l-0")}
        tabIndex={-1}
        aria-label="Increase"
      >
        <Plus size={9} strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default NumberStepper;
