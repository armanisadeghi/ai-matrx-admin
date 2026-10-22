"use client";

/**
 * The few shapes the Cases, Battle and Debrief tab bodies share, so the three read as one:
 * `TabHead` is the tab's single top row (the one primary action, then what it will cost),
 * `ResultCard` is the calm card every result sits in, and `Waiting` is a shimmering line in the
 * height of the thing it stands for. Layout only; every control is a design-system control.
 */

import { ShimmerText } from "@ai-matrx/design-system";
import { cn } from "@/lib/utils";

/** The tab's top row: fixed 36px so the primary action never moves between tabs or states. */
export function TabHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-9 shrink-0 items-center gap-2", className)} data-studio-tab-head="">
      {children}
    </div>
  );
}

/** One calm bordered card; `tone` tints only the hairline. */
export function ResultCard({
  children,
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: "success" | "warning" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border bg-card p-2 text-xs",
        tone === "success" ? "border-success/40" : tone === "warning" ? "border-warning/40" : "border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** A waiting line: shimmer in the height of one row, never a spinner. */
export function Waiting({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex h-8 items-center px-1 text-xs text-muted-foreground", className)} role="status" data-studio-waiting="">
      <ShimmerText text={text} />
    </div>
  );
}
