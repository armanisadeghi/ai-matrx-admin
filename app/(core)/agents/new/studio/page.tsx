import { Suspense } from "react";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { AgentStudioPage } from "@/features/agents/studio/components/AgentStudioPage";

export const metadata = {
  title: "Agent Studio",
  description: "Build one agent with an assistant beside you: try it fresh every run, give feedback, save versions.",
};

export default function AgentStudioRoute() {
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<RegionSkeleton />}>
        <AgentStudioPage />
      </Suspense>
    </div>
  );
}
