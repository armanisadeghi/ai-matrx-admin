"use client";

import * as React from "react";
import { Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * THE ONE ACTION BUTTON OF A BUILDER ROW (Variables, Tools, Context policy, Resources, Term lists).
 *
 * Review 2 (#22, 2026-10-19): at 375px Variables and Tools drew "+ Add / Batch" as words while
 * Context policy and Resources drew bare icons, because each row hand-built its own button with
 * its own rule. One component, one rule: an icon always, its word from `sm` up, the word always
 * the accessible name and tooltip. Every row's Add / Batch is this.
 * Guard: `__tests__/builder-row-actions-are-one-primitive.test.tsx`.
 */
export type BuilderRowActionKind = "add" | "batch";

export interface BuilderRowActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  kind: BuilderRowActionKind;
  /** The word beside the icon from `sm` up, and the accessible name. Default: "Add" / "Batch". */
  label?: string;
}

export const BuilderRowAction = React.forwardRef<HTMLButtonElement, BuilderRowActionProps>(function BuilderRowAction(
  { kind, label, className, title, "aria-label": ariaLabel, ...rest },
  ref,
) {
  const Icon = kind === "batch" ? Layers : Plus;
  const word = label ?? (kind === "batch" ? "Batch" : "Add");
  return (
    <button
      ref={ref}
      type="button"
      data-builder-row-action={kind}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      aria-label={ariaLabel ?? word}
      title={title ?? word}
      {...rest}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{word}</span>
    </button>
  );
});
