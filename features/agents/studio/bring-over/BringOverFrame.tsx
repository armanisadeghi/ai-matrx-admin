"use client";

/**
 * The frame of the Studio's bring-over pages (`/agents/new/studio/from-claude`, `/with-claude-code`):
 * the SAME stage as the start screen (`StudioStage` — living light, back on the column's edge,
 * "Agent Studio", one display headline naming the page), so leaving the start screen never drops the
 * design. The headline is the page's only heading; the body never repeats it.
 */

import { useRouter } from "next/navigation";
import { StudioStage } from "../components/StudioStage";

export function BringOverFrame({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <StudioStage headline={title} onBack={() => router.push("/agents/new/studio")} testId="studio-bring-over">
      <div className="mt-6 flex flex-col gap-5" data-testid={testId}>
        {children}
      </div>
    </StudioStage>
  );
}
