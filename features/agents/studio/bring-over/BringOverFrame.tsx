"use client";

/**
 * The frame of the Studio's bring-over pages (`/agents/new/studio/from-claude`, `/with-claude-code`):
 * the SAME compact one-row header the Studio workspace has (back, "Agent Studio", the page's name)
 * over a scrolling body, so the four modes read as one place. The name is in the header row, the
 * only heading; the body never repeats it.
 */

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

export function BringOverFrame({
  title,
  testId,
  maxWidth = "max-w-2xl",
  children,
}: {
  title: string;
  testId: string;
  maxWidth?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)]" data-testid="studio-bring-over">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2" data-testid="studio-header">
        <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={() => router.push("/agents/new/studio")} />
        <span className="shrink-0 text-sm font-semibold text-foreground">Agent Studio</span>
        <h1 className="min-w-0 truncate text-xs font-normal text-muted-foreground">{title}</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto" data-matrx-page-scroll>
        <div className={`mx-auto w-full ${maxWidth} space-y-5 p-4`} data-testid={testId}>
          {children}
        </div>
      </div>
    </div>
  );
}
