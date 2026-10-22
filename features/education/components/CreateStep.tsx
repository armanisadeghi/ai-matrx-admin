// features/education/components/CreateStep.tsx
//
// One numbered step of an Education "Create" page (sources → style and details →
// make it). Shared by every Education create screen so the page shape stays one.

import type { ReactNode } from "react";

export function CreateStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="rounded-xl border border-border bg-card p-3 sm:p-5"
    >
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-2 text-xs text-primary-foreground">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
