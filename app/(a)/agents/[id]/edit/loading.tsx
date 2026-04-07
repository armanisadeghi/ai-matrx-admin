import { Skeleton } from "@/components/ui/skeleton";

export default function AgentEditLoading() {
  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="flex flex-col gap-3 h-full">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="flex-1 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 h-full">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="flex-1 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
