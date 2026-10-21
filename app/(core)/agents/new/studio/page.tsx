import { Suspense } from "react";
import { connection } from "next/server";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { AgentStudioPage } from "@/features/agents/studio/components/AgentStudioPage";

export const metadata = {
  title: "Agent Studio",
  description: "Build one agent with an assistant beside you: try it fresh every run, give feedback, save versions.",
};

/**
 * Rendered per request: the page reads its URL (`useSearchParams`), and a statically prerendered page bails
 * out to client rendering inside the Suspense boundary, which React reports as error #419 on every load.
 */
export default async function AgentStudioRoute() {
  await connection();
  return (
    <div className="h-full overflow-hidden">
      <Suspense fallback={<RegionSkeleton />}>
        <AgentStudioPage />
      </Suspense>
    </div>
  );
}
