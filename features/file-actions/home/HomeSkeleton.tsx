"use client";

/**
 * What a file home draws while its records load — the SAME boxes the real list takes, so when the
 * records arrive nothing moves (reload layout shift ≈ 0). The dimensions mirror `RecentCard`
 * (thumb 4:3 + 68px body), `PhoneRows` (56px rows) and `FileHomeTable` (36px header, 33px rows,
 * 34px toolbar) in `FileHome.tsx`; change one and change the other.
 */

import { cn } from "@/lib/utils";

const bar = "animate-pulse rounded bg-muted";

function GroupLabel() {
  // The real group heading: `pb-2 pt-3` around a 16px text-xs line.
  return (
    <div className="pb-2 pt-3">
      <div className={cn(bar, "h-4 w-20")} />
    </div>
  );
}

export function HomeCardsSkeleton({ label, count = 8 }: { label: string; count?: number }) {
  return (
    <div aria-busy="true" aria-label={label} className="pt-2">
      <GroupLabel />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] gap-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="block">
              <div className="aspect-[4/3] w-full border-b border-border">
                <div className="size-full animate-pulse bg-muted" />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1 px-3 pb-2 pt-2">
              <div className="flex h-5 items-center">
                <div className={cn(bar, "h-3.5 w-2/3")} />
              </div>
              <div className="flex h-7 items-center gap-1.5">
                <div className={cn(bar, "size-4")} />
                <div className={cn(bar, "h-3 w-1/2")} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePhoneRowsSkeleton({ label, count = 8 }: { label: string; count?: number }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col">
      <div className="pb-1 pt-3">
        <div className={cn(bar, "h-4 w-20")} />
      </div>
      <ul className="flex flex-col">
        {Array.from({ length: count }, (_, i) => (
          <li key={i}>
            <div className="flex min-h-14 items-center gap-3 border-b border-border/60 py-1.5">
              <div className={cn(bar, "size-6 shrink-0")} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={cn(bar, "block h-4 w-2/3")} />
                <span className={cn(bar, "block h-3 w-1/3")} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeTableSkeleton({ label, count = 10 }: { label: string; count?: number }) {
  return (
    <div aria-busy="true" aria-label={label} className="flex flex-col gap-2 pt-2">
      <div className="flex h-[34px] items-center gap-2">
        <div className={cn(bar, "h-7 w-64")} />
      </div>
      <div className="w-full overflow-hidden rounded-md border border-border bg-card">
        <div className="flex h-9 items-center gap-6 border-b border-border px-3">
          <div className={cn(bar, "h-3 w-24")} />
          <div className={cn(bar, "h-3 w-16")} />
          <div className={cn(bar, "h-3 w-16")} />
        </div>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex h-[33px] items-center gap-6 border-b border-border/60 px-3 last:border-b-0">
            <div className={cn(bar, "h-3.5")} style={{ width: `${30 + ((i * 17) % 35)}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
