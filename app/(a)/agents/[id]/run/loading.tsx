import { Skeleton } from "@/components/ui/skeleton";

export default function AgentRunLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar skeleton */}
      <div className="w-64 shrink-0 border-r border-border p-3 space-y-2 hidden md:block">
        <Skeleton className="h-8 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      {/* Main content skeleton */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col p-4 gap-4">
          <Skeleton className="flex-1 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
