import { Suspense } from "react";
import { SuspenseLoader } from "@ai-matrx/design-system";
import OfferingsContainer from "@/features/ai-models/components/offerings/OfferingsContainer";

export const metadata = {
  title: "AI Model Offerings",
};

export default function AiOfferingsPage() {
  return (
    <div className="h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            <SuspenseLoader
              centered={false}
              message="Loading model offerings…"
            />
          </div>
        }
      >
        <OfferingsContainer />
      </Suspense>
    </div>
  );
}
