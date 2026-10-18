/**
 * Where the person is on the Studio's path, for the header's stage steps. Every way in ends at
 * "Test & improve"; the first two steps name what that way in does. Pure, so it is tested.
 */
import type { StudioModeId } from "./modes";

export interface StudioStageStep {
  id: string;
  label: string;
}

const LAST: StudioStageStep = { id: "test", label: "Test & improve" };

const FIRST_TWO: Record<StudioModeId, [StudioStageStep, StudioStageStep]> = {
  "do-with-me": [
    { id: "result", label: "Get a result" },
    { id: "make", label: "Make it an agent" },
  ],
  describe: [
    { id: "describe", label: "Describe it" },
    { id: "build", label: "Build" },
  ],
  "from-examples": [
    { id: "examples", label: "Add examples" },
    { id: "build", label: "Build" },
  ],
  improve: [
    { id: "pick", label: "Pick an agent" },
    { id: "run", label: "Open a run" },
  ],
  "from-claude-account": [
    { id: "bring", label: "Bring it over" },
    { id: "build", label: "Build" },
  ],
  "with-claude-code": [
    { id: "bring", label: "Bring it over" },
    { id: "build", label: "Build" },
  ],
};

export interface StudioStageInput {
  mode: StudioModeId;
  /** "Make this an agent" was pressed and is still working (approve, check, starting the build). */
  making: boolean;
  buildId: string | null;
  agentId: string | null;
  /** A run of the agent is on screen. */
  runOpen: boolean;
}

export function studioStage({ mode, making, buildId, agentId, runOpen }: StudioStageInput): {
  steps: StudioStageStep[];
  current: number;
} {
  const steps = [...(FIRST_TWO[mode] ?? FIRST_TWO.describe), LAST];
  if (mode === "improve") return { steps, current: !agentId ? 0 : runOpen ? 2 : 1 };
  if (agentId) return { steps, current: 2 };
  if (buildId || making) return { steps, current: 1 };
  return { steps, current: 0 };
}
