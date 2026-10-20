"use client";

// features/launchpad/widgets/bodies/MeetMatrxWidget.tsx — the Meet Matrx stage's cards on a launchpad: the
// three studios, the building blocks, or both. The SAME stage the welcome screen draws
// (`@ai-matrx/design-system/intro-stage` over `MEET_MATRX_GROUPS`), never a copy: a piece renamed or relinked
// there is renamed here. A single part draws no group heading (the widget frame names it). The "hero" part
// is the welcome's own header ("Meet Matrx" in the brand gradient over its one line), the same IntroStage
// header with no groups, so the welcome and a launchpad never word it twice.
import { IntroStage } from "@ai-matrx/design-system/intro-stage";
import { MEET_MATRX_ACCENT, MEET_MATRX_GROUPS, MEET_MATRX_LEAD, MEET_MATRX_TITLE, meetMatrxLink } from "@/features/onboarding/meet-matrx/meetMatrx";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

const HERO_EDGE_MASK =
  "linear-gradient(to right, transparent, #000 18%, #000 82%, transparent), linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent)";
const HERO_EDGE_FADE = {
  maskImage: HERO_EDGE_MASK,
  WebkitMaskImage: HERO_EDGE_MASK,
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
} as const;

export function MeetMatrxWidget({ config }: LaunchpadWidgetBodyProps) {
  const part = configText(config, "part") || "studios";
  if (part === "hero") {
    return (
      // The stage light is taller than this box: its edges fade out instead of ending on the box's edge.
      <div className="flex h-full items-center justify-center overflow-hidden px-2 pb-2" style={HERO_EDGE_FADE}>
        <IntroStage title={MEET_MATRX_TITLE} accent={MEET_MATRX_ACCENT} lead={MEET_MATRX_LEAD} groups={[]} motion={false} />
      </div>
    );
  }
  const groups =
    part === "all"
      ? MEET_MATRX_GROUPS
      : MEET_MATRX_GROUPS.filter((g) => g.id === part).map((g) => ({ ...g, label: "" }));
  return (
    <div className="h-full overflow-y-auto px-2 pb-2 pt-1">
      <IntroStage groups={groups} motion={false} renderLink={meetMatrxLink} />
    </div>
  );
}
