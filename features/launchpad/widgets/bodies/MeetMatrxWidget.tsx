"use client";

// features/launchpad/widgets/bodies/MeetMatrxWidget.tsx — the Meet Matrx stage's cards on a launchpad: the
// three studios, the building blocks, or both. The SAME stage the welcome screen draws
// (`@ai-matrx/design-system/intro-stage` over `MEET_MATRX_GROUPS`), never a copy: a piece renamed or relinked
// there is renamed here. A single part draws no group heading (the widget frame names it).
import { IntroStage } from "@ai-matrx/design-system/intro-stage";
import { MEET_MATRX_GROUPS, meetMatrxLink } from "@/features/onboarding/meet-matrx/meetMatrx";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

export function MeetMatrxWidget({ config }: LaunchpadWidgetBodyProps) {
  const part = configText(config, "part") || "studios";
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
