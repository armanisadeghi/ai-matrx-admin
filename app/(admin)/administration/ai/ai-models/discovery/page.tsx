import { Suspense } from "react";
import { SuspenseLoader } from "@ai-matrx/design-system";
import DiscoveryContainer from "@/features/ai-models/discovery/DiscoveryContainer";

export default function AiModelDiscoveryPage() {
  return (
    <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <SuspenseLoader centered={false} message="Loading model discovery…" />
          </div>
        }
      >
        <DiscoveryContainer />
      </Suspense>
    </div>
  );
}
