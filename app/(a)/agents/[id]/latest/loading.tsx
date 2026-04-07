import { Skeleton } from "@/components/ui/skeleton";

export default function AgentVersionHistoryLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-8 h-8 rounded-md shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="w-4 h-4 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
