"use client";

/**
 * The Studio's panes before an agent exists: not blank — what will appear (center) and what the
 * controls will do once the agent is here (right). Layout only; the same slots the filled panes use,
 * so nothing shifts when the agent arrives.
 */

import type { LucideIcon } from "lucide-react";
import { FlaskConical, GitBranch, Lightbulb, Play, Settings2, Swords } from "lucide-react";

interface Step {
  icon: LucideIcon;
  title: string;
  line: string;
}

/**
 * CENTER before the agent exists. The header's stage steps already say where the person is, so the
 * center only says what will appear here and the one thing that brings it: one quiet line, never a
 * second list of the steps.
 */
export function StudioAgentPending({ mode, hasAnswer }: { mode: "describe" | "do-with-me"; hasAnswer: boolean }) {
  const line =
    mode === "describe"
      ? "It appears here once it is built"
      : hasAnswer
        ? "Happy with the result? Press Make this an agent"
        : "Ask the assistant for the result you want first";
  return (
    <div className="flex h-full items-center justify-center p-6" data-testid="studio-agent-pending">
      <div className="flex max-w-xs flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Play className="h-4 w-4" aria-hidden />
        </span>
        <span className="text-sm font-medium text-foreground">Your agent runs here</span>
        <span className="text-xs text-muted-foreground">{line}</span>
      </div>
    </div>
  );
}

const CONTROLS: Record<string, Step> = {
  settings: { icon: Settings2, title: "Settings", line: "Name, goal, model. Each save is a new version" },
  cases: { icon: FlaskConical, title: "Test cases", line: "Your approved result becomes the first" },
  versions: { icon: GitBranch, title: "Versions", line: "Every version kept; open any of them" },
  battle: { icon: Swords, title: "Battle", line: "Compare models on this agent, blind" },
  debrief: { icon: Lightbulb, title: "Debrief", line: "A top model reviews the run as its own" },
};

/** RIGHT pane before the agent exists: what the selected tab will do. The tab row above is the only list. */
export function StudioControlsPreview({ tab = "settings" }: { tab?: string }) {
  const { icon: Icon, title, line } = CONTROLS[tab] ?? CONTROLS.settings;
  return (
    <div className="flex items-start gap-2.5 px-2 py-2" data-testid="studio-controls-preview">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{title} comes with the agent</span>
        <span className="block text-xs text-muted-foreground">{line}</span>
      </span>
    </div>
  );
}
