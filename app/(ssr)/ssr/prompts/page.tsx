import { Suspense } from "react";
import PromptsSSRHeader from "./_components/PromptsSSRHeader";
import { PromptsGrid } from "@/features/prompts/components/layouts/PromptsGrid";

// ---------------------------------------------------------------------------
// Static skeleton — no client JS required, rendered at request time on server.
// The shell exactly matches the shape of PromptsGrid so hydration is seamless.
// ---------------------------------------------------------------------------

function PromptsShellSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search bar skeleton */}
      <div className="mb-4">
        <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-14 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-5 space-y-3 animate-pulse">
            <div className="h-5 w-2/3 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
            </div>
            <div className="flex gap-2 pt-2">
              <div className="h-8 w-16 rounded bg-muted" />
              <div className="h-8 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PromptsPage() {
  return (
    <div
      className="ssr-prompt-page"
      style={
        {
          "--header-height": "var(--shell-header-h)",
          paddingTop: "var(--shell-header-h)",
        } as React.CSSProperties
      }
    >
      {/* Header portal — client component, renders into the nav bar */}
      <PromptsSSRHeader />

      <div className="w-full">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 py-4 sm:py-6 max-w-[1800px]">
          {/*
            Suspense boundary:
            - fallback = pure static skeleton (no client JS, zero hydration cost)
            - When JS loads, PromptsGrid hydrates and dispatches initializeUserPrompts()
            - Redux populates; selectors recompute; UI updates — no layout shift
          */}
          <Suspense fallback={<PromptsShellSkeleton />}>
            <PromptsGrid />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
