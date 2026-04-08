import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentBuilderLeftPanelContent } from "./AgentBuilderLeftPanelContent";

interface AgentBuilderLeftPanelProps {
  agentId: string;
}

function LeftPanelSkeleton() {
  return (
    <>
      <div className="flex flex-col gap-2 shrink-0 pt-0.5 pb-2">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-6 w-40 rounded-md" />
      </div>
      <div className="flex flex-col gap-2 flex-1 pr-1">
        <Skeleton className="h-[280px] w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
      <div className="flex items-center justify-end gap-1 shrink-0 py-2 border-t border-border bg-background">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
    </>
  );
}

export function AgentBuilderLeftPanel({ agentId }: AgentBuilderLeftPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <Suspense fallback={<LeftPanelSkeleton />}>
        <AgentBuilderLeftPanelContent agentId={agentId} />
      </Suspense>
    </div>
  );
}
