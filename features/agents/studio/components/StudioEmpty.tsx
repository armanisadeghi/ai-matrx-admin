"use client";

/**
 * The Studio's panes before an agent exists: not blank, but the path ahead — where the person is
 * on it (center) and what the controls will do once the agent is here (right). Layout only; the
 * same slots the filled panes use, so nothing shifts when the agent arrives.
 */

import type { LucideIcon } from "lucide-react";
import { Check, FlaskConical, GitBranch, Lightbulb, MessageSquare, Play, Settings2, Swords, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
  title: string;
  line: string;
}

const DO_WITH_ME: Step[] = [
  { icon: MessageSquare, title: "Get a result you like", line: "Ask the assistant on the left, as you would anyone" },
  { icon: Wand2, title: "Make this an agent", line: "Confirm the inputs you gave; the Factory builds it" },
  { icon: Play, title: "Run it fresh", line: "Your new agent, beside the answer you approved" },
];

const DESCRIBE: Step[] = [
  { icon: Wand2, title: "Build", line: "The Factory builds it from your description" },
  { icon: Play, title: "Run it fresh", line: "Every run starts clean, with real inputs" },
  { icon: MessageSquare, title: "Improve it", line: "Tell the assistant what to change; save a version" },
];

export function StudioPath({ mode, current }: { mode: "describe" | "do-with-me"; current: number }) {
  const steps = mode === "do-with-me" ? DO_WITH_ME : DESCRIBE;
  return (
    <div className="flex h-full items-center justify-center p-6" data-testid="studio-path">
      <ol className="flex w-full max-w-sm flex-col gap-1">
        {steps.map((step, i) => {
          const Icon = i < current ? Check : step.icon;
          const active = i === current;
          return (
            <li
              key={step.title}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                active ? "border-primary bg-card" : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {step.title}
                </span>
                <span className="block text-xs text-muted-foreground">{step.line}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const CONTROLS: Step[] = [
  { icon: Settings2, title: "Settings", line: "Name, goal, model — each save is a new version" },
  { icon: GitBranch, title: "Versions", line: "Every version kept; open any of them" },
  { icon: Swords, title: "Battle", line: "Compare models on this agent, blind" },
  { icon: Lightbulb, title: "Debrief", line: "A top model reviews the run as its own" },
  { icon: FlaskConical, title: "Test cases", line: "Your approved result becomes the first" },
];

/** RIGHT pane before the agent exists: what each control will do. */
export function StudioControlsPreview() {
  return (
    <ul className="flex flex-col gap-0.5 p-1" data-testid="studio-controls-preview">
      {CONTROLS.map(({ icon: Icon, title, line }) => (
        <li key={title} className="flex items-start gap-2.5 rounded-md px-2 py-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0">
            <span className="block text-sm text-foreground">{title}</span>
            <span className="block text-xs text-muted-foreground">{line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
