import { Skeleton } from "@/components/ui/skeleton";

export default function AgentComparisonLoading() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Summary bar skeleton */}
      <div className="shrink-0 px-4 py-2 border-b border-border">
        <Skeleton className="h-5 w-56" />
      </div>
      {/* Three-panel skeleton */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-border overflow-hidden">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="flex flex-col overflow-hidden">
            <div className="shrink-0 px-3 py-2 border-b border-border">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex-1 p-3 space-y-3">
              {Array.from({ length: 8 }).map((_, row) => (
                <div key={row} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
