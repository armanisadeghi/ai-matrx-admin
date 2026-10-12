import { Suspense } from "react";
import { AiWorkHeader } from "@/features/ai-work/components/AiWorkHeader";
import { LiveHub } from "@/features/ai-work/live/components/LiveHub";

export function generateMetadata() {
  return { title: "Live" };
}

export default function WorkLivePage() {
  return (
    // LiveHub renders the AI Work header itself: a selected session or room
    // puts its title in the header's left slot.
    <Suspense fallback={<AiWorkHeader />}>
      <LiveHub />
    </Suspense>
  );
}
