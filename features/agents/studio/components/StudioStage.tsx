"use client";

/**
 * The Agent Studio's front-door stage — ONE frame for the start screen and its two bring-over pages
 * (Import from Claude, Use Claude Code), so leaving the start screen never drops the design: the
 * living light behind, the back control and "Agent Studio" on the content column's own left edge,
 * and one `type-display` question.
 *
 * Rhythm (two steps only): 24px between parts of the stage, 48px between the stage and what follows.
 * The headline reserves its height (one line wide, two on a phone), so a headline swap never moves
 * anything under it.
 */

import { ArrowLeft } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import stage from "./StudioStart.module.css";

export function StudioStage({
  headline,
  headlineKey,
  onBack,
  aside,
  testId,
  children,
}: {
  headline: React.ReactNode;
  /** Changes when the question changes, so it cross-fades (opacity only). */
  headlineKey?: string;
  onBack: () => void;
  /** Beside "Agent Studio" (the "from plan … step n" back-link). */
  aside?: React.ReactNode;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full overflow-y-auto bg-textured" data-matrx-page-scroll data-testid={testId}>
      <div className={stage.stage} aria-hidden>
        <div className={stage.glowA} />
        <div className={stage.glowB} />
      </div>
      <div className="relative z-[1] mx-auto flex w-full max-w-[48rem] flex-col px-4 pb-12 pt-[var(--shell-header-h)] sm:px-6 @container">
        {/* The back glyph sits ON the column's left edge (the quiet icon button's own inset pulled back). */}
        <div className="-ml-2 flex h-10 items-center gap-1" data-testid="studio-header">
          <Button variant="quiet" icon={<ArrowLeft />} aria-label="Back" onClick={onBack} />
          <span className="type-title text-foreground">Agent Studio</span>
          {aside}
        </div>
        <h1
          key={headlineKey}
          className={`type-display ${stage.enter} ${stage.headline} mt-[clamp(1.5rem,8vh,5rem)] text-center text-foreground`}
          data-testid="studio-headline"
        >
          {headline}
        </h1>
        {children}
      </div>
    </div>
  );
}
